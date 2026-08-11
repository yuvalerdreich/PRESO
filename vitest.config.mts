import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

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
        plugins: [react()],
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
