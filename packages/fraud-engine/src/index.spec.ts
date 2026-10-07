import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from './index';

describe('fraud-engine', () => {
  it('exposes its version', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
