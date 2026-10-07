# @centinela/fraud-engine

Motor de reglas de CENTINELA en TypeScript puro: sin dependencias, sin `Date.now()` ni `Math.random()` ocultos, determinista y serializable. Lo comparten el modo demo del navegador y el worker de BullMQ del backend.

- `evaluate(txn, profile, policy)`: 10 reglas con peso, puntaje 0-100 y decisión (`allow`, `review`, `block`).
- `normalizePolicy(unknown)`: valida pesos (0-48) y umbrales (revisión 10-80, bloqueo ≥ revisión + 5).
- `createDesk` / `tick` / `inject` / `resolve`: la mesa completa como máquina de estados pura (cola, 5 etapas, alertas).
- Escenarios: viaje imposible, muleo, estructuración y cripto de madrugada.

```bash
pnpm --filter @centinela/fraud-engine test
```
