import { describe, expect, it } from 'vitest';
import {
  createDesk,
  inject,
  kpis,
  pickSelection,
  resetPolicy,
  resolve,
  setRule,
  setThresholds,
  STAGE_MS,
  STAGES,
  tick,
  toggleRun,
  type DeskState,
} from './desk';
import { NOON } from './test-helpers';
import { buildScenario, idSequence } from './generator';
import { seedProfiles, remember } from './profiles';
import { profile, txn } from './test-helpers';

/** Corre la mesa en pasos de STAGE_MS hasta vaciar la cola. */
function drain(s: DeskState, from: number): { s: DeskState; now: number } {
  let now = from;
  let guard = 0;
  s = { ...s, running: false };
  while ((s.queue.length || s.processing) && guard++ < 10_000) {
    now += STAGE_MS;
    s = tick(s, now);
  }
  return { s, now };
}

describe('createDesk', () => {
  it('es determinista y trae historia con alertas', () => {
    const a = createDesk(NOON);
    expect(createDesk(NOON)).toEqual(a);
    expect(a.feed).toHaveLength(14);
    expect(a.feed.some((t) => t.decision !== 'allow')).toBe(true);
    expect(new Set(a.feed.map((t) => t.id)).size).toBe(14);
    expect(a.feed[0]!.ts).toBeGreaterThan(a.feed[13]!.ts);
  });

  it('es serializable a JSON sin pérdida', () => {
    const a = createDesk(NOON);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});

describe('tick', () => {
  it('devuelve el mismo objeto si nada cambia', () => {
    const s = toggleRun(createDesk(NOON));
    expect(tick(s, NOON + 1)).toBe(s);
  });

  it('genera tráfico y lo pasa por las 5 etapas', () => {
    let s = createDesk(NOON);
    s = tick(s, NOON + 1200);
    expect(s.queue).toHaveLength(1);
    s = tick({ ...s, running: false }, NOON + 1201);
    expect(s.queue).toHaveLength(0);
    expect(s.processing?.stage).toBe('ingest');
    const seen = new Set<string>();
    let now = NOON + 1201;
    for (let i = 0; i < STAGES.length; i++) {
      seen.add(s.processing!.stage);
      now += STAGE_MS;
      s = tick({ ...s, running: false }, now);
    }
    expect([...seen]).toEqual(STAGES.map((x) => x.id));
    expect(s.feed).toHaveLength(15);
    expect(s.feed[0]!.latencyMs).toBeGreaterThanOrEqual(STAGE_MS);
  });

  it('no crece la cola automática sin límite', () => {
    let s = createDesk(NOON);
    s = { ...s, speed: 'fast', processing: null };
    for (let i = 1; i < 200; i++) s = { ...tick(s, NOON + i * 400), processing: null };
    expect(s.queue.length).toBeLessThanOrEqual(28);
  });

  it('ids únicos entre historia, tráfico y escenarios', () => {
    let s = inject(createDesk(NOON), 'muleo', NOON);
    for (let i = 1; i < 60; i++) s = tick(s, NOON + i * 400);
    const all = [...s.feed, ...s.queue].map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('escenarios', () => {
  const run = (kind: Parameters<typeof inject>[1]) => {
    const out = drain(inject(createDesk(NOON), kind, NOON), NOON);
    return out.s.feed.filter((t) => t.origin === kind && t.enqueuedAt === NOON);
  };

  it('viaje imposible bloquea el segundo movimiento por geo', () => {
    const [last] = run('viaje');
    expect(last!.hits.map((h) => h.id)).toEqual(expect.arrayContaining(['geo', 'pais', 'monto']));
    expect(last!.decision).toBe('block');
  });

  it('muleo sube por velocidad y beneficiario nuevo', () => {
    const feed = run('muleo');
    expect(feed).toHaveLength(4);
    const last = feed[0]!;
    expect(last.hits.map((h) => h.id)).toEqual(expect.arrayContaining(['velocidad', 'nuevo']));
    expect(last.decision).not.toBe('allow');
  });

  it('estructuración marca los tres montos bajo el umbral', () => {
    const feed = run('estructura');
    expect(feed).toHaveLength(3);
    for (const t of feed) expect(t.hits.map((h) => h.id)).toContain('estructura');
  });

  it('cripto de madrugada se retiene', () => {
    const hit = run('cripto').find((t) => t.mcc === '6051')!;
    expect(hit.hits.map((h) => h.id)).toEqual(expect.arrayContaining(['noche', 'mcc', 'monto']));
    expect(hit.decision).toBe('block');
  });

  it('inject avisa y pone el lote al frente', () => {
    const s = inject(createDesk(NOON), 'estructura', NOON);
    expect(s.queue).toHaveLength(3);
    expect(s.notice?.text).toContain('$10 millones');
    expect(tick(s, NOON + 4000).notice).toBeNull();
  });

  it('buildScenario lanza con un cliente inexistente', () => {
    expect(() => buildScenario('viaje', idSequence(0).next, [], NOON)).toThrow(/desconocido/);
  });
});

describe('analista y política', () => {
  it('resolve solo cambia alertas abiertas', () => {
    const s = createDesk(NOON);
    const open = s.feed.find((t) => t.analyst === 'open')!;
    const clean = s.feed.find((t) => t.analyst === 'none')!;
    const next = resolve(s, open.id, 'confirmed');
    expect(next.feed.find((t) => t.id === open.id)!.analyst).toBe('confirmed');
    expect(resolve(next, open.id, 'released')).toBe(next);
    expect(resolve(s, clean.id, 'released')).toBe(s);
    expect(resolve(s, 'nope', 'released')).toBe(s);
  });

  it('setRule, setThresholds y resetPolicy', () => {
    let s = setRule(createDesk(NOON), 'geo', { weight: 500, enabled: false });
    expect(s.policy.rules.find((r) => r.id === 'geo')).toMatchObject({
      weight: 48,
      enabled: false,
    });
    s = setThresholds(s, { reviewAt: 70, blockAt: 60 });
    expect(s.policy).toMatchObject({ reviewAt: 70, blockAt: 75 });
    s = resetPolicy(s);
    expect(s.policy.reviewAt).toBe(40);
    expect(s.policy.rules.every((r) => r.enabled)).toBe(true);
  });

  it('la política nueva aplica a lo que entra después', () => {
    let s = setRule(inject(createDesk(NOON), 'viaje', NOON), 'geo', { enabled: false });
    s = drain(s, NOON).s;
    const last = s.feed.find((t) => t.origin === 'viaje' && t.country === 'US')!;
    expect(last.hits.map((h) => h.id)).not.toContain('geo');
  });
});

describe('kpis y selección', () => {
  it('cuenta alertas, abiertas, p95 y monto retenido', () => {
    const s = createDesk(NOON);
    const k = kpis(s.feed);
    expect(k.processed).toBe(14);
    expect(k.alerts).toBeGreaterThan(0);
    expect(k.open).toBe(k.alerts);
    expect(k.p95).toBeGreaterThanOrEqual(420);
    expect(kpis([])).toMatchObject({ processed: 0, alertRate: 0, p95: 0, heldAmount: 0 });
  });

  it('pickSelection prioriza bloqueos abiertos', () => {
    const s = createDesk(NOON);
    const id = pickSelection(s.feed);
    const picked = s.feed.find((t) => t.id === id)!;
    if (s.feed.some((t) => t.decision === 'block')) expect(picked.decision).toBe('block');
    expect(pickSelection([])).toBeNull();
  });
});

describe('remember', () => {
  it('aprende dispositivos solo de movimientos autorizados', () => {
    const p = profile();
    expect(remember(p, txn({ device: 'Nuevo' }), 'allow').devices).toContain('Nuevo');
    expect(remember(p, txn({ device: 'Nuevo' }), 'block').devices).not.toContain('Nuevo');
  });

  it('no retrocede la ubicación con un movimiento viejo', () => {
    const p = profile({ lastTs: NOON, lastCity: 'Bogotá' });
    const r = remember(p, txn({ ts: NOON - 60_000, city: 'Cali' }), 'allow');
    expect(r).toMatchObject({ lastCity: 'Bogotá', lastTs: NOON });
  });

  it('semilla de perfiles con 16 clientes', () => {
    expect(seedProfiles()).toHaveLength(16);
  });
});
