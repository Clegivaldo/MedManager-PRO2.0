# syntax=docker/dockerfile:1
FROM node:20-slim AS build
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable
# Installing build dependencies required for native modules (libxmljs2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential python3 python3-dev libxml2-dev libxslt1-dev pkg-config zlib1g-dev curl openssl \
	&& rm -rf /var/lib/apt/lists/*

# Install deps
COPY package.json pnpm-lock.yaml* ./
# Dummy DB URL for postinstall scripts
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
# Install dependencies (lockfile pode não existir no contexto da API)
RUN pnpm install --no-frozen-lockfile
RUN [ -x "$(command -v python3)" ] && ln -sf "$(command -v python3)" /usr/bin/python || true
# Rebuild native modules (ensure xmljs.node is built in build stage)
RUN corepack enable && pnpm rebuild --reporter=append-only || true

# Copy source
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate prisma client & build
RUN rm -rf node_modules/.prisma node_modules/@prisma 2>/dev/null || true
RUN rm -rf .pnpm-store 2>/dev/null || true
RUN pnpm exec prisma generate
RUN rm -rf dist && pnpm build
RUN echo "DEBUG: Build completed at $(date)" && ls -la dist/routes/user.routes.js

# Sanity check: ensure decrypt() is present in compiled tenant middleware
# This prevents accidental builds with stale code that doesn't decrypt passwords
RUN test -f dist/middleware/tenantMiddleware.js \
	&& grep -q "decrypt(tenant.databasePassword)" dist/middleware/tenantMiddleware.js \
	|| (echo 'Build sanity check failed: decrypt() missing in dist/middleware/tenantMiddleware.js' \
		&& sed -n '1,80p' dist/middleware/tenantMiddleware.js \
		&& exit 1)

# Ensure tenant-prisma includes decrypt fallback when building custom credentials
RUN test -f dist/lib/tenant-prisma.js \
	&& grep -q "decrypt(" dist/lib/tenant-prisma.js \
	|| (echo 'Build sanity check failed: decrypt() missing in dist/lib/tenant-prisma.js' \
		&& sed -n '1,120p' dist/lib/tenant-prisma.js \
		&& exit 1)

# Production image
FROM node:20-slim AS prod
WORKDIR /app
RUN corepack enable
# Runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
	curl openssl postgresql-client libxml2 libstdc++6 \
	&& rm -rf /var/lib/apt/lists/*

# Copy node_modules from build stage (includes native bindings compiled during build)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml* ./

# Copy built app and prisma schema
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

# Keep build tools in prod and rebuild native module at container startup
# (we'll run `pnpm rebuild` during container start to ensure bindings match runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential python3 python3-dev libxml2-dev libxslt1-dev pkg-config zlib1g-dev \
	&& ln -sf "$(command -v python3)" /usr/bin/python || true \
	&& rm -rf /var/lib/apt/lists/*

# Temporarily install Prisma CLI to run migrations in the final image,
# then remove it.
# Removed redundant migration step during build

ENV NODE_ENV=production
ENV PORT=3333
EXPOSE 3333
# Run migrations then start
CMD ["sh", "-c", "echo '🔄 Waiting for database readiness...'; for i in $(seq 1 15); do pg_isready -h db -U postgres && break || { echo 'DB not ready, retry #'$i; sleep 2; }; done; echo '🔄 Rebuilding native modules (libxmljs2)...'; corepack enable && pnpm rebuild libxmljs2 --reporter=append-only || pnpm rebuild --reporter=append-only || true; echo '🚀 Running migrations...'; npx prisma migrate deploy; echo '✅ Starting API'; node dist/server.js"]
