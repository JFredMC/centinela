import { createDesk, tick } from '@centinela/fraud-engine';
import { STORAGE_KEY, clearDesk, loadDesk, saveDesk } from './demo-storage';

const NOW = Date.UTC(2026, 9, 7, 20);

describe('demo-storage', () => {
  beforeEach(() => localStorage.clear());

  it('sin datos crea una mesa nueva', () => {
    expect(loadDesk(localStorage, NOW).feed).toHaveLength(14);
  });

  it('guarda y recupera, devolviendo a la cola lo que estaba en proceso', () => {
    let s = tick(createDesk(NOW), NOW + 1200);
    s = tick(s, NOW + 1201);
    expect(s.processing).not.toBeNull();
    saveDesk(localStorage, s);
    const back = loadDesk(localStorage, NOW + 5000);
    expect(back.processing).toBeNull();
    expect(back.queue[0]?.id).toBe(s.processing?.txn.id);
    expect(back.lastSpawn).toBe(NOW + 5000);
  });

  it('JSON roto o con otra forma vuelve a empezar', () => {
    localStorage.setItem(STORAGE_KEY, '{nope');
    expect(loadDesk(localStorage, NOW).feed).toHaveLength(14);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ feed: 'x' }));
    expect(loadDesk(localStorage, NOW).feed).toHaveLength(14);
  });

  it('normaliza la política guardada', () => {
    const s = createDesk(NOW);
    saveDesk(localStorage, { ...s, policy: { ...s.policy, reviewAt: 999, blockAt: -1 } });
    expect(loadDesk(localStorage, NOW).policy).toMatchObject({ reviewAt: 80, blockAt: 85 });
  });

  it('clearDesk borra', () => {
    saveDesk(localStorage, createDesk(NOW));
    clearDesk(localStorage);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('funciona sin storage', () => {
    expect(() => saveDesk(undefined, createDesk(NOW))).not.toThrow();
    expect(loadDesk(undefined, NOW).feed).toHaveLength(14);
  });
});
