# Satark API. Build from the repository root (the API imports the shared package):
#   docker build -f backend/Dockerfile -t satark-api .
FROM node:22-bookworm-slim

# Chromium renders the Complaint Kit PDF (Telugu and Devanagari shaping).
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-ui-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV CHROME_PATH=/usr/bin/chromium NODE_ENV=production

WORKDIR /app
COPY package.json package-lock.json ./
# Every workspace manifest, so npm can resolve the lockfile; only the API's dependencies are installed.
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY dashboard/package.json dashboard/
COPY mobile/package.json mobile/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev --ignore-scripts

COPY shared shared
COPY backend backend
WORKDIR /app/backend
EXPOSE 8000
CMD ["npx", "tsx", "src/server.ts"]
