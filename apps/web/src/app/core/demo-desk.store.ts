import { DestroyRef, Injectable, inject } from '@angular/core';
import { createDesk, type DeskState } from '@centinela/fraud-engine';
import type { DeskAction } from './desk-actions';
import { DeskRunner } from './desk-runner';
import { DeskStore } from './desk-store';
import { clearDesk, loadDesk, saveDesk } from './demo-storage';

const SAVE_EVERY_MS = 1500;

/**
 * Modo demo: la mesa corre en un Web Worker (cola, worker de 5 etapas y reglas) y se guarda
 * en localStorage. Sin backend, apta para GitHub Pages.
 */
@Injectable()
export class DemoDeskStore extends DeskStore {
  readonly mode = 'demo' as const;
  private readonly storage = typeof localStorage === 'undefined' ? undefined : localStorage;
  private worker: Worker | null = null;
  private runner: DeskRunner | null = null;
  private lastSave = 0;

  constructor() {
    super();
    this.boot(loadDesk(this.storage, Date.now()));
    const onHide = () => this.persist(true);
    globalThis.addEventListener?.('pagehide', onHide);
    inject(DestroyRef).onDestroy(() => {
      globalThis.removeEventListener?.('pagehide', onHide);
      this.persist(true);
      this.teardown();
    });
  }

  dispatch(action: DeskAction): void {
    if (this.worker) this.worker.postMessage({ type: 'action', action });
    else this.runner?.dispatch(action);
  }

  reset(): void {
    clearDesk(this.storage);
    this.teardown();
    this.boot(createDesk(Date.now()));
  }

  private boot(initial: DeskState): void {
    this._state.set(initial);
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./desk.worker', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }: MessageEvent<{ type: 'state'; state: DeskState }>) =>
          this.accept(data.state);
        this.worker.postMessage({ type: 'init', state: initial });
        this._connected.set(true);
        return;
      } catch {
        this.worker = null;
      }
    }
    this.runner = new DeskRunner(initial, (s) => this.accept(s));
    this.runner.start();
    this._connected.set(true);
  }

  private accept(s: DeskState): void {
    this._state.set(s);
    this.persist(false);
  }

  private persist(force: boolean): void {
    const s = this._state();
    const now = Date.now();
    if (!s || (!force && now - this.lastSave < SAVE_EVERY_MS)) return;
    this.lastSave = now;
    saveDesk(this.storage, s);
  }

  private teardown(): void {
    this.worker?.terminate();
    this.worker = null;
    this.runner?.stop();
    this.runner = null;
    this._connected.set(false);
  }
}
