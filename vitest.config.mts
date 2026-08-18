import { basename } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Next turns `import logo from '…/logo.png'` into a `StaticImageData` object — `{ src, width,
 * height }` — and `next/image` throws without those dimensions. Vite resolves the same import to a
 * plain URL string, so any component rendering a statically-imported image fails in jsdom for a
 * reason that has nothing to do with the component. This gives the import Next's shape.
 */
const staticImageImports: Plugin = {
  name: 'static-image-import-stub',
  enforce: 'pre',
  load(id) {
    const file = id.split('?')[0];
    if (!/\.(png|jpe?g|webp|avif|gif)$/i.test(file)) return null;

    const src = `/${basename(file)}`;
    return `export default { src: ${JSON.stringify(src)}, width: 512, height: 512, blurWidth: 0, blurHeight: 0 };`;
  },
};

/**
 * Two projects, because the two suites need different worlds:
 *
 *  unit — jsdom + React Testing Library. Pure logic (Zod schemas, the
 *         SQLSTATE→HTTP map, time helpers) and components. No network, no
 *         database; anything reaching for either belongs in `int`.
 *
 *  int  — node. Route handlers and server actions run against the *local*
 *         Supabase stack (`supabase start`). These are the tests that prove
 *         RLS scoping and the 201/409 contract from the caller's side.
 *
 * `resolve.tsconfigPaths` gives both projects the `@/*` alias from tsconfig.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        plugins: [react(), staticImageImports],
        resolve: { tsconfigPaths: true },
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup/unit.ts'],
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'int',
          environment: 'node',
          globals: true,
          setupFiles: ['./tests/setup/int.ts'],
          include: ['tests/int/**/*.test.ts'],
          // Integration tests share one database. Running files in parallel
          // would let one suite's fixtures race another's.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
