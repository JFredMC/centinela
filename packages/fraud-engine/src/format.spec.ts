import { describe, expect, it } from 'vitest';
import { ageLabel, bogotaHour, clock, cop, maskedPan, channelLabel, decisionLabel } from './format';
import { bogotaNight } from './generator';

describe('format', () => {
  it('cop usa separador de miles colombiano', () => {
    expect(cop(9_900_000)).toBe('$9.900.000');
  });
  it('clock y bogotaHour en hora Colombia', () => {
    const ts = Date.UTC(2026, 9, 7, 7, 5, 9);
    expect(clock(ts)).toBe('02:05:09');
    expect(bogotaHour(ts)).toBe(2);
    expect(bogotaHour(Date.UTC(2026, 9, 7, 5, 0))).toBe(0);
  });
  it('ageLabel', () => {
    expect(ageLabel(0, 30_000)).toBe('hace 30 s');
    expect(ageLabel(0, 5 * 60_000)).toBe('hace 5 min');
    expect(ageLabel(0, 3 * 3_600_000)).toBe('hace 3 h');
    expect(ageLabel(10, 0)).toBe('hace 0 s');
  });
  it('maskedPan es estable', () => {
    expect(maskedPan('c1')).toBe(maskedPan('c1'));
    expect(maskedPan('c1')).toMatch(/^•••• \d{4}$/);
  });
  it('etiquetas', () => {
    expect(channelLabel('ATM')).toBe('Cajero');
    expect(decisionLabel('block')).toBe('Retenida');
  });
  it('bogotaNight cae a las 02:40 COT y nunca en el futuro', () => {
    const now = Date.UTC(2026, 9, 7, 20, 0);
    const n = bogotaNight(now);
    expect(n).toBeLessThanOrEqual(now);
    expect(clock(n)).toBe('02:40:12');
    const early = Date.UTC(2026, 9, 7, 6, 0); // 01:00 COT
    expect(bogotaNight(early)).toBeLessThan(early);
  });
});
