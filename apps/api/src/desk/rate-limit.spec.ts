import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('limita por segundo y recarga con el tiempo', () => {
    let now = 0;
    const r = new RateLimiter(2, () => now);
    expect(r.take('a')).toBe(true);
    expect(r.take('a')).toBe(true);
    expect(r.take('a')).toBe(false);
    expect(r.take('b')).toBe(true);
    now += 600;
    expect(r.take('a')).toBe(true);
    r.forget('a');
    expect(r.take('a')).toBe(true);
  });
});
