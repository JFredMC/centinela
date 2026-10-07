import type { AnalystStatus, Channel, Decision, Origin } from './types';

const TZ = 'America/Bogota';
const moneyFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const timeFmt = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: TZ,
});
const hourFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: TZ,
});

/** Pesos colombianos sin decimales: `$1.250.000`. */
export function cop(amount: number): string {
  return `$${moneyFmt.format(amount)}`;
}

/** Hora Colombia `HH:MM:SS`. */
export function clock(ts: number): string {
  return timeFmt.format(ts);
}

/** Hora (0-23) en Colombia. */
export function bogotaHour(ts: number): number {
  return Number(hourFmt.format(ts)) % 24;
}

export function ageLabel(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.round(m / 60)} h`;
}

/** Últimos 4 dígitos simulados y estables para un id de cliente. */
export function maskedPan(id: string): string {
  let n = 0;
  for (const c of id) n = (n * 33 + c.charCodeAt(0)) % 10000;
  return `•••• ${String(n).padStart(4, '0')}`;
}

const CHANNEL: Record<Channel, string> = {
  POS: 'POS',
  ECOM: 'E-commerce',
  TRANSFER: 'Transferencia',
  ATM: 'Cajero',
  WALLET: 'Billetera',
};
export const channelLabel = (c: Channel): string => CHANNEL[c];

const DECISION: Record<Decision, string> = {
  allow: 'Autorizada',
  review: 'Revisión',
  block: 'Retenida',
};
export const decisionLabel = (d: Decision): string => DECISION[d];

const ORIGIN: Record<Origin, string> = {
  canal: '',
  viaje: 'Viaje imposible',
  muleo: 'Muleo',
  estructura: 'Estructuración',
  cripto: 'Cripto de madrugada',
};
export const originLabel = (o: Origin): string => ORIGIN[o];

const ANALYST: Record<AnalystStatus, string> = {
  none: '',
  open: 'Pendiente',
  released: 'Liberada por la mesa',
  confirmed: 'Bloqueo confirmado',
  escalated: 'Escalada a cumplimiento',
};
export const analystLabel = (a: AnalystStatus): string => ANALYST[a];
