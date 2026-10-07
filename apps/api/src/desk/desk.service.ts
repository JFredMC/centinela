import { InjectQueue } from '@nestjs/bullmq';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  AUTO_QUEUE_CAP,
  QUEUE_LIMIT,
  SCENARIOS,
  SPAWN_EVERY,
  STAGE_MS,
  STAGES,
  buildScenario,
  createDesk,
  idSequence,
  resetPolicy,
  resolve,
  scoreTxn,
  setRule,
  setThresholds,
  spawnTxn,
  toggleRun,
  toggleSpeed,
  type DeskAction,
  type DeskState,
  type RawTxn,
} from '@centinela/fraud-engine';
import type { Queue } from 'bullmq';
import { Subject } from 'rxjs';
import { TXN_QUEUE } from '../config';

/** Prioridad BullMQ: menor número sale primero. Los escenarios se adelantan al tráfico. */
export const PRIORITY = { scenario: 1, traffic: 10 } as const;
export const PRODUCER_TICK_MS = 100;

export const CLOCK = Symbol('CLOCK');
export type Clock = () => number;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Estado de la mesa en el servidor. La cola real es BullMQ (Redis); `state.queue` es su espejo
 * para que la consola la vea. El worker (`ScoringProcessor`) llama a `process` por cada job.
 *
 * El estado vive en memoria: es una demo de un solo nodo y arranca con la misma historia que
 * el modo demo del navegador.
 */
@Injectable()
export class DeskService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DeskService.name);
  private state: DeskState;
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly changes$ = new Subject<DeskState>();

  constructor(
    @InjectQueue(TXN_QUEUE) private readonly queue: Queue<RawTxn>,
    @Inject(CLOCK) private readonly now: Clock,
  ) {
    this.state = createDesk(this.now());
  }

  async onApplicationBootstrap(): Promise<void> {
    // Una demo de un nodo: lo que quedó en Redis de una corrida anterior no tiene perfil en memoria.
    await this.queue.drain(true);
    this.timer = setInterval(() => void this.produce(), PRODUCER_TICK_MS);
    this.logger.log('Productor de tráfico en marcha');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.changes$.complete();
  }

  snapshot(): DeskState {
    return this.state;
  }

  /** Genera tráfico de fondo según la velocidad, sin pasar el tope de la cola. */
  async produce(): Promise<void> {
    const s = this.state;
    const now = this.now();
    if (!s.running || s.queue.length >= AUTO_QUEUE_CAP || now - s.lastSpawn < SPAWN_EVERY[s.speed])
      return;
    const ids = idSequence(s.idCursor);
    const txn = spawnTxn(ids.next, s.profiles, now, s.seq);
    this.commit({
      ...s,
      idCursor: ids.cursor(),
      seq: s.seq + 1,
      lastSpawn: now,
      queue: [...s.queue, txn],
    });
    await this.enqueue([txn], PRIORITY.traffic);
  }

  async apply(action: DeskAction): Promise<void> {
    const s = this.state;
    switch (action.type) {
      case 'inject': {
        const now = this.now();
        const ids = idSequence(s.idCursor);
        const batch = buildScenario(action.kind, ids.next, s.profiles, now).slice(0, QUEUE_LIMIT);
        const text = SCENARIOS.find((x) => x.kind === action.kind)?.notice ?? '';
        this.commit({
          ...s,
          idCursor: ids.cursor(),
          queue: [...batch, ...s.queue],
          notice: { text, at: now },
        });
        await this.enqueue(batch, PRIORITY.scenario);
        return;
      }
      case 'resolve':
        return this.commit(resolve(s, action.id, action.action));
      case 'setRule':
        return this.commit(setRule(s, action.id, action.patch));
      case 'setThresholds':
        return this.commit(setThresholds(s, action));
      case 'resetPolicy':
        return this.commit(resetPolicy(s));
      case 'toggleRun':
        return this.commit(toggleRun(s));
      case 'toggleSpeed':
        return this.commit(toggleSpeed(s));
    }
  }

  /** Vacía la cola y vuelve a la mesa inicial. */
  async reset(): Promise<void> {
    await this.queue.drain(true);
    this.commit(createDesk(this.now()));
  }

  /** Lo llama el worker de BullMQ: pasa el movimiento por las 5 etapas y lo puntúa. */
  async process(txn: RawTxn, stageMs = STAGE_MS): Promise<void> {
    if (!this.state.profiles.some((p) => p.id === txn.customerId)) return;
    this.commit({ ...this.state, queue: this.state.queue.filter((t) => t.id !== txn.id) });
    for (const st of STAGES) {
      this.commit({ ...this.state, processing: { txn, stage: st.id, stageAt: this.now() } });
      await sleep(stageMs);
    }
    const now = this.now();
    const latencyMs = Math.max(stageMs, now - txn.enqueuedAt);
    const s = this.state;
    const done = scoreTxn(txn, s.profiles, s.policy, now, latencyMs);
    this.commit({
      ...s,
      profiles: done.profiles,
      feed: [done.txn, ...s.feed].slice(0, 180),
      processing: null,
    });
  }

  private async enqueue(txns: RawTxn[], priority: number): Promise<void> {
    await this.queue.addBulk(
      txns.map((t) => ({
        name: 'score',
        data: t,
        opts: { jobId: t.id, priority, removeOnComplete: true, removeOnFail: 100, attempts: 2 },
      })),
    );
  }

  private commit(next: DeskState): void {
    if (next === this.state) return;
    const now = this.now();
    if (next.notice && now - next.notice.at > 3200) next = { ...next, notice: null };
    this.state = next;
    this.changes$.next(next);
  }
}
