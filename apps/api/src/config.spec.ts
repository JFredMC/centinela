import { loadConfig } from './config';

describe('loadConfig', () => {
  it('valores por defecto', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      redisUrl: 'redis://localhost:6379',
      corsOrigins: ['http://localhost:4200'],
      actionsPerSecond: 20,
    });
  });
  it('lee el entorno', () => {
    const c = loadConfig({
      PORT: '8080',
      CORS_ORIGINS: 'https://a.com, https://b.com',
      ACTIONS_PER_SECOND: '5',
    });
    expect(c).toMatchObject({
      port: 8080,
      corsOrigins: ['https://a.com', 'https://b.com'],
      actionsPerSecond: 5,
    });
    expect(loadConfig({ PORT: 'x' }).port).toBe(3000);
  });
});
