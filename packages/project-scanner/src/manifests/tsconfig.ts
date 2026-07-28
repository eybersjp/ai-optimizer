/**
 * tsconfig.json parser — Detects TypeScript configuration presence.
 */
export interface TsConfigData {
  compilerOptions?: {
    target?: string;
    module?: string;
    strict?: boolean;
    jsx?: string;
  };
  include?: string[];
  exclude?: string[];
}

/**
 * Parse a tsconfig.json file.
 * Returns null if parsing fails.
 */
export function parseTsConfig(raw: unknown): TsConfigData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;

  const compilerOptions = data.compilerOptions;
  if (compilerOptions && typeof compilerOptions === "object") {
    return {
      compilerOptions: compilerOptions as TsConfigData["compilerOptions"],
      include: Array.isArray(data.include) ? data.include.map(String) : undefined,
      exclude: Array.isArray(data.exclude) ? data.exclude.map(String) : undefined
    };
  }

  return { include: Array.isArray(data.include) ? data.include.map(String) : undefined };
}
