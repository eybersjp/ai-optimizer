/**
 * Supabase project detection.
 *
 * Detects Supabase projects via supabase/config.toml and supabase/migrations.
 */
export interface SupabaseInfo {
  hasConfig: boolean;
  hasMigrations: boolean;
  hasSeedSql?: boolean;
  projectId?: string;
}

/**
 * Detect Supabase usage from file discovery context.
 */
export function detectSupabase(
  allFiles: string[],
  manifests: Array<{ relativePath: string; raw: unknown }>
): SupabaseInfo {
  const info: SupabaseInfo = {
    hasConfig: false,
    hasMigrations: false
  };

  for (const file of allFiles) {
    if (file.startsWith("supabase/config.toml") || file === "supabase/config.toml") {
      info.hasConfig = true;
    }
    if (file.startsWith("supabase/migrations/") || file.includes("supabase/migrations")) {
      info.hasMigrations = true;
    }
    if (file === "supabase/seed.sql") {
      info.hasSeedSql = true;
    }
  }

  // Check config files for project_id
  for (const mf of manifests) {
    if (mf.relativePath === "supabase/config.toml" && typeof mf.raw === "string") {
      const match = (mf.raw as string).match(/project_id\s*=\s*\"([^\"]+)\"/);
      if (match) info.projectId = match[1];
    }
  }

  return info;
}
