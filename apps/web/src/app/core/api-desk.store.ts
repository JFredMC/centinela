import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { parseDeskAction, type DeskState } from '@centinela/fraud-engine';
import type { Socket } from 'socket.io-client';
import type { DeskAction } from './desk-actions';
import { DeskStore } from './desk-store';
import { API_URL } from './mode';

/**
 * Modo API: la mesa vive en el backend (NestJS + BullMQ + Redis). Recibe el estado por
 * Socket.IO (`/desk`) y envía las acciones por el mismo canal. socket.io-client se carga
 * bajo demanda para no pesar en el modo demo.
 */
@Injectable()
export class ApiDeskStore extends DeskStore {
  readonly mode = 'api' as const;
  readonly error = signal<string | null>(null);
  private socket: Socket | null = null;
  private readonly apiUrl = inject(API_URL);

  constructor() {
    super();
    void this.connect();
    inject(DestroyRef).onDestroy(() => this.socket?.disconnect());
  }

  dispatch(action: DeskAction): void {
    if (!parseDeskAction(action)) return;
    this.socket
      ?.timeout(5000)
      .emitWithAck('action', action)
      .then((ack: { ok: boolean; error?: string }) =>
        this.error.set(ack.ok ? null : (ack.error ?? 'Error')),
      )
      .catch(() => this.error.set('El servidor no respondió.'));
  }

  reset(): void {
    this.socket?.emit('reset');
  }

  private async connect(): Promise<void> {
    const { io } = await import('socket.io-client');
    const socket = io(`${this.apiUrl}/desk`, {
      transports: ['websocket'],
      reconnectionDelayMax: 5000,
    });
    this.socket = socket;
    socket.on('connect', () => {
      this._connected.set(true);
      this.error.set(null);
    });
    socket.on('disconnect', () => this._connected.set(false));
    socket.on('connect_error', () => this.error.set(`Sin conexión con ${this.apiUrl}`));
    socket.on('state', (s: DeskState) => this._state.set(s));
  }
}
