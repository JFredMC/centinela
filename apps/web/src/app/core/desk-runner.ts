import { tick, type DeskState } from '@centinela/fraud-engine';
import { applyAction, type DeskAction } from './desk-actions';

export const TICK_MS = 80;

/**
 * Reloj de la mesa en modo demo. Corre dentro del Web Worker (o en el hilo principal si el
 * navegador no tiene workers) y avisa cada vez que el estado cambia.
 */
export class DeskRunner {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private state: DeskState,
    private readonly onChange: (s: DeskState) => void,
    private readonly now: () => number = Date.now,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  step(): void {
    this.commit(tick(this.state, this.now()));
  }

  dispatch(action: DeskAction): void {
    this.commit(applyAction(this.state, action, this.now()));
  }

  snapshot(): DeskState {
    return this.state;
  }

  private commit(next: DeskState): void {
    if (next === this.state) return;
    this.state = next;
    this.onChange(next);
  }
}
