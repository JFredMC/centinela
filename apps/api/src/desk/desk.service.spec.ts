import { createDesk } from '@centinela/fraud-engine';
import type { Queue } from 'bullmq';
import { DeskService, PRIORITY } from './desk.service';

const NOW = Date.UTC(2026, 9, 7, 20);

function setup() {
  let now = NOW;
  const added: { data: { id: string }; opts: { priority: number } }[] = [];
  const queue = {
    addBulk: jest.fn(async (jobs: typeof added) => void added.push(...jobs)),
    drain: jest.fn(async () => undefined),
  } as unknown as Queue;
  const desk = new DeskService(queue, () => now);
  return { desk, added, queue, advance: (ms: number) => (now += ms), now: () => now };
}

describe('DeskService', () => {
  it('arranca con la misma historia que la demo', () => {
    const { desk } = setup();
    expect(desk.snapshot().feed).toEqual(createDesk(NOW).feed);
  });

  it('produce tráfico según la velocidad y lo encola con prioridad baja', async () => {
    const { desk, added, advance } = setup();
    await desk.produce();
    expect(added).toHaveLength(0);
    advance(1200);
    await desk.produce();
    expect(added).toHaveLength(1);
    expect(added[0]?.opts.priority).toBe(PRIORITY.traffic);
    expect(desk.snapshot().queue).toHaveLength(1);
    await desk.produce();
    expect(added).toHaveLength(1);
  });

  it('pausado no produce', async () => {
    const { desk, added, advance } = setup();
    await desk.apply({ type: 'toggleRun' });
    advance(5000);
    await desk.produce();
    expect(added).toHaveLength(0);
  });

  it('un escenario se encola adelante, con prioridad alta y aviso', async () => {
    const { desk, added } = setup();
    await desk.apply({ type: 'inject', kind: 'estructura' });
    expect(added).toHaveLength(3);
    expect(added.every((j) => j.opts.priority === PRIORITY.scenario)).toBe(true);
    expect(desk.snapshot().notice?.text).toContain('$10 millones');
  });

  it('process pasa por las etapas, puntúa y publica cambios', async () => {
    const { desk } = setup();
    await desk.apply({ type: 'inject', kind: 'cripto' });
    const stages: string[] = [];
    desk.changes$.subscribe((s) => s.processing && stages.push(s.processing.stage));
    for (const t of [...desk.snapshot().queue]) await desk.process(t, 0);
    const s = desk.snapshot();
    expect(s.queue).toHaveLength(0);
    expect(s.processing).toBeNull();
    expect(new Set(stages)).toEqual(new Set(['ingest', 'enrich', 'rules', 'score', 'decide']));
    const hit = s.feed.find((t) => t.mcc === '6051' && t.enqueuedAt === NOW);
    expect(hit?.decision).toBe('block');
  });

  it('ignora jobs de clientes desconocidos', async () => {
    const { desk } = setup();
    const before = desk.snapshot();
    await desk.process({ ...before.feed[0]!, customerId: 'x' }, 0);
    expect(desk.snapshot()).toBe(before);
  });

  it('acciones del analista y política', async () => {
    const { desk } = setup();
    const open = desk.snapshot().feed.find((t) => t.analyst === 'open')!;
    await desk.apply({ type: 'resolve', id: open.id, action: 'escalated' });
    await desk.apply({ type: 'setRule', id: 'geo', patch: { enabled: false } });
    await desk.apply({ type: 'setThresholds', reviewAt: 50 });
    await desk.apply({ type: 'toggleSpeed' });
    const s = desk.snapshot();
    expect(s.feed.find((t) => t.id === open.id)?.analyst).toBe('escalated');
    expect(s.policy.rules.find((r) => r.id === 'geo')?.enabled).toBe(false);
    expect(s.policy.reviewAt).toBe(50);
    expect(s.speed).toBe('fast');
    await desk.apply({ type: 'resetPolicy' });
    expect(desk.snapshot().policy.reviewAt).toBe(40);
  });

  it('reset vacía la cola y vuelve al inicio', async () => {
    const { desk, queue } = setup();
    await desk.apply({ type: 'inject', kind: 'muleo' });
    await desk.reset();
    expect(queue.drain).toHaveBeenCalled();
    expect(desk.snapshot().queue).toHaveLength(0);
  });
});
