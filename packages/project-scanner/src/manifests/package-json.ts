/**
 * Package.json parser — Extracts framework/tool detection from package.json manifests.
 *
 * Detects technologies based on dependency names.
 */
import type { ManifestFinding } from "../contracts.js";

export interface PackageJsonData {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  main?: string;
  module?: string;
  browser?: string;
  exports?: unknown;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface FrameworkDetection {
  /** Framework identifier (e.g. "react", "nextjs"). */
  id: string;
  /** Package name that triggered detection. */
  packageName: string;
  /** Version string. */
  version: string | null;
  /** Whether this is a dev dependency. */
  isDev: boolean;
  /** Confidence level. */
  confidence: number;
}

/** Framework detection rules: package name → framework ID. */
const FRAMEWORK_RULES: Array<{
  packages: string[];
  frameworkId: string;
  confidence: number;
}> = [
  { packages: ["next"], frameworkId: "nextjs", confidence: 1.0 },
  { packages: ["react", "react-dom"], frameworkId: "react", confidence: 1.0 },
  { packages: ["vue", "vue-router"], frameworkId: "vue", confidence: 1.0 },
  { packages: ["svelte", "sveltekit"], frameworkId: "svelte", confidence: 1.0 },
  { packages: ["vite"], frameworkId: "vite", confidence: 0.9 },
  { packages: ["express"], frameworkId: "express", confidence: 1.0 },
  { packages: ["fastify"], frameworkId: "fastify", confidence: 1.0 },
  { packages: ["vitest"], frameworkId: "vitest", confidence: 1.0 },
  { packages: ["jest"], frameworkId: "jest", confidence: 1.0 },
  { packages: ["@supabase/supabase-js"], frameworkId: "supabase", confidence: 1.0 },
  { packages: ["firebase", "firebase-admin", "firebase-functions"], frameworkId: "firebase", confidence: 1.0 },
  { packages: ["tailwindcss"], frameworkId: "tailwindcss", confidence: 1.0 },
  { packages: ["prisma", "@prisma/client"], frameworkId: "prisma", confidence: 1.0 },
  { packages: ["drizzle-orm", "drizzle-kit"], frameworkId: "drizzle", confidence: 1.0 },
  { packages: ["zod"], frameworkId: "zod", confidence: 0.9 },
  { packages: ["commander"], frameworkId: "commander", confidence: 1.0 },
  { packages: ["@modelcontextprotocol/sdk"], frameworkId: "mcp-sdk", confidence: 1.0 },
  { packages: ["@playwright/test", "playwright"], frameworkId: "playwright", confidence: 1.0 },
  { packages: ["cypress"], frameworkId: "cypress", confidence: 1.0 },
  { packages: ["next-auth", "@next-auth"], frameworkId: "next-auth", confidence: 1.0 },
  { packages: ["trpc", "@trpc/server"], frameworkId: "trpc", confidence: 1.0 },
  { packages: ["@tanstack/react-query"], frameworkId: "react-query", confidence: 1.0 }
];

/** Detect frameworks from a package.json manifest. */
export function detectFrameworks(
  pkg: PackageJsonData,
  manifestPath: string
): FrameworkDetection[] {
  const findings: FrameworkDetection[] = [];
  const allDeps: Record<string, { version: string; isDev: boolean }> = {};

  for (const [dep, ver] of Object.entries(pkg.dependencies ?? {})) {
    allDeps[dep] = { version: ver, isDev: false };
  }
  for (const [dep, ver] of Object.entries(pkg.devDependencies ?? {})) {
    allDeps[dep] = { version: ver, isDev: true };
  }

  for (const rule of FRAMEWORK_RULES) {
    for (const pkgName of rule.packages) {
      if (allDeps[pkgName]) {
        findings.push({
          id: rule.frameworkId,
          packageName: pkgName,
          version: allDeps[pkgName].version,
          isDev: allDeps[pkgName].isDev,
          confidence: rule.confidence
        });
        break; // One finding per rule
      }
    }
  }

  return findings;
}

/** Detect languages from a package.json manifest. */
export function detectLanguages(pkg: PackageJsonData): string[] {
  const languages: string[] = [];
  const type = pkg.type;

  // Check for TypeScript config
  if (type === "module" || type === "commonjs") {
    // TypeScript is widely used in Node.js projects
    // We detect it via presence of tsconfig or typescript dependency
  }

  return languages;
}
