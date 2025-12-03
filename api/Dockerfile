# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable
RUN apk add --no-cache openssl

# Install deps
COPY package.json pnpm-lock.yaml* ./
# Install dependencies (lockfile pode não existir no contexto da API)
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate prisma client & build
RUN npx prisma generate
RUN pnpm build

# Production image
FROM node:20-alpine AS prod
WORKDIR /app
RUN corepack enable
RUN apk add --no-cache curl openssl postgresql-client
COPY --from=build /app/package.json /app/pnpm-lock.yaml* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3333
EXPOSE 3333
# Run migrations then start
CMD ["sh", "-c", "echo '🔄 Waiting for database readiness...'; for i in $(seq 1 15); do pg_isready -h db -U postgres && break || { echo 'DB not ready, retry #'$i; sleep 2; }; done; echo '🚀 Running migrations...'; npx prisma migrate deploy; echo '✅ Starting API'; node dist/server.js"]
