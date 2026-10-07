import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { pickSelection, type ScoredTxn } from '@centinela/fraud-engine';
import { DeskStore } from './desk-store';

export type MobileTab = 'alerts' | 'feed' | 'case';

/** Estado de la interfaz que no pertenece a la mesa: selección, panel de reglas, reloj. */
@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly desk = inject(DeskStore);
  readonly selectedId = signal<string | null>(null);
  readonly rulesOpen = signal(false);
  readonly tab = signal<MobileTab>('alerts');
  readonly now = signal(Date.now());

  /** Alerta seleccionada, o la más urgente si el usuario aún no eligió. */
  readonly selected = computed<ScoredTxn | null>(() => {
    const feed = this.desk.feed();
    const id = this.selectedId() ?? pickSelection(feed);
    return feed.find((t) => t.id === id) ?? null;
  });

  constructor() {
    const t = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.tab.set('case');
  }
}
