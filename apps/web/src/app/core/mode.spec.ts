import { MODE_KEY, resolveMode } from './mode';

describe('resolveMode', () => {
  beforeEach(() => localStorage.clear());

  it('sin API siempre es demo', () => {
    expect(resolveMode(null, localStorage, '?mode=api')).toBe('demo');
  });

  it('con API: query manda y se recuerda; por defecto demo', () => {
    expect(resolveMode('http://x', localStorage, '')).toBe('demo');
    expect(resolveMode('http://x', localStorage, '?mode=api')).toBe('api');
    expect(localStorage.getItem(MODE_KEY)).toBe('api');
    expect(resolveMode('http://x', localStorage, '')).toBe('api');
    expect(resolveMode('http://x', localStorage, '?mode=demo')).toBe('demo');
    expect(resolveMode('http://x', localStorage, '?mode=raro')).toBe('demo');
  });
});
