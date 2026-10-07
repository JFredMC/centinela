import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { TXN_QUEUE } from './config';

@Controller('health')
export class HealthController {
  constructor(@InjectQueue(TXN_QUEUE) private readonly queue: Queue) {}

  @Get()
  async check(): Promise<{ status: 'ok'; redis: 'up'; waiting: number }> {
    try {
      // Si Redis no responde, esta llamada falla.
      return { status: 'ok', redis: 'up', waiting: await this.queue.getWaitingCount() };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', redis: 'down' });
    }
  }
}
