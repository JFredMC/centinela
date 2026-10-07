import { bogotaHour, channelLabel, cop } from './format';
import type { Decision, Hit, Policy, Profile, RawTxn, RuleConfig, RuleId, Verdict } from './types';

export const REVIEW_AT = 40;
export const BLOCK_AT = 72;
export const MAX_WEIGHT = 48;
export const MAX_SCORE = 100;

/** Comercios de alto riesgo: cripto, apuestas, joyería, giros. */
export const RISKY_MCC: readonly string[] = ['6051', '7995', '5094', '4829'];
/** Umbral interno de reporte (COP). */
export const REPORT_THRESHOLD = 10_000_000;

const MIN = 60_000;
const HOUR = 60 * MIN;

export const DEFAULT_RULES: readonly RuleConfig[] = Object.freeze(
  [
    {
      id: 'monto',
      name: 'Monto atípico',
      blurb: 'Supera 4× el ticket medio del cliente o $8 millones.',
      weight: 28,
      enabled: true,
    },
    {
      id: 'velocidad',
      name: 'Velocidad',
      blurb: 'Tres o más movimientos del mismo cliente en 10 minutos.',
      weight: 24,
      enabled: true,
    },
    {
      id: 'geo',
      name: 'Geo imposible',
      blurb: 'Cambio de ciudad en menos de 90 min, o de país en menos de 6 h.',
      weight: 36,
      enabled: true,
    },
    {
      id: 'noche',
      name: 'Horario sensible',
      blurb: 'Entre 00:00 y 05:00, hora Colombia, con monto alto.',
      weight: 16,
      enabled: true,
    },
    {
      id: 'mcc',
      name: 'Comercio de riesgo',
      blurb: 'Cripto, apuestas, joyería o giros internacionales.',
      weight: 22,
      enabled: true,
    },
    {
      id: 'nuevo',
      name: 'Beneficiario nuevo',
      blurb: 'Primer envío a ese destino y monto sobre $2 millones.',
      weight: 20,
      enabled: true,
    },
    {
      id: 'device',
      name: 'Dispositivo nuevo',
      blurb: 'Huella que este cliente no había usado.',
      weight: 14,
      enabled: true,
    },
    {
      id: 'pais',
      name: 'País no habitual',
      blurb: 'El movimiento no se origina en Colombia.',
      weight: 18,
      enabled: true,
    },
    {
      id: 'estructura',
      name: 'Estructuración',
      blurb: 'Monto redondo justo bajo el umbral interno de $10 millones.',
      weight: 30,
      enabled: true,
    },
    {
      id: 'cnp',
      name: 'No presente',
      blurb: 'E-commerce o billetera, sin tarjeta presente, y monto alto.',
      weight: 12,
      enabled: true,
    },
  ].map((r) => Object.freeze({ ...r } as RuleConfig)),
);

export function defaultPolicy(): Policy {
  return { rules: DEFAULT_RULES.map((r) => ({ ...r })), reviewAt: REVIEW_AT, blockAt: BLOCK_AT };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export function clampWeight(weight: number): number {
  return Number.isFinite(weight) ? clamp(weight, 0, MAX_WEIGHT) : 0;
}

/** Umbrales válidos: revisión 10-80, bloqueo al menos 5 puntos por encima y máximo 100. */
export function clampThresholds(
  reviewAt: number,
  blockAt: number,
): { reviewAt: number; blockAt: number } {
  const r = clamp(Number.isFinite(reviewAt) ? reviewAt : REVIEW_AT, 10, 80);
  const b = clamp(Number.isFinite(blockAt) ? blockAt : BLOCK_AT, r + 5, MAX_SCORE);
  return { reviewAt: r, blockAt: b };
}

/**
 * Convierte cualquier valor (p. ej. JSON de localStorage o de una petición) en una política válida.
 * Nunca lanza: lo desconocido vuelve a los valores de fábrica.
 */
export function normalizePolicy(input: unknown): Policy {
  const fallback = defaultPolicy();
  if (!input || typeof input !== 'object') return fallback;
  const bag = input as { rules?: unknown; reviewAt?: unknown; blockAt?: unknown };
  const saved = Array.isArray(bag.rules) ? (bag.rules as unknown[]) : [];
  const rules = fallback.rules.map((def) => {
    const row = saved.find(
      (item): item is { id: unknown; weight?: unknown; enabled?: unknown } =>
        !!item && typeof item === 'object' && (item as { id?: unknown }).id === def.id,
    );
    if (!row) return def;
    return {
      ...def,
      weight: typeof row.weight === 'number' ? clampWeight(row.weight) : def.weight,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : def.enabled,
    };
  });
  const t = clampThresholds(
    typeof bag.reviewAt === 'number' ? bag.reviewAt : REVIEW_AT,
    typeof bag.blockAt === 'number' ? bag.blockAt : BLOCK_AT,
  );
  return { rules, ...t };
}

export function decide(score: number, reviewAt: number, blockAt: number): Decision {
  if (score >= blockAt) return 'block';
  if (score >= reviewAt) return 'review';
  return 'allow';
}

/** Evalúa un movimiento contra el perfil del cliente. Función pura. */
export function evaluate(txn: RawTxn, profile: Profile, policy: Policy): Verdict {
  const byId = new Map(policy.rules.map((r) => [r.id, r]));
  const hits: Hit[] = [];
  const push = (id: RuleId, evidence: string) => {
    const rule = byId.get(id);
    if (!rule || !rule.enabled || rule.weight <= 0) return;
    hits.push({ id, name: rule.name, weight: rule.weight, evidence });
  };

  if (txn.amount >= profile.avg * 4 || txn.amount >= 8_000_000) {
    push('monto', `Ticket medio ${cop(profile.avg)}. Este movimiento es ${cop(txn.amount)}.`);
  }

  const recent = profile.recent.filter((t) => txn.ts >= t && txn.ts - t <= 10 * MIN);
  if (recent.length >= 2) {
    push('velocidad', `${recent.length + 1} movimientos de este cliente en 10 minutos.`);
  }

  if (profile.lastTs > 0 && txn.ts >= profile.lastTs && txn.city !== profile.lastCity) {
    const dt = txn.ts - profile.lastTs;
    const mins = Math.max(1, Math.round(dt / MIN));
    const countryHop = txn.country !== profile.lastCountry;
    if (countryHop && dt <= 6 * HOUR) {
      push('geo', `${profile.lastCity} y luego ${txn.city} en ${mins} min. El viaje no cierra.`);
    } else if (!countryHop && dt <= 90 * MIN) {
      push('geo', `${profile.lastCity} → ${txn.city} en ${mins} min.`);
    }
  }

  const hour = bogotaHour(txn.ts);
  if (hour < 5 && txn.amount >= 1_500_000) {
    push('noche', `Hora Colombia ${String(hour).padStart(2, '0')}:xx con monto alto.`);
  }

  if (RISKY_MCC.includes(txn.mcc)) push('mcc', `${txn.mccLabel} · ${txn.merchant}.`);

  if (
    txn.beneficiaryNew &&
    txn.amount >= 2_000_000 &&
    (txn.channel === 'TRANSFER' || txn.channel === 'WALLET')
  ) {
    push('nuevo', `Primer envío a ese destino por ${cop(txn.amount)}.`);
  }

  if (!profile.devices.includes(txn.device)) push('device', txn.device);

  if (txn.country !== 'CO')
    push('pais', `${txn.city}, ${txn.country}. El cliente opera en Colombia.`);

  if (txn.amount >= 8_500_000 && txn.amount < REPORT_THRESHOLD && txn.amount % 50_000 === 0) {
    push('estructura', `${cop(txn.amount)} queda justo bajo el umbral de $10 millones.`);
  }

  if (
    !txn.cardPresent &&
    txn.amount >= 1_500_000 &&
    (txn.channel === 'ECOM' || txn.channel === 'WALLET')
  ) {
    push('cnp', `${channelLabel(txn.channel)} sin tarjeta presente.`);
  }

  const score = Math.min(
    MAX_SCORE,
    hits.reduce((sum, h) => sum + h.weight, 0),
  );
  return { score, hits, decision: decide(score, policy.reviewAt, policy.blockAt) };
}
