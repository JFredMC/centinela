import { BadRequestException, Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { kpis, parseDeskAction, type DeskState, type Kpis } from '@centinela/fraud-engine';
import { DeskService } from './desk.service';

@Controller('desk')
export class DeskController {
  constructor(private readonly desk: DeskService) {}

  @Get()
  state(): DeskState {
    return this.desk.snapshot();
  }

  @Get('kpis')
  kpis(): Kpis {
    return kpis(this.desk.snapshot().feed);
  }

  @Post('actions')
  @HttpCode(202)
  async act(@Body() body: unknown): Promise<{ ok: true }> {
    const action = parseDeskAction(body);
    if (!action) throw new BadRequestException('Acción no válida.');
    await this.desk.apply(action);
    return { ok: true };
  }
}
