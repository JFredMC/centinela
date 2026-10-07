import { Pipe, type PipeTransform } from '@angular/core';
import {
  ageLabel,
  analystLabel,
  channelLabel,
  clock,
  cop,
  decisionLabel,
  maskedPan,
  originLabel,
  type AnalystStatus,
  type Channel,
  type Decision,
  type Origin,
} from '@centinela/fraud-engine';

@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform = (v: number): string => cop(v);
}

@Pipe({ name: 'clock' })
export class ClockPipe implements PipeTransform {
  transform = (v: number): string => clock(v);
}

@Pipe({ name: 'age' })
export class AgePipe implements PipeTransform {
  transform = (ts: number, now: number): string => ageLabel(ts, now);
}

@Pipe({ name: 'channel' })
export class ChannelPipe implements PipeTransform {
  transform = (v: Channel): string => channelLabel(v);
}

@Pipe({ name: 'decision' })
export class DecisionPipe implements PipeTransform {
  transform = (v: Decision): string => decisionLabel(v);
}

@Pipe({ name: 'origin' })
export class OriginPipe implements PipeTransform {
  transform = (v: Origin): string => originLabel(v);
}

@Pipe({ name: 'analyst' })
export class AnalystPipe implements PipeTransform {
  transform = (v: AnalystStatus): string => analystLabel(v);
}

@Pipe({ name: 'pan' })
export class PanPipe implements PipeTransform {
  transform = (v: string): string => maskedPan(v);
}
