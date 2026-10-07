/** Configuración por variables de entorno, con valores seguros para desarrollo local. */
export interface AppConfig {
  port: number;
  redisUrl: string;
  corsOrigins: string[];
  /** Acciones por segundo permitidas a cada socket. */
  actionsPerSecond: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env['PORT'] ?? 3000);
  return {
    port: Number.isInteger(port) && port > 0 ? port : 3000,
    redisUrl: env['REDIS_URL'] ?? 'redis://localhost:6379',
    corsOrigins: (env['CORS_ORIGINS'] ?? 'http://localhost:4200')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    actionsPerSecond: Math.max(1, Number(env['ACTIONS_PER_SECOND'] ?? 20) || 20),
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
export const TXN_QUEUE = 'transactions';
