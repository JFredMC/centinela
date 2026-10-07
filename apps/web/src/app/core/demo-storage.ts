import { createDesk, normalizePolicy, type DeskState } from '@centinela/fraud-engine';

export const STORAGE_KEY = 'centinela:desk:v1';

/**
 * Recupera la mesa guardada. Si no hay nada, o lo guardado no tiene la forma esperada,
 * arranca una mesa nueva. La política siempre pasa por `normalizePolicy`.
 */
export function loadDesk(storage: Storage | undefined, now: number): DeskState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return createDesk(now);
    const s = JSON.parse(raw) as Partial<DeskState>;
    const ok =
      Array.isArray(s.feed) &&
      Array.isArray(s.profiles) &&
      Array.isArray(s.queue) &&
      s.profiles.length > 0 &&
      typeof s.idCursor === 'number' &&
      typeof s.seq === 'number';
    if (!ok) return createDesk(now);
    return {
      ...(s as DeskState),
      policy: normalizePolicy(s.policy),
      running: s.running !== false,
      speed: s.speed === 'fast' ? 'fast' : 'normal',
      processing: null,
      notice: null,
      lastSpawn: now,
      // Lo que estaba a mitad de camino vuelve a la cola.
      queue: s.processing ? [s.processing.txn, ...(s.queue ?? [])] : (s.queue ?? []),
    };
  } catch {
    return createDesk(now);
  }
}

export function saveDesk(storage: Storage | undefined, s: DeskState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* sin cuota o modo privado: la demo sigue en memoria */
  }
}

export function clearDesk(storage: Storage | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
