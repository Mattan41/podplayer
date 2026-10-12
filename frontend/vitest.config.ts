import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/*
 * Frontend test harness.
 *
 * Deliberately outside the production path: `next build` never reads this file,
 * `next.config.ts` is untouched, and the static export is unchanged. The `@`
 * alias mirrors the `"@/*": ["./*"]` mapping in tsconfig.json, so a test
 * imports the same specifiers the app does.
 */
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    environment: "jsdom",
    // Registers the global afterEach that @testing-library/react's automatic
    // cleanup needs; test files still import describe/it/expect explicitly.
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // `app/` is included for the pure metadata route (the web app manifest);
    // the components and providers that hold logic live under `lib/`.
    include: ["lib/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
  },
});
