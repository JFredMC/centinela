import { describe, expect, it } from 'vitest';
import { parseDeskAction } from './actions';

describe('parseDeskAction', () => {
  it('acepta acciones válidas', () => {
    expect(parseDeskAction({ type: 'inject', kind: 'muleo' })).toEqual({
      type: 'inject',
      kind: 'muleo',
    });
    expect(parseDeskAction({ type: 'resolve', id: 'TX-1', action: 'confirmed' })).toEqual({
      type: 'resolve',
      id: 'TX-1',
      action: 'confirmed',
    });
    expect(parseDeskAction({ type: 'setRule', id: 'geo', patch: { weight: 10, x: 1 } })).toEqual({
      type: 'setRule',
      id: 'geo',
      patch: { weight: 10 },
    });
    expect(parseDeskAction({ type: 'setThresholds', reviewAt: 30 })).toEqual({
      type: 'setThresholds',
      reviewAt: 30,
    });
    expect(parseDeskAction({ type: 'toggleRun', extra: true })).toEqual({ type: 'toggleRun' });
  });

  it('rechaza basura', () => {
    for (const bad of [
      null,
      'x',
      42,
      {},
      { type: 'nope' },
      { type: 'inject', kind: 'robo' },
      { type: 'resolve', id: 'TX-1', action: 'open' },
      { type: 'resolve', id: 'x'.repeat(41), action: 'released' },
      { type: 'setRule', id: '__proto__', patch: { weight: 1 } },
      { type: 'setRule', id: 'geo', patch: {} },
      { type: 'setRule', id: 'geo', patch: { weight: Number.NaN } },
      { type: 'setThresholds' },
      { type: 'setThresholds', reviewAt: '30' },
    ]) {
      expect(parseDeskAction(bad)).toBeNull();
    }
  });
});
