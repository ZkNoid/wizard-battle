# syntax=docker/dockerfile:1.7
FROM node:23-slim
LABEL maintainer="a.scherbatyuk@gmail.com"

ARG MONGODB_URI
ARG MONGODB_DB
ARG APP_PORT
ARG REDIS_URL
ARG WEBSOCKET_URL
ARG SPELL_CAST_TIMEOUT
ARG MINA_NETWORK_URL
ARG MINA_ADMIN_PRIVATE_KEY
ARG MINA_CONTRACT_ADDRESS
ARG BULLMQ_REDIS_HOST
ARG BULLMQ_REDIS_PORT
ARG EVM_RPC_URL
ARG GAME_SIGNER_PUBLIC_KEY
ARG GAME_SIGNER_PRIVATE_KEY
ARG GAME_REGISTRY_ADDRESS
ARG WB_RESOURCES_ADDRESS
ARG WB_CHARACTER_ADDRESS
ARG WB_COINS_ADDRESS
ARG WB_ITEMS_ADDRESS
ARG GAME_MARKET_ADDRESS
ARG RPC_WS_URL
ARG GAME_MARKET_DEPLOYMENT_BLOCK
ARG TOURNAMENT_APP_PORT
ARG TOURNAMENT_CONTRACT_ADDRESS
ARG TOURNAMENT_REDIS_URL
ARG TOURNAMENT_ADMIN_PRIVATE_KEY
ARG MINA_GRAPHQL_URL
ARG MINA_ARCHIVE_URL

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1
ENV PNPM_STORE_DIR=/pnpm/store

# Runtime OS deps. node:slim already includes node + npm, so we only need:
#  - python3/build-essential: native module compilation (gyp)
#  - cron: required for the in-container scheduler
#  - netcat-openbsd, nano: kept for parity with the previous image
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        python3 \
        build-essential \
        cron \
        netcat-openbsd \
        nano \
    && rm -rf /var/lib/apt/lists/*

# pnpm via corepack matches the version pinned in package.json (10.13.1).
# pm2 stays global because the runtime CMD relies on `pm2 resurrect`.
RUN corepack enable \
    && corepack prepare pnpm@10.13.1 --activate \
    && npm install -g pm2@latest \
    && pm2 install pm2-logrotate \
    && pm2 set pm2-logrotate:retain 7 \
    && pm2 set pm2-logrotate:max_size 10M \
    && pm2 set pm2-logrotate:compress true \
    && pm2 set pm2-logrotate:workerInterval 1800

WORKDIR /usr/share/nestjs/main

# Copy lockfile + workspace manifests first so the pnpm install layer is
# cached as long as no dependency manifest changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/common/package.json ./apps/common/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/mina-contracts/package.json ./apps/mina-contracts/package.json
COPY packages/dev-auth/package.json ./packages/dev-auth/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

# Install only what backend (+ workspace deps) needs.
# Skipping the frontend dependency tree (Next.js, Phaser, wagmi, viem, ...)
# saves a large amount of install time since the frontend ships from Vercel.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm install --filter=backend... --frozen-lockfile

# Now bring in the rest of the source. This layer only invalidates when source
# files change, not when dependency manifests change.
COPY . .

# Write the runtime env file. This layer reruns whenever any build secret
# changes, but it does not invalidate the much heavier install layer above.
RUN <<EOF
set -e
cat > /usr/share/nestjs/main/.env <<ENVEOT
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}
APP_PORT=${APP_PORT}
REDIS_URL=${REDIS_URL}
WEBSOCKET_URL=${WEBSOCKET_URL}
SPELL_CAST_TIMEOUT=${SPELL_CAST_TIMEOUT}
MINA_NETWORK_URL=${MINA_NETWORK_URL}
MINA_ADMIN_PRIVATE_KEY=${MINA_ADMIN_PRIVATE_KEY}
MINA_CONTRACT_ADDRESS=${MINA_CONTRACT_ADDRESS}
BULLMQ_REDIS_HOST=${BULLMQ_REDIS_HOST}
BULLMQ_REDIS_PORT=${BULLMQ_REDIS_PORT}
EVM_RPC_URL=${EVM_RPC_URL}
GAME_SIGNER_PUBLIC_KEY=${GAME_SIGNER_PUBLIC_KEY}
GAME_SIGNER_PRIVATE_KEY=${GAME_SIGNER_PRIVATE_KEY}
GAME_REGISTRY_ADDRESS=${GAME_REGISTRY_ADDRESS}
WB_RESOURCES_ADDRESS=${WB_RESOURCES_ADDRESS}
WB_CHARACTER_ADDRESS=${WB_CHARACTER_ADDRESS}
WB_COINS_ADDRESS=${WB_COINS_ADDRESS}
WB_ITEMS_ADDRESS=${WB_ITEMS_ADDRESS}
GAME_MARKET_ADDRESS=${GAME_MARKET_ADDRESS}
RPC_WS_URL=${RPC_WS_URL}
GAME_MARKET_DEPLOYMENT_BLOCK=${GAME_MARKET_DEPLOYMENT_BLOCK}
TOURNAMENT_APP_PORT=${TOURNAMENT_APP_PORT:-3032}
TOURNAMENT_CONTRACT_ADDRESS=${TOURNAMENT_CONTRACT_ADDRESS}
TOURNAMENT_REDIS_URL=${TOURNAMENT_REDIS_URL:-redis://redis-tournament:6379}
TOURNAMENT_ADMIN_PRIVATE_KEY=${TOURNAMENT_ADMIN_PRIVATE_KEY}
MINA_GRAPHQL_URL=${MINA_GRAPHQL_URL}
MINA_ARCHIVE_URL=${MINA_ARCHIVE_URL}
ENVEOT
mkdir -p /usr/share/nestjs/main/apps/backend /usr/share/nestjs/main/apps/frontend
cp /usr/share/nestjs/main/.env /usr/share/nestjs/main/apps/backend/.env
cp /usr/share/nestjs/main/.env /usr/share/nestjs/main/apps/frontend/.env
EOF

# Build only the backend (and its workspace deps via `...`).
# Turbo cache lives in node_modules/.cache/turbo by default; mounting it as
# a build cache lets repeated builds skip unchanged tasks.
RUN --mount=type=cache,id=turbo,target=/usr/share/nestjs/main/node_modules/.cache/turbo \
    pnpm turbo run build --filter=backend...

# Runtime scratch dirs (mounted as a docker volume in compose).
RUN mkdir -p /usr/share/temp/log /usr/share/temp/tmp /usr/share/temp/public \
    && chmod -R 775 /usr/share/temp

# Bake PM2 process list into the dump file so `pm2 resurrect` picks it up
# on container start. The forked processes themselves do not survive the
# RUN layer; only the dump file matters.
RUN pm2 install pm2-server-monit \
    && pm2 set pm2-server-monit:threshold 80 \
    && pm2 start apps/backend/dist/backend/src/main.js --name nestjs-app --instances 1 --max-memory-restart 1G --env production \
    && pm2 start apps/backend/dist/backend/src/main-tournament.js --name tournament-app --instances 1 --max-memory-restart 4G --env production \
    && sleep 5 \
    && pm2 save

RUN cat > /usr/local/bin/start-pm2.sh <<'EOL'
#!/bin/bash
pm2 resurrect
tail -f /dev/null
EOL
RUN chmod +x /usr/local/bin/start-pm2.sh

VOLUME ["/temp"]
CMD ["/usr/local/bin/start-pm2.sh"]
