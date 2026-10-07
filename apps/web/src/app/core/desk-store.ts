import { computed, signal, type Signal } from '@angular/core';
import { kpis, type DeskState, type Kpis } from '@centinela/fraud-engine';
import type { DeskAction } from './desk-actions';

export type DeskMode = 'demo' | 'api';

/** Fuente de la mesa: demo en el navegador o backend real. Los componentes solo ven esto. */
export abstract class DeskStore {
  abstract readonly mode: DeskMode;
  protected readonly _state = signal<DeskState | null>(null);
  protected readonly _connected = signal(false);

  readonly state: Signal<DeskState | null> = this._state.asReadonly();
  readonly connected: Signal<boolean> = this._connected.asReadonly();
  readonly feed = computed(() => this._state()?.feed ?? []);
  readonly kpis: Signal<Kpis> = computed(() => kpis(this.feed()));
  readonly openAlerts = computed(() => this.feed().filter((t) => t.analyst === 'open'));

  abstract dispatch(action: DeskAction): void;
  /** Borra los datos y empieza una mesa nueva. */
  abstract reset(): void;
}
