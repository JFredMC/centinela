import { createDesk, STAGE_MS, type DeskState } from '@centinela/fraud-engine';
import { applyAction } from './desk-actions';
import { DeskRunner } from './desk-runner';

const NOW = Date.UTC(2026, 9, 7, 20);

describe('DeskRunner', () => {
  it('avisa solo cuando el estado cambia y procesa la cola', () => {
    let now = NOW;
    const seen: DeskState[] = [];
    const r = new DeskRunner(
      createDesk(NOW),
      (s) => seen.push(s),
      () => now,
    );
    r.dispatch({ type: 'toggleRun' });
    expect(seen).toHaveLength(1);
    r.step();
    expect(seen).toHaveLength(1);
    r.dispatch({ type: 'inject', kind: 'viaje' });
    for (let i = 0; i < 20; i++) {
      now += STAGE_MS;
      r.step();
    }
    expect(r.snapshot().feed).toHaveLength(16);
    expect(r.snapshot().queue).toHaveLength(0);
  });
});

describe('applyAction', () => {
  it('cubre todas las acciones', () => {
    let s = createDesk(NOW);
    s = applyAction(s, { type: 'toggleSpeed' }, NOW);
    expect(s.speed).toBe('fast');
    s = applyAction(s, { type: 'setRule', id: 'geo', patch: { weight: 5 } }, NOW);
    s = applyAction(s, { type: 'setThresholds', reviewAt: 20 }, NOW);
    expect(s.policy.reviewAt).toBe(20);
    s = applyAction(s, { type: 'resetPolicy' }, NOW);
    expect(s.policy.rules.find((r) => r.id === 'geo')?.weight).toBe(36);
    const open = s.feed.find((t) => t.analyst === 'open');
    s = applyAction(s, { type: 'resolve', id: open?.id ?? '', action: 'escalated' }, NOW);
    expect(s.feed.find((t) => t.id === open?.id)?.analyst).toBe('escalated');
  });
});
