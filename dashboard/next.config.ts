import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const nextConfig: NextConfig = {
  // @satark/shared ships TypeScript source; the dashboard reuses its labels, rules and Kill Chain stages.
  transpilePackages: ['@satark/shared'],
  turbopack: { root },
  output: 'standalone',
  poweredByHeader: false,
  // react-leaflet layers do not survive React's development-only double mount (Strict Mode).
  reactStrictMode: false,
};

export default nextConfig;
