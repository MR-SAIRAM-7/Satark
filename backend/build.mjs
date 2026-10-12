/**
 * Production build: the API and the shared engine compiled into plain
 * JavaScript (dist/), so a server runs `node dist/server.mjs` with no
 * TypeScript compiler in memory and starts in well under a second.
 * npm packages stay external and load from node_modules as usual.
 *
 *   node build.mjs        (npm run build)
 */
import { rmSync } from 'node:fs';

import { build } from 'esbuild';

rmSync('dist', { recursive: true, force: true });

/** Bundle our own code, including the @satark/shared workspace (TypeScript source); leave every other package external. */
const externals = {
  name: 'externals',
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point' || args.path === '@satark/shared' || args.path.startsWith('@satark/shared/')) return undefined;
      return { path: args.path, external: true };
    });
  },
};

await build({
  entryPoints: { server: 'src/server.ts', seed: 'src/seed/cli.ts', 'twilio-check': 'src/scripts/twilio-check.ts' },
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  plugins: [externals],
});
