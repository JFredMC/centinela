export type Channel = 'POS' | 'ECOM' | 'TRANSFER' | 'ATM' | 'WALLET';
export type Origin = 'canal' | 'viaje' | 'muleo' | 'estructura' | 'cripto';
export type Stage = 'ingest' | 'enrich' | 'rules' | 'score' | 'decide';
export type Decision = 'allow' | 'review' | 'block';
export type AnalystStatus = 'none' | 'open' | 'released' | 'confirmed' | 'escalated';
export type AnalystAction = Exclude<AnalystStatus, 'none' | 'open'>;
export type ScenarioKind = 'viaje' | 'muleo' | 'estructura' | 'cripto';
export type Segment = 'Nómina' | 'Pyme' | 'Preferencial';
export type RuleId =
  | 'monto'
  | 'velocidad'
  | 'geo'
  | 'noche'
  | 'mcc'
  | 'nuevo'
  | 'device'
  | 'pais'
  | 'estructura'
  | 'cnp';

export interface RuleConfig {
  id: RuleId;
  name: string;
  blurb: string;
  weight: number;
  enabled: boolean;
}

export interface Policy {
  rules: RuleConfig[];
  reviewAt: number;
  blockAt: number;
}

export interface Hit {
  id: RuleId;
  name: string;
  weight: number;
  evidence: string;
}

export interface Profile {
  id: string;
  name: string;
  segment: Segment;
  homeCity: string;
  /** Ticket medio en COP. */
  avg: number;
  devices: string[];
  lastCity: string;
  lastCountry: string;
  lastTs: number;
  /** Timestamps de movimientos recientes (ventana de 30 min). */
  recent: number[];
}

export interface RawTxn {
  id: string;
  enqueuedAt: number;
  ts: number;
  customerId: string;
  customer: string;
  segment: Segment;
  amount: number;
  channel: Channel;
  mcc: string;
  mccLabel: string;
  merchant: string;
  city: string;
  country: string;
  device: string;
  beneficiaryNew: boolean;
  cardPresent: boolean;
  origin: Origin;
}

export interface Verdict {
  score: number;
  hits: Hit[];
  decision: Decision;
}

export interface ScoredTxn extends RawTxn, Verdict {
  analyst: AnalystStatus;
  latencyMs: number;
  completedAt: number;
}
