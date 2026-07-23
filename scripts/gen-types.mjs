/**
 * Regenerate src/lib/supabase/types.ts from the Supabase schema.
 *
 * The project ref is read from SUPABASE_PROJECT_ID (env, or .env.local) rather
 * than hardcoded in package.json — it is not a secret, but it does not belong in
 * a committed script. Cross-platform: works the same in PowerShell and bash.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function fromEnvLocal(key) {
  if (!existsSync(".env.local")) return undefined;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && line.slice(0, i).trim() === key) return line.slice(i + 1).trim();
  }
  return undefined;
}

const projectId = process.env.SUPABASE_PROJECT_ID || fromEnvLocal("SUPABASE_PROJECT_ID");
if (!projectId) {
  console.error("Set SUPABASE_PROJECT_ID in .env.local (your Supabase project ref).");
  process.exit(1);
}

execSync(
  `supabase gen types typescript --project-id ${projectId} > src/lib/supabase/types.ts`,
  { stdio: "inherit", shell: true }
);
