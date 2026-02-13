FROM node:20-alpine AS base
RUN npm i -g pnpm@9

# ── Install dependencies ─────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter api --filter @shared/types

# ── Build ────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN cd packages/shared && pnpm build 2>/dev/null || true
RUN cd apps/api && npx prisma generate && pnpm build

# ── Run ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/apps/api/package.json ./

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
EXPOSE 4000
