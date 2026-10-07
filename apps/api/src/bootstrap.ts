import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { loadConfig, type AppConfig } from './config';

/** Socket.IO con la misma lista de orígenes permitidos que HTTP. */
class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly origins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, { ...options, cors: { origin: this.origins } });
  }
}

export async function createApp(config: AppConfig = loadConfig()): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigins });
  app.useWebSocketAdapter(new CorsIoAdapter(app, config.corsOrigins));
  app.enableShutdownHooks();
  return app;
}

export async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);
  await app.listen(config.port);
  new Logger('CENTINELA').log(`API en http://localhost:${config.port}/api · socket /desk`);
}
