# CENTINELA

Mesa de detección de fraude en tiempo real. Cada movimiento entra a una cola, un worker lo enriquece, evalúa reglas y calcula un puntaje de riesgo de 0 a 100. Si supera el umbral, la alerta llega al panel del analista.

> En construcción. Monorepo pnpm: `packages/fraud-engine` (motor de reglas), `apps/web` (Angular) y `apps/api` (NestJS + BullMQ).

## Desarrollo

```bash
corepack enable
pnpm install
pnpm build && pnpm test
```

Hecho por [JFredDev](https://jfredmc.github.io/portfolio/) · Licencia MIT.
