# Satark API. Build from the repository root (the API imports the shared package):
#   docker build -f backend/Dockerfile -t satark-api .
FROM node:22-bookworm-slim

# Chromium renders the Complaint Kit PDF (Telugu and Devanagari shaping).
# tini runs as PID 1: it forwards stop signals and reaps Chromium's exited child processes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-ui-core ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
ENV CHROME_PATH=/usr/bin/chromium NODE_ENV=production

WORKDIR /app
COPY package.json package-lock.json ./
# Every workspace manifest, so npm can resolve the lockfile; only the API's dependencies are installed.
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY dashboard/package.json dashboard/
COPY mobile/package.json mobile/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY shared shared
COPY backend backend
WORKDIR /app/backend
# Compile the TypeScript once, here, so the server starts with plain `node` (no npx, no
# compiler in memory). .data holds Complaint Kits when S3 is not configured.
RUN node build.mjs \
  && mkdir -p .data \
  && chown -R node:node .data

USER node
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/server.mjs"]
