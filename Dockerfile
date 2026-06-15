# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
# Debian-based image so better-sqlite3 can compile its native addon reliably.
FROM node:22-slim AS build
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# SvelteKit's post-build analyse step imports server modules (which open the
# DB), so a DATABASE_URL must exist at build time. This file is throwaway and
# never ends up in the runtime image.
ENV DATABASE_URL=/tmp/build.db
RUN npm run build \
	&& npm prune --omit=dev

# ---- Runtime stage ---------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# SQLite lives on a mounted volume so data survives container recreation.
ENV DATABASE_URL=/data/punisher.db

# App bundle, production deps (incl. compiled better-sqlite3), and migrations.
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/drizzle ./drizzle

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000

# adapter-node entrypoint. Migrations + seed run automatically on startup.
CMD ["node", "build"]
