import {
  inject as injectScenario,
  resetPolicy,
  resolve,
  setRule,
  setThresholds,
  toggleRun,
  toggleSpeed,
  type DeskState,
  type DeskAction,
} from '@centinela/fraud-engine';

export type { DeskAction } from '@centinela/fraud-engine';

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
