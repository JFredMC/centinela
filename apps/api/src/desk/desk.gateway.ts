import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parseDeskAction } from '@centinela/fraud-engine';
import { Subscription, auditTime } from 'rxjs';
import type { Server, Socket } from 'socket.io';
import { APP_CONFIG, type AppConfig } from '../config';
import { DeskService } from './desk.service';
import { RateLimiter } from './rate-limit';

export const BROADCAST_MS = 120;
type Ack = { ok: true } | { ok: false; error: string };

/**
 * Canal en vivo `/desk`. Al conectar, el cliente recibe el estado completo; después, un
 * estado nuevo como máximo cada 120 ms. Las acciones se validan con `parseDeskAction`.
 */
@WebSocketGateway({ namespace: '/desk' })
export class DeskGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(DeskGateway.name);
  private readonly limiter: RateLimiter;
  private sub?: Subscription;

  constructor(
    private readonly desk: DeskService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.limiter = new RateLimiter(config.actionsPerSecond);
  }

  afterInit(): void {
    this.sub = this.desk.changes$
      .pipe(auditTime(BROADCAST_MS))
      .subscribe((s) => this.server.emit('state', s));
  }

  handleConnection(client: Socket): void {
    client.emit('state', this.desk.snapshot());
  }

  handleDisconnect(client: Socket): void {
    this.limiter.forget(client.id);
  }

  onModuleDestroy(): void {
    this.sub?.unsubscribe();
  }

  @SubscribeMessage('action')
  async onAction(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<Ack> {
    if (!this.limiter.take(client.id))
      return { ok: false, error: 'Demasiadas acciones, espera un momento.' };
    const action = parseDeskAction(body);
    if (!action) return { ok: false, error: 'Acción no válida.' };
    await this.desk.apply(action);
    return { ok: true };
  }

  @SubscribeMessage('reset')
  async onReset(@ConnectedSocket() client: Socket): Promise<Ack> {
    if (!this.limiter.take(client.id))
      return { ok: false, error: 'Demasiadas acciones, espera un momento.' };
    this.logger.log(`Reinicio pedido por ${client.id}`);
    await this.desk.reset();
    return { ok: true };
  }
}
