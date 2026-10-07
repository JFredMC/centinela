import type { DeskState } from '@centinela/fraud-engine';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { loadConfig } from '../src/config';

/** Requiere Redis en REDIS_URL (en CI, un servicio redis:7). */
describe('API + BullMQ + Socket.IO (e2e)', () => {
  let app: INestApplication;
  let url: string;
  let socket: Socket;

  beforeAll(async () => {
    app = await createApp(loadConfig({ ...process.env, CORS_ORIGINS: 'http://localhost:4200' }));
    await app.listen(0);
    url = await app.getUrl();
    url = url.replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    socket?.disconnect();
    await app.close();
  });

  it('GET /api/health con Redis arriba', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', redis: 'up' });
  });

  it('GET /api/desk devuelve la mesa', async () => {
    const res = await request(app.getHttpServer()).get('/api/desk').expect(200);
    expect(res.body.feed.length).toBeGreaterThanOrEqual(14);
  });

  it('POST /api/desk/actions valida la acción', async () => {
    await request(app.getHttpServer()).post('/api/desk/actions').send({ type: 'nope' }).expect(400);
    await request(app.getHttpServer())
      .post('/api/desk/actions')
      .send({ type: 'toggleSpeed' })
      .expect(202);
  });

  it('socket: recibe estado, inyecta un escenario y ve la alerta puntuada por el worker', async () => {
    socket = io(`${url}/desk`, { transports: ['websocket'] });
    const states: DeskState[] = [];
    socket.on('state', (s: DeskState) => states.push(s));
    await new Promise<void>((resolve) => socket.once('state', () => resolve()));

    const bad = await socket.emitWithAck('action', { type: 'inject', kind: 'robo' });
    expect(bad).toEqual({ ok: false, error: 'Acción no válida.' });

    const startedAt = Date.now();
    const ack = await socket.emitWithAck('action', { type: 'inject', kind: 'viaje' });
    expect(ack).toEqual({ ok: true });

    const scored = await new Promise<DeskState['feed'][number]>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('sin alerta en 20 s')), 20_000);
      socket.on('state', (s: DeskState) => {
        const hit = s.feed.find(
          (x) => x.origin === 'viaje' && x.country === 'US' && x.enqueuedAt >= startedAt,
        );
        if (hit) {
          clearTimeout(t);
          resolve(hit);
        }
      });
    });
    expect(scored.decision).toBe('block');
    expect(scored.hits.map((h) => h.id)).toContain('geo');
    expect(states.some((s) => s.processing?.stage === 'rules')).toBe(true);
  });
});
