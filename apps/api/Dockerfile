# syntax=docker/dockerfile:1
# Imagen de la API. Se construye desde la raíz del monorepo: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/fraud-engine/package.json packages/fraud-engine/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @centinela/api...
COPY packages/fraud-engine packages/fraud-engine
COPY apps/api apps/api
RUN pnpm --filter @centinela/fraud-engine build \
  && pnpm --filter @centinela/api build \
  && pnpm --filter @centinela/api deploy --prod --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
