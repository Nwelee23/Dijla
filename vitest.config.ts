import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure logic on the money paths — pricing, request parsing,
 * phone normalization, status transitions. No database and no network: the
 * integration scripts in coverage/ cover the live-Supabase paths separately.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
