/** Cubeta de fichas simple por cliente. */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly perSecond: number,
    private readonly now: () => number = Date.now,
  ) {}

  take(key: string): boolean {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.perSecond, at: t };
    b.tokens = Math.min(this.perSecond, b.tokens + ((t - b.at) / 1000) * this.perSecond);
    b.at = t;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    return ok;
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }
}
