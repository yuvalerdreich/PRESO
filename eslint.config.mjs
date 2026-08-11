import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * The service-role client bypasses Row Level Security, which is the second and
 * final enforcement layer (ARCHITECTURE.md §3.3). A stray import of it silently
 * removes that layer, and no test would notice — the query simply succeeds.
 *
 * So it is confined by lint to the two callers that are machines rather than
 * users: the Supabase database webhook and the Vercel cron sweep
 * (TECHNICAL_DESIGN.md §1).
 */
const serviceRoleImportGuard = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: [
    "src/app/api/webhooks/**",
    "src/app/api/cron/**",
    "src/lib/supabase/admin.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/lib/supabase/admin", "@/lib/supabase/admin"],
            message:
              "The service-role client bypasses RLS. Import it only from app/api/webhooks/* or app/api/cron/*; everywhere else use lib/supabase/server, /route or /client.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  serviceRoleImportGuard,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated from the database schema by `npm run db:types`.
    "src/types/database.types.ts",
    // Test output.
    "playwright-report/**",
    "test-results/**",
    // The Supabase directory is SQL plus CLI scratch space; `.temp` holds a
    // minified edge-runtime bundle that ESLint would otherwise try to lint.
    "supabase/.temp/**",
    "supabase/.branches/**",
  ]),
]);

export default eslintConfig;
