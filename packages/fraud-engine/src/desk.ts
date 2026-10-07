import {
  buildScenario,
  cleanTxn,
  hotTxn,
  idSequence,
  mildTxn,
  SCENARIOS,
  spawnTxn,
} from './generator';
import { remember, seedProfiles } from './profiles';
import { clampThresholds, clampWeight, defaultPolicy, evaluate } from './rules';
import type {
  AnalystAction,
  Policy,
  Profile,
  RawTxn,
  RuleConfig,
  RuleId,
  ScenarioKind,
  ScoredTxn,
  Stage,
} from './types';

/**
 * Mesa de fraude como máquina de estados pura y serializable. Cada función recibe el estado y
 * devuelve uno nuevo (o el mismo objeto si nada cambió). La usan el modo demo del navegador y
 * los tests; el backend usa `scoreTxn` directamente desde el worker de BullMQ.
 */

export const STAGE_MS = 160;
export const FEED_LIMIT = 180;
export const QUEUE_LIMIT = 60;
export const AUTO_QUEUE_CAP = 28;
export const NOTICE_MS = 3200;
export const SPAWN_EVERY: Record<Speed, number> = { normal: 1150, fast: 340 };

export const STAGES: readonly { id: Stage; label: string }[] = [
  { id: 'ingest', label: 'Ingesta' },
  { id: 'enrich', label: 'Enriquecer' },
  { id: 'rules', label: 'Reglas' },
  { id: 'score', label: 'Puntaje' },
  { id: 'decide', label: 'Alerta' },
];

export type Speed = 'normal' | 'fast';

export interface Processing {
  txn: RawTxn;
  stage: Stage;
  stageAt: number;
}

export interface DeskState {
  running: boolean;
  speed: Speed;
  policy: Policy;
  profiles: Profile[];
  queue: RawTxn[];
  processing: Processing | null;
  feed: ScoredTxn[];
  lastSpawn: number;
  seq: number;
  idCursor: number;
  notice: { text: string; at: number } | null;
}

/** Puntúa un movimiento y devuelve el resultado y los perfiles actualizados. */
export function scoreTxn(
  txn: RawTxn,
  profiles: readonly Profile[],
  policy: Policy,
  completedAt: number,
  latencyMs: number,
): { txn: ScoredTxn; profiles: Profile[] } {
  const profile = profiles.find((p) => p.id === txn.customerId);
  if (!profile) throw new Error(`Cliente desconocido: ${txn.customerId}`);
  const verdict = evaluate(txn, profile, policy);
  const next = remember(profile, txn, verdict.decision);
  return {
    txn: {
      ...txn,
      ...verdict,
      analyst: verdict.decision === 'allow' ? 'none' : 'open',
      latencyMs,
      completedAt,
    },
    profiles: profiles.map((p) => (p.id === next.id ? next : p)),
  };
}

/** Estado inicial con 14 movimientos de historia (dos sospechosos) para no arrancar en blanco. */
export function createDesk(now: number, policy: Policy = defaultPolicy()): DeskState {
  const ids = idSequence(48_102);
  let profiles = seedProfiles();
  const feed: ScoredTxn[] = [];
  for (let i = 14; i >= 1; i--) {
    const ts = now - i * 55_000;
    let raw: RawTxn;
    if (i === 4) raw = hotTxn(ids.next, profiles, ts, 0);
    else if (i === 11) raw = hotTxn(ids.next, profiles, ts, 1);
    else if (i === 7 || i === 9) raw = mildTxn(ids.next, profiles, ts, i);
    else raw = cleanTxn(ids.next, profiles, ts, i + 20);
    const latencyMs = 420 + (i % 5) * 55;
    const done = scoreTxn(raw, profiles, policy, ts + latencyMs, latencyMs);
    profiles = done.profiles;
    feed.unshift(done.txn);
  }
  return {
    running: true,
    speed: 'normal',
    policy,
    profiles,
    queue: [],
    processing: null,
    feed,
    lastSpawn: now,
    seq: 48,
    idCursor: ids.cursor(),
    notice: null,
  };
}

/** Avanza el reloj: mueve el movimiento en proceso por las etapas, toma el siguiente y genera tráfico. */
export function tick(s: DeskState, now: number): DeskState {
  let { queue, processing, profiles, feed, lastSpawn, seq, notice, idCursor } = s;
  let changed = false;

  if (notice && now - notice.at > NOTICE_MS) {
    notice = null;
    changed = true;
  }

  if (processing && now - processing.stageAt >= STAGE_MS) {
    const idx = STAGES.findIndex((st) => st.id === processing?.stage);
    const nextStage = STAGES[idx + 1];
    if (nextStage) {
      processing = { ...processing, stage: nextStage.id, stageAt: now };
    } else {
      const latencyMs = Math.max(STAGE_MS, now - processing.txn.enqueuedAt);
      const done = scoreTxn(processing.txn, profiles, s.policy, now, latencyMs);
      profiles = done.profiles;
      feed = [done.txn, ...feed].slice(0, FEED_LIMIT);
      processing = null;
    }
    changed = true;
  }

  if (!processing && queue.length > 0) {
    const [head, ...rest] = queue as [RawTxn, ...RawTxn[]];
    queue = rest;
    processing = { txn: head, stage: 'ingest', stageAt: now };
    changed = true;
  }

  if (s.running && queue.length < AUTO_QUEUE_CAP && now - lastSpawn >= SPAWN_EVERY[s.speed]) {
    const ids = idSequence(idCursor);
    queue = [...queue, spawnTxn(ids.next, profiles, now, seq)];
    idCursor = ids.cursor();
    lastSpawn = now;
    seq += 1;
    changed = true;
  }

  return changed
    ? { ...s, queue, processing, profiles, feed, lastSpawn, seq, notice, idCursor }
    : s;
}

/** Mete un escenario al frente de la cola. */
export function inject(s: DeskState, kind: ScenarioKind, now: number): DeskState {
  const ids = idSequence(s.idCursor);
  const batch = buildScenario(kind, ids.next, s.profiles, now);
  const text = SCENARIOS.find((x) => x.kind === kind)?.notice ?? '';
  return {
    ...s,
    queue: [...batch, ...s.queue].slice(0, QUEUE_LIMIT),
    idCursor: ids.cursor(),
    notice: { text, at: now },
  };
}

/** Decisión del analista. Solo aplica a alertas abiertas. */
export function resolve(s: DeskState, id: string, action: AnalystAction): DeskState {
  const target = s.feed.find((t) => t.id === id);
  if (!target || target.analyst !== 'open') return s;
  return { ...s, feed: s.feed.map((t) => (t.id === id ? { ...t, analyst: action } : t)) };
}

export function setRule(
  s: DeskState,
  id: RuleId,
  patch: Partial<Pick<RuleConfig, 'weight' | 'enabled'>>,
): DeskState {
  const rules = s.policy.rules.map((r) =>
    r.id !== id
      ? r
      : {
          ...r,
          weight: patch.weight === undefined ? r.weight : clampWeight(patch.weight),
          enabled: patch.enabled ?? r.enabled,
        },
  );
  return { ...s, policy: { ...s.policy, rules } };
}

export function setThresholds(
  s: DeskState,
  patch: { reviewAt?: number; blockAt?: number },
): DeskState {
  const t = clampThresholds(patch.reviewAt ?? s.policy.reviewAt, patch.blockAt ?? s.policy.blockAt);
  return { ...s, policy: { ...s.policy, ...t } };
}

export const resetPolicy = (s: DeskState): DeskState => ({ ...s, policy: defaultPolicy() });
export const toggleRun = (s: DeskState): DeskState => ({ ...s, running: !s.running });
export const toggleSpeed = (s: DeskState): DeskState => ({
  ...s,
  speed: s.speed === 'fast' ? 'normal' : 'fast',
});

export interface Kpis {
  processed: number;
  alerts: number;
  open: number;
  blocked: number;
  /** Porcentaje de movimientos que generaron alerta. */
  alertRate: number;
  /** Latencia p95 en ms. */
  p95: number;
  /** Monto retenido (COP) en alertas de bloqueo no liberadas. */
  heldAmount: number;
}

export function kpis(feed: readonly ScoredTxn[]): Kpis {
  const alerts = feed.filter((t) => t.decision !== 'allow');
  const blocked = feed.filter((t) => t.decision === 'block');
  const lat = feed.map((t) => t.latencyMs).sort((a, b) => a - b);
  const p95 = lat.length
    ? (lat[Math.min(lat.length - 1, Math.ceil(lat.length * 0.95) - 1)] ?? 0)
    : 0;
  return {
    processed: feed.length,
    alerts: alerts.length,
    open: alerts.filter((t) => t.analyst === 'open').length,
    blocked: blocked.length,
    alertRate: feed.length ? Math.round((alerts.length / feed.length) * 1000) / 10 : 0,
    p95,
    heldAmount: blocked
      .filter((t) => t.analyst !== 'released')
      .reduce((sum, t) => sum + t.amount, 0),
  };
}

/** Alerta que conviene mostrar primero: bloqueos abiertos, luego revisiones abiertas. */
export function pickSelection(feed: readonly ScoredTxn[]): string | null {
  const open = feed.filter((t) => t.analyst === 'open');
  return (open.find((t) => t.decision === 'block') ?? open[0] ?? feed[0])?.id ?? null;
}
