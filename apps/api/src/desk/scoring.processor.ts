import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { RawTxn } from '@centinela/fraud-engine';
import type { Job } from 'bullmq';
import { TXN_QUEUE } from '../config';
import { DeskService } from './desk.service';

/** Worker de BullMQ. Concurrencia 1: el pipeline de la consola muestra un movimiento a la vez. */
@Processor(TXN_QUEUE, { concurrency: 1 })
export class ScoringProcessor extends WorkerHost {
  constructor(private readonly desk: DeskService) {
    super();
  }

  async process(job: Job<RawTxn>): Promise<void> {
    await this.desk.process(job.data);
  }
}
