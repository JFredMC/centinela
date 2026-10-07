import {
  inject as injectScenario,
  resetPolicy,
  resolve,
  setRule,
  setThresholds,
  toggleRun,
  toggleSpeed,
  type AnalystAction,
  type DeskState,
  type RuleConfig,
  type RuleId,
  type ScenarioKind,
} from '@centinela/fraud-engine';

/** Acciones de la mesa. Son datos planos para poder cruzar al Web Worker o al socket. */
export type DeskAction =
  | { type: 'inject'; kind: ScenarioKind }
  | { type: 'resolve'; id: string; action: AnalystAction }
  | { type: 'setRule'; id: RuleId; patch: Partial<Pick<RuleConfig, 'weight' | 'enabled'>> }
  | { type: 'setThresholds'; reviewAt?: number; blockAt?: number }
  | { type: 'resetPolicy' }
  | { type: 'toggleRun' }
  | { type: 'toggleSpeed' };

export function applyAction(s: DeskState, a: DeskAction, now: number): DeskState {
  switch (a.type) {
    case 'inject':
      return injectScenario(s, a.kind, now);
    case 'resolve':
      return resolve(s, a.id, a.action);
    case 'setRule':
      return setRule(s, a.id, a.patch);
    case 'setThresholds':
      return setThresholds(s, { reviewAt: a.reviewAt, blockAt: a.blockAt });
    case 'resetPolicy':
      return resetPolicy(s);
    case 'toggleRun':
      return toggleRun(s);
    case 'toggleSpeed':
      return toggleSpeed(s);
  }
}
