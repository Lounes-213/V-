import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      // Storage and media modules talk to real browser APIs (OPFS, IndexedDB,
      // AudioContext) and are exercised by the browser checks instead.
      exclude: ["src/lib/**/*.test.ts", "src/lib/db.ts", "src/lib/media-store.ts"],
      thresholds: {
        statements: 75,
        lines: 80,
        functions: 75,
        branches: 65,
        // The timeline is the one module where a bug silently corrupts a user's
        // cut, so it carries a stricter bar than the rest of the library.
        "src/lib/timeline.ts": { statements: 90, lines: 90, branches: 80, functions: 85 },
      },
    },
  },
});
