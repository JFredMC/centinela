import type { AnalystAction, RuleConfig, RuleId, ScenarioKind } from './types';

/** Acciones de la mesa. Datos planos: cruzan al Web Worker y al socket del backend. */
export type DeskAction =
  | { type: 'inject'; kind: ScenarioKind }
  | { type: 'resolve'; id: string; action: AnalystAction }
  | { type: 'setRule'; id: RuleId; patch: Partial<Pick<RuleConfig, 'weight' | 'enabled'>> }
  | { type: 'setThresholds'; reviewAt?: number; blockAt?: number }
  | { type: 'resetPolicy' }
  | { type: 'toggleRun' }
  | { type: 'toggleSpeed' };

const SCENARIO_KINDS: readonly string[] = ['viaje', 'muleo', 'estructura', 'cripto'];
const ANALYST_ACTIONS: readonly string[] = ['released', 'confirmed', 'escalated'];
const RULE_IDS: readonly string[] = [
  'monto',
  'velocidad',
  'geo',
  'noche',
  'mcc',
  'nuevo',
  'device',
  'pais',
  'estructura',
  'cnp',
];

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Valida una acción que llega de fuera (socket o HTTP). Devuelve `null` si no es válida. */
export function parseDeskAction(input: unknown): DeskAction | null {
  if (!input || typeof input !== 'object') return null;
  const a = input as Record<string, unknown>;
  switch (a['type']) {
    case 'inject':
      return typeof a['kind'] === 'string' && SCENARIO_KINDS.includes(a['kind'])
        ? { type: 'inject', kind: a['kind'] as ScenarioKind }
        : null;
    case 'resolve':
      return typeof a['id'] === 'string' &&
        a['id'].length > 0 &&
        a['id'].length <= 40 &&
        typeof a['action'] === 'string' &&
        ANALYST_ACTIONS.includes(a['action'])
        ? { type: 'resolve', id: a['id'], action: a['action'] as AnalystAction }
        : null;
    case 'setRule': {
      const patch = a['patch'] as Record<string, unknown> | undefined;
      if (
        typeof a['id'] !== 'string' ||
        !RULE_IDS.includes(a['id']) ||
        !patch ||
        typeof patch !== 'object'
      )
        return null;
      const out: Partial<Pick<RuleConfig, 'weight' | 'enabled'>> = {};
      if (num(patch['weight'])) out.weight = patch['weight'];
      if (typeof patch['enabled'] === 'boolean') out.enabled = patch['enabled'];
      return Object.keys(out).length
        ? { type: 'setRule', id: a['id'] as RuleId, patch: out }
        : null;
    }
    case 'setThresholds': {
      const out: { type: 'setThresholds'; reviewAt?: number; blockAt?: number } = {
        type: 'setThresholds',
      };
      if (num(a['reviewAt'])) out.reviewAt = a['reviewAt'];
      if (num(a['blockAt'])) out.blockAt = a['blockAt'];
      return out.reviewAt === undefined && out.blockAt === undefined ? null : out;
    }
    case 'resetPolicy':
    case 'toggleRun':
    case 'toggleSpeed':
      return { type: a['type'] };
    default:
      return null;
  }
}
