import { seedProfiles } from './profiles';
import type { Profile, RawTxn } from './types';

/** 2026-10-07 15:00 hora Colombia (20:00 UTC). */
export const NOON = Date.UTC(2026, 9, 7, 20, 0, 0);

export function profile(over: Partial<Profile> = {}): Profile {
  return { ...(seedProfiles()[0] as Profile), ...over };
}

export function txn(over: Partial<RawTxn> = {}): RawTxn {
  return {
    id: 'TX-1',
    enqueuedAt: NOON,
    ts: NOON,
    customerId: 'c1',
    customer: 'Laura Giraldo',
    segment: 'Nómina',
    amount: 150_000,
    channel: 'POS',
    mcc: '5411',
    mccLabel: 'Supermercado',
    merchant: 'Éxito Poblado',
    city: 'Medellín',
    country: 'CO',
    device: 'iPhone · Laura',
    beneficiaryNew: false,
    cardPresent: true,
    origin: 'canal',
    ...over,
  };
}
