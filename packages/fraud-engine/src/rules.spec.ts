import { describe, expect, it } from 'vitest';
import {
  BLOCK_AT,
  clampThresholds,
  decide,
  defaultPolicy,
  DEFAULT_RULES,
  evaluate,
  normalizePolicy,
  REVIEW_AT,
} from './rules';
import { NOON, profile, txn } from './test-helpers';
import type { RuleId } from './types';

const ids = (t = txn(), p = profile()) => evaluate(t, p, defaultPolicy()).hits.map((h) => h.id);
const MIN = 60_000;

describe('evaluate: cada regla', () => {
  it('un movimiento cotidiano no dispara nada', () => {
    const v = evaluate(txn(), profile(), defaultPolicy());
    expect(v).toEqual({ score: 0, hits: [], decision: 'allow' });
  });

  it('monto: 4× el ticket medio o $8 millones', () => {
    expect(ids(txn({ amount: 720_000 }))).toContain('monto');
    expect(ids(txn({ amount: 719_000 }))).not.toContain('monto');
    expect(ids(txn({ amount: 8_000_000 }), profile({ avg: 5_000_000 }))).toContain('monto');
  });

  it('velocidad: tercer movimiento en 10 minutos', () => {
    const p = profile({ recent: [NOON - 9 * MIN, NOON - 2 * MIN] });
    expect(ids(txn(), p)).toContain('velocidad');
    expect(ids(txn(), profile({ recent: [NOON - 11 * MIN, NOON - 2 * MIN] }))).not.toContain(
      'velocidad',
    );
  });

  it('geo: otra ciudad en menos de 90 min, otro país en menos de 6 h', () => {
    const p = profile({ lastTs: NOON - 60 * MIN, lastCity: 'Bogotá' });
    expect(ids(txn(), p)).toContain('geo');
    expect(ids(txn(), profile({ lastTs: NOON - 120 * MIN, lastCity: 'Bogotá' }))).not.toContain(
      'geo',
    );
    const abroad = txn({ city: 'Miami', country: 'US' });
    expect(ids(abroad, profile({ lastTs: NOON - 5 * 60 * MIN }))).toContain('geo');
    expect(ids(abroad, profile({ lastTs: NOON - 7 * 60 * MIN }))).not.toContain('geo');
  });

  it('geo: ignora movimientos con hora anterior al último conocido', () => {
    expect(ids(txn(), profile({ lastTs: NOON + MIN, lastCity: 'Bogotá' }))).not.toContain('geo');
  });

  it('noche: 00:00-05:00 hora Colombia con monto alto', () => {
    const night = Date.UTC(2026, 9, 7, 7, 40); // 02:40 COT
    expect(ids(txn({ ts: night, amount: 1_500_000 }))).toContain('noche');
    expect(ids(txn({ ts: night, amount: 1_400_000 }))).not.toContain('noche');
    expect(ids(txn({ amount: 1_500_000 }))).not.toContain('noche');
  });

  it('mcc: comercios de riesgo', () => {
    expect(ids(txn({ mcc: '6051' }))).toContain('mcc');
    expect(ids(txn({ mcc: '5411' }))).not.toContain('mcc');
  });

  it('nuevo: beneficiario nuevo, transferencia o billetera, sobre $2 millones', () => {
    const t = { beneficiaryNew: true, amount: 2_000_000, cardPresent: false };
    expect(ids(txn({ ...t, channel: 'TRANSFER' }))).toContain('nuevo');
    expect(ids(txn({ ...t, channel: 'POS' }))).not.toContain('nuevo');
    expect(ids(txn({ ...t, channel: 'WALLET', amount: 1_999_000 }))).not.toContain('nuevo');
  });

  it('device y país', () => {
    expect(ids(txn({ device: 'Navegador no reconocido' }))).toContain('device');
    expect(ids(txn({ country: 'PA', city: 'Panamá' }))).toContain('pais');
  });

  it('estructura: monto redondo entre $8,5 y $10 millones', () => {
    const p = profile({ avg: 5_000_000 });
    expect(ids(txn({ amount: 9_900_000 }), p)).toContain('estructura');
    expect(ids(txn({ amount: 9_910_000 }), p)).not.toContain('estructura');
    expect(ids(txn({ amount: 10_000_000 }), p)).not.toContain('estructura');
  });

  it('cnp: e-commerce sin tarjeta y monto alto', () => {
    expect(ids(txn({ channel: 'ECOM', cardPresent: false, amount: 1_500_000 }))).toContain('cnp');
    expect(ids(txn({ channel: 'ECOM', cardPresent: true, amount: 1_500_000 }))).not.toContain(
      'cnp',
    );
  });
});

describe('evaluate: puntaje y política', () => {
  it('suma pesos con tope de 100', () => {
    const t = txn({
      amount: 9_900_000,
      mcc: '6051',
      country: 'US',
      city: 'Miami',
      device: 'x',
      channel: 'ECOM',
      cardPresent: false,
      ts: Date.UTC(2026, 9, 7, 7, 40),
    });
    const v = evaluate(t, profile({ lastTs: Date.UTC(2026, 9, 7, 7, 30) }), defaultPolicy());
    expect(v.hits.reduce((s, h) => s + h.weight, 0)).toBeGreaterThan(100);
    expect(v.score).toBe(100);
    expect(v.decision).toBe('block');
  });

  it('reglas apagadas o con peso 0 no cuentan', () => {
    const policy = defaultPolicy();
    policy.rules = policy.rules.map((r) =>
      r.id === 'mcc' ? { ...r, enabled: false } : r.id === 'device' ? { ...r, weight: 0 } : r,
    );
    expect(evaluate(txn({ mcc: '6051', device: 'x' }), profile(), policy).hits).toEqual([]);
  });

  it('decide por umbrales', () => {
    expect(decide(REVIEW_AT - 1, REVIEW_AT, BLOCK_AT)).toBe('allow');
    expect(decide(REVIEW_AT, REVIEW_AT, BLOCK_AT)).toBe('review');
    expect(decide(BLOCK_AT, REVIEW_AT, BLOCK_AT)).toBe('block');
  });

  it('cada hit trae evidencia legible', () => {
    const v = evaluate(txn({ amount: 9_900_000, mcc: '6051' }), profile(), defaultPolicy());
    for (const h of v.hits) expect(h.evidence.length).toBeGreaterThan(3);
    expect(v.hits.find((h) => h.id === 'monto')?.evidence).toContain('$9.900.000');
  });
});

describe('política', () => {
  it('defaultPolicy devuelve copias (no muta las reglas de fábrica)', () => {
    const p = defaultPolicy();
    (p.rules[0] as { weight: number }).weight = 1;
    expect(DEFAULT_RULES[0]?.weight).toBe(28);
  });

  it('clampThresholds mantiene el bloqueo 5 puntos sobre la revisión', () => {
    expect(clampThresholds(90, 50)).toEqual({ reviewAt: 80, blockAt: 85 });
    expect(clampThresholds(0, 200)).toEqual({ reviewAt: 10, blockAt: 100 });
    expect(clampThresholds(Number.NaN, Number.NaN)).toEqual({
      reviewAt: REVIEW_AT,
      blockAt: BLOCK_AT,
    });
  });

  it('normalizePolicy tolera basura y respeta valores válidos', () => {
    expect(normalizePolicy(null)).toEqual(defaultPolicy());
    expect(normalizePolicy('x')).toEqual(defaultPolicy());
    const p = normalizePolicy({
      rules: [{ id: 'geo', weight: 99, enabled: false }, { id: 'nope' }, null, 3],
      reviewAt: 30,
      blockAt: 31,
    });
    const geo = p.rules.find((r) => r.id === ('geo' as RuleId));
    expect(geo).toMatchObject({ weight: 48, enabled: false, name: 'Geo imposible' });
    expect(p.rules).toHaveLength(10);
    expect(p).toMatchObject({ reviewAt: 30, blockAt: 35 });
  });
});
