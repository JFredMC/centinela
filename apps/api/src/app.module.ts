import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_CONFIG, TXN_QUEUE, loadConfig, type AppConfig } from './config';
import { DeskController } from './desk/desk.controller';
import { DeskGateway } from './desk/desk.gateway';
import { CLOCK, DeskService } from './desk/desk.service';
import { ScoringProcessor } from './desk/scoring.processor';
import { HealthController } from './health.controller';

const config = loadConfig();

@Module({
  imports: [
    BullModule.forRoot({ connection: { url: config.redisUrl, maxRetriesPerRequest: null } }),
    BullModule.registerQueue({ name: TXN_QUEUE }),
  ],
  controllers: [HealthController, DeskController],
  providers: [
    { provide: APP_CONFIG, useValue: config satisfies AppConfig },
    { provide: CLOCK, useValue: () => Date.now() },
    DeskService,
    ScoringProcessor,
    DeskGateway,
  ],
})
export class AppModule {}
