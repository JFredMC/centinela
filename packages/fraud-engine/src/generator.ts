import { findProfile, REGULAR_CUSTOMERS } from './profiles';
import type { Channel, Origin, Profile, RawTxn, ScenarioKind } from './types';

export type NextId = () => string;

/** Generador de ids `TX-…` deterministas a partir de un cursor. */
export function idSequence(start: number): { next: NextId; cursor: () => number } {
  let c = start;
  return {
    next: () => {
      c += 17;
      return `TX-${c.toString(36).toUpperCase()}`;
    },
    cursor: () => c,
  };
}

interface Shop {
  mcc: string;
  mccLabel: string;
  merchant: string;
}

const SAFE: readonly Shop[] = [
  { mcc: '5411', mccLabel: 'Supermercado', merchant: 'Éxito Poblado' },
  { mcc: '5411', mccLabel: 'Supermercado', merchant: 'D1 Laureles' },
  { mcc: '5541', mccLabel: 'Combustible', merchant: 'Terpel Las Palmas' },
  { mcc: '5812', mccLabel: 'Restaurante', merchant: 'Hatoviejo' },
  { mcc: '4111', mccLabel: 'Transporte', merchant: 'Metro de Medellín' },
  { mcc: '5651', mccLabel: 'Moda', merchant: 'Arturo Calle' },
  { mcc: '5912', mccLabel: 'Farmacia', merchant: 'La Rebaja' },
  { mcc: '7832', mccLabel: 'Cine', merchant: 'Procinal Santa Fe' },
  { mcc: '5211', mccLabel: 'Ferretería', merchant: 'Homecenter' },
  { mcc: '4511', mccLabel: 'Aerolínea', merchant: 'Avianca' },
];

const CRYPTO: Shop = { mcc: '6051', mccLabel: 'Cripto', merchant: 'Orion Exchange' };
const JEWELRY: Shop = { mcc: '5094', mccLabel: 'Joyería', merchant: 'Joyas Andinas' };
const TRANSFER: Shop = {
  mcc: '6012',
  mccLabel: 'Transferencia',
  merchant: 'Transferencia inmediata',
};

const pick = <T>(list: readonly T[], n: number): T => list[Math.abs(n) % list.length] as T;

/** Pseudoaleatorio estable en [0, 1). */
export function unit(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Las 02:40:12 hora Colombia más recientes que no superen `now`. */
export function bogotaNight(now: number): number {
  const shifted = new Date(now - 5 * 3_600_000);
  shifted.setUTCHours(2, 40, 12, 0);
  let ts = shifted.getTime() + 5 * 3_600_000;
  if (ts > now) ts -= 24 * 3_600_000;
  return ts;
}

type Patch = Partial<RawTxn> & Pick<RawTxn, 'amount' | 'channel' | 'origin'> & Shop;

function base(nextId: NextId, profile: Profile, now: number, patch: Patch): RawTxn {
  return {
    id: nextId(),
    enqueuedAt: now,
    ts: now,
    customerId: profile.id,
    customer: profile.name,
    segment: profile.segment,
    city: profile.homeCity,
    country: 'CO',
    device: profile.devices[0] ?? 'Dispositivo habitual',
    beneficiaryNew: false,
    cardPresent: patch.channel === 'POS' || patch.channel === 'ATM',
    ...patch,
  };
}

const regular = (profiles: readonly Profile[], n: number) =>
  pick(profiles.slice(0, REGULAR_CUSTOMERS), n);

/** Movimiento cotidiano, sin señales de riesgo. */
export function cleanTxn(
  nextId: NextId,
  profiles: readonly Profile[],
  now: number,
  n: number,
): RawTxn {
  const profile = regular(profiles, n);
  const channel: Channel = n % 6 === 0 ? 'WALLET' : n % 9 === 0 ? 'TRANSFER' : 'POS';
  const amount = Math.max(8_000, Math.round((profile.avg * (0.42 + unit(n) * 0.85)) / 1000) * 1000);
  return base(nextId, profile, now, { ...pick(SAFE, n), amount, channel, origin: 'canal' });
}

/** Movimiento con una sola señal leve (joyería, navegador nuevo o monto alto). */
export function mildTxn(
  nextId: NextId,
  profiles: readonly Profile[],
  now: number,
  n: number,
): RawTxn {
  const profile = regular(profiles, n);
  const kind = Math.abs(n) % 3;
  if (kind === 0) {
    return base(nextId, profile, now, {
      ...JEWELRY,
      amount: Math.round(profile.avg * 1.1),
      channel: 'POS',
      origin: 'canal',
    });
  }
  if (kind === 1) {
    return base(nextId, profile, now, {
      ...pick(SAFE, n + 3),
      amount: Math.round(profile.avg * 0.8),
      channel: 'ECOM',
      origin: 'canal',
      device: 'Navegador no reconocido',
    });
  }
  return base(nextId, profile, now, {
    mcc: '5411',
    mccLabel: 'Supermercado',
    merchant: 'Éxito Mayorista',
    amount: 8_200_000,
    channel: 'POS',
    origin: 'canal',
  });
}

/** Un movimiento sospechoso suelto, de uno de los cuatro patrones. */
export function hotTxn(
  nextId: NextId,
  profiles: readonly Profile[],
  now: number,
  variant: number,
): RawTxn {
  const v = ((variant % 4) + 4) % 4;
  if (v === 0) {
    return base(nextId, findProfile(profiles, 'c-est'), now, {
      ...TRANSFER,
      amount: 9_900_000,
      channel: 'TRANSFER',
      origin: 'estructura',
      beneficiaryNew: true,
    });
  }
  if (v === 1) {
    return base(nextId, findProfile(profiles, 'c3'), now, {
      mcc: '7011',
      mccLabel: 'Hotel',
      merchant: 'Hotel Biscayne',
      amount: 3_200_000,
      channel: 'ECOM',
      origin: 'viaje',
      city: 'Miami',
      country: 'US',
      device: 'Navegador no reconocido',
    });
  }
  if (v === 2) {
    return base(nextId, findProfile(profiles, 'c-muleo'), now, {
      ...TRANSFER,
      merchant: 'Billetera · tercero',
      amount: 3_400_000,
      channel: 'WALLET',
      origin: 'muleo',
      beneficiaryNew: true,
    });
  }
  return base(nextId, findProfile(profiles, 'c-cripto'), now, {
    ...CRYPTO,
    amount: 11_400_000,
    channel: 'ECOM',
    origin: 'cripto',
    device: 'Navegador no reconocido',
    ts: bogotaNight(now),
  });
}

/** Tráfico de fondo: 1 de cada 11 sospechoso, 1 de cada 7 leve, el resto limpio. */
export function spawnTxn(
  nextId: NextId,
  profiles: readonly Profile[],
  now: number,
  n: number,
): RawTxn {
  if (n % 11 === 0) return hotTxn(nextId, profiles, now, n);
  if (n % 7 === 0) return mildTxn(nextId, profiles, now, n);
  return cleanTxn(nextId, profiles, now, n);
}

export const SCENARIOS: readonly { kind: ScenarioKind; label: string; notice: string }[] = [
  {
    kind: 'viaje',
    label: 'Viaje imposible',
    notice: 'Viaje imposible en la cola. El segundo movimiento cae en otro país.',
  },
  {
    kind: 'muleo',
    label: 'Muleo',
    notice: 'Ráfaga de muleo en la cola. La velocidad sube con cada envío.',
  },
  {
    kind: 'estructura',
    label: 'Estructuración',
    notice: 'Tres montos bajo el umbral de $10 millones entraron a la cola.',
  },
  {
    kind: 'cripto',
    label: 'Cripto de madrugada',
    notice: 'Compra cripto de madrugada en la cola.',
  },
];

/** Lote de movimientos que reproduce un patrón de fraude conocido. */
export function buildScenario(
  kind: ScenarioKind,
  nextId: NextId,
  profiles: readonly Profile[],
  now: number,
): RawTxn[] {
  const at = (ts: number) => ({ ts, enqueuedAt: now });
  if (kind === 'viaje') {
    const p = findProfile(profiles, 'c-viaje');
    return [
      base(nextId, p, now, {
        ...pick(SAFE, 0),
        amount: 86_000,
        channel: 'POS',
        origin: 'viaje',
        ...at(now - 4 * 60_000),
      }),
      base(nextId, p, now, {
        mcc: '7011',
        mccLabel: 'Hotel',
        merchant: 'Hotel Biscayne',
        amount: 6_400_000,
        channel: 'ECOM',
        origin: 'viaje',
        city: 'Miami',
        country: 'US',
        device: 'Safari · dispositivo nuevo',
        ...at(now),
      }),
    ];
  }
  if (kind === 'muleo') {
    const p = findProfile(profiles, 'c-muleo');
    return [720_000, 680_000, 2_400_000, 3_100_000].map((amount, i) =>
      base(nextId, p, now, {
        ...TRANSFER,
        merchant: `Billetera · destino ${i + 1}`,
        amount,
        channel: 'WALLET',
        origin: 'muleo' as Origin,
        beneficiaryNew: true,
        ...at(now + i * 15_000),
      }),
    );
  }
  if (kind === 'estructura') {
    const p = findProfile(profiles, 'c-est');
    return [
      { amount: 9_800_000, age: 70 },
      { amount: 9_750_000, age: 40 },
      { amount: 9_900_000, age: 5 },
    ].map((item) =>
      base(nextId, p, now, {
        ...TRANSFER,
        amount: item.amount,
        channel: 'TRANSFER',
        origin: 'estructura',
        beneficiaryNew: true,
        ...at(now - item.age * 60_000),
      }),
    );
  }
  const p = findProfile(profiles, 'c-cripto');
  const night = bogotaNight(now);
  return [
    base(nextId, p, now, {
      ...pick(SAFE, 2),
      amount: 42_000,
      channel: 'POS',
      origin: 'cripto',
      ...at(night - 8 * 60_000),
    }),
    base(nextId, p, now, {
      ...CRYPTO,
      amount: 11_400_000,
      channel: 'ECOM',
      origin: 'cripto',
      device: 'Navegador no reconocido',
      ...at(night),
    }),
  ];
}
