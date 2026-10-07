import type { Decision, Profile, RawTxn, Segment } from './types';

interface Person {
  id: string;
  name: string;
  segment: Segment;
  homeCity: string;
  avg: number;
  device: string;
}

/** Clientes ficticios. Los cuatro últimos protagonizan los escenarios. */
export const PEOPLE: readonly Person[] = [
  {
    id: 'c1',
    name: 'Laura Giraldo',
    segment: 'Nómina',
    homeCity: 'Medellín',
    avg: 180_000,
    device: 'iPhone · Laura',
  },
  {
    id: 'c2',
    name: 'Juan Pablo Mejía',
    segment: 'Nómina',
    homeCity: 'Bogotá',
    avg: 240_000,
    device: 'Android · Juan Pablo',
  },
  {
    id: 'c3',
    name: 'Mariana Castaño',
    segment: 'Preferencial',
    homeCity: 'Medellín',
    avg: 1_700_000,
    device: 'iPhone · Mariana',
  },
  {
    id: 'c4',
    name: 'Felipe Quintero',
    segment: 'Pyme',
    homeCity: 'Cali',
    avg: 2_100_000,
    device: 'POS sede Cali',
  },
  {
    id: 'c5',
    name: 'Daniela Ríos',
    segment: 'Nómina',
    homeCity: 'Barranquilla',
    avg: 150_000,
    device: 'Android · Daniela',
  },
  {
    id: 'c6',
    name: 'Sebastián Cardona',
    segment: 'Preferencial',
    homeCity: 'Bogotá',
    avg: 2_400_000,
    device: 'Mac · Sebastián',
  },
  {
    id: 'c7',
    name: 'Natalia Vélez',
    segment: 'Nómina',
    homeCity: 'Pereira',
    avg: 190_000,
    device: 'Android · Natalia',
  },
  {
    id: 'c8',
    name: 'Tomás Arango',
    segment: 'Pyme',
    homeCity: 'Bucaramanga',
    avg: 1_900_000,
    device: 'POS Cabecera',
  },
  {
    id: 'c9',
    name: 'Isabella Londoño',
    segment: 'Preferencial',
    homeCity: 'Cartagena',
    avg: 1_500_000,
    device: 'iPhone · Isabella',
  },
  {
    id: 'c10',
    name: 'Mateo Cárdenas',
    segment: 'Nómina',
    homeCity: 'Manizales',
    avg: 130_000,
    device: 'Android · Mateo',
  },
  {
    id: 'c11',
    name: 'Sofía Bedoya',
    segment: 'Pyme',
    homeCity: 'Medellín',
    avg: 2_600_000,
    device: 'POS Envigado',
  },
  {
    id: 'c12',
    name: 'Ricardo Palacio',
    segment: 'Nómina',
    homeCity: 'Bogotá',
    avg: 210_000,
    device: 'Android · Ricardo',
  },
  {
    id: 'c-viaje',
    name: 'Camila Restrepo',
    segment: 'Nómina',
    homeCity: 'Medellín',
    avg: 160_000,
    device: 'iPhone · Camila',
  },
  {
    id: 'c-muleo',
    name: 'Andrés Muñoz',
    segment: 'Nómina',
    homeCity: 'Bogotá',
    avg: 200_000,
    device: 'Android · Andrés',
  },
  {
    id: 'c-est',
    name: 'Valentina Ospina',
    segment: 'Pyme',
    homeCity: 'Cali',
    avg: 2_200_000,
    device: 'POS Chipichape',
  },
  {
    id: 'c-cripto',
    name: 'Santiago Herrera',
    segment: 'Preferencial',
    homeCity: 'Medellín',
    avg: 1_600_000,
    device: 'Mac · Santiago',
  },
];

/** Cuántos clientes del inicio de la lista generan tráfico normal. */
export const REGULAR_CUSTOMERS = 12;

export function seedProfiles(): Profile[] {
  return PEOPLE.map((p) => ({
    id: p.id,
    name: p.name,
    segment: p.segment,
    homeCity: p.homeCity,
    avg: p.avg,
    devices: [p.device],
    lastCity: p.homeCity,
    lastCountry: 'CO',
    lastTs: 0,
    recent: [],
  }));
}

export function findProfile(profiles: readonly Profile[], id: string): Profile {
  const found = profiles.find((p) => p.id === id);
  if (!found) throw new Error(`Cliente desconocido: ${id}`);
  return found;
}

const WINDOW = 30 * 60_000;

/**
 * Actualiza el perfil tras decidir un movimiento. Solo aprende dispositivos de movimientos
 * autorizados y nunca retrocede la última ubicación con un movimiento más viejo.
 */
export function remember(profile: Profile, txn: RawTxn, decision: Decision): Profile {
  const anchor = Math.max(profile.lastTs, txn.ts);
  const learnDevice = decision === 'allow' && !profile.devices.includes(txn.device);
  const movedForward = txn.ts >= profile.lastTs;
  return {
    ...profile,
    devices: learnDevice ? [...profile.devices, txn.device].slice(-5) : profile.devices,
    lastCity: movedForward ? txn.city : profile.lastCity,
    lastCountry: movedForward ? txn.country : profile.lastCountry,
    lastTs: anchor,
    recent: [...profile.recent, txn.ts]
      .filter((t) => t <= anchor && anchor - t <= WINDOW)
      .slice(-12),
  };
}
