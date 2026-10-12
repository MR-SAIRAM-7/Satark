# Satark police dashboard. Build from the repository root:
#   docker build -f dashboard/Dockerfile -t satark-dashboard .
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY dashboard/package.json dashboard/
COPY mobile/package.json mobile/
RUN npm ci --workspace dashboard --include-workspace-root=false --ignore-scripts
COPY shared shared
COPY dashboard dashboard
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build --workspace dashboard

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/dashboard/.next/standalone ./
COPY --from=build /app/dashboard/.next/static ./dashboard/.next/static
COPY --from=build /app/dashboard/public ./dashboard/public
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "dashboard/server.js"]
