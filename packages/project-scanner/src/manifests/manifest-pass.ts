/**
 * Manifest Pass (Pass 2) — Manifest and Technology Discovery.
 *
 * Pass ID: "manifest"
 * Version: "1.0.0"
 *
 * Discovers and parses all supported manifest files across the repository,
 * including workspace package manifests, and produces framework/language findings.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  ScannerPass,
  ScannerContext,
  ScannerPassResult,
  RepositoryFile,
  ManifestFinding,
  WorkspacePackage
} from "../contracts.js";
import type { ScannerConfiguration } from "../configuration.js";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";
import { diagnostic, DiagnosticCode } from "../diagnostics.js";
import { parsePnpmWorkspace, expandWorkspacePatterns } from "./pnpm-workspace.js";
import { detectFrameworks, type PackageJsonData } from "./package-json.js";
import { detectFirebase } from "./firebase.js";
import { detectSupabase } from "./supabase.js";

/**
 * Known manifest file names and their types.
 */
const MANIFEST_PATTERNS: Array<{ pattern: string | RegExp; type: string; parser: "json" | "yaml" | "toml" | "text" | "raw" }> = [
  // JS/TS
  { pattern: /^package\.json$/, type: "package.json", parser: "json" },
  { pattern: /^pnpm-workspace\.yaml$/, type: "pnpm-workspace.yaml", parser: "yaml" },
  { pattern: /^tsconfig\.json$/, type: "tsconfig.json", parser: "json" },
  { pattern: /^tsconfig\..*\.json$/, type: "tsconfig.*.json", parser: "json" },
  { pattern: /^vite\.config\.(ts|js)$/, type: "vite.config", parser: "raw" },
  { pattern: /^next\.config\.(ts|js|mjs)$/, type: "next.config", parser: "raw" },
  { pattern: /^vitest\.config\.(ts|js)$/, type: "vitest.config", parser: "raw" },
  { pattern: /^jest\.config\.(ts|js|mjs)$/, type: "jest.config", parser: "raw" },
  { pattern: /^\.eslintrc(\..*)?$/, type: "eslintrc", parser: "json" },
  { pattern: /^eslint\.config\.(js|mjs|ts)$/, type: "eslint.config", parser: "raw" },
  { pattern: /^prettier\.config\.(js|json|mjs)$/, type: "prettier.config", parser: "json" },
  // Python
  { pattern: /^pyproject\.toml$/, type: "pyproject.toml", parser: "toml" },
  { pattern: /^requirements.*\.txt$/, type: "requirements.txt", parser: "text" },
  { pattern: /^setup\.py$/, type: "setup.py", parser: "raw" },
  { pattern: /^setup\.cfg$/, type: "setup.cfg", parser: "text" },
  { pattern: /^Pipfile$/, type: "Pipfile", parser: "text" },
  // Rust
  { pattern: /^Cargo\.toml$/, type: "Cargo.toml", parser: "toml" },
  { pattern: /^Cargo\.lock$/, type: "Cargo.lock", parser: "raw" },
  // Docker
  { pattern: /^Dockerfile(\..*)?$/, type: "Dockerfile", parser: "raw" },
  { pattern: /^compose\.ya?ml$/, type: "compose.yaml", parser: "yaml" },
  { pattern: /^docker-compose\.ya?ml$/, type: "docker-compose.yaml", parser: "yaml" },
  // Firebase
  { pattern: /^firebase\.json$/, type: "firebase.json", parser: "json" },
  { pattern: /^\.firebaserc$/, type: ".firebaserc", parser: "json" },
  { pattern: /^firestore\.rules$/, type: "firestore.rules", parser: "raw" },
  { pattern: /^storage\.rules$/, type: "storage.rules", parser: "raw" },
  // Platform
  { pattern: /^vercel\.json$/, type: "vercel.json", parser: "json" },
  { pattern: /^netlify\.toml$/, type: "netlify.toml", parser: "toml" },
  // Prisma/Drizzle
  { pattern: /^prisma\/schema\.prisma$/, type: "prisma.schema", parser: "raw" },
  { pattern: /^drizzle\.config\.(ts|js)$/, type: "drizzle.config", parser: "raw" },
  // CI
  { pattern: /^\.github\/workflows\/.*\.ya?ml$/, type: "github-workflow", parser: "yaml" }
];

export class ManifestPass implements ScannerPass {
  readonly id = "manifest";
  readonly version = "1.0.0";

  private config: ScannerConfiguration;

  constructor(config: ScannerConfiguration) {
    this.config = config;
  }

  run(context: ScannerContext): ScannerPassResult {
    const evidence = new EvidenceEngine();
    const manifests: ManifestFinding[] = [];
    const diagnosticsList = [...context.diagnostics];
    const frameworks = new Map<string, string>();
    const languages: Set<string> = new Set();
    const workspacePackages: WorkspacePackage[] = [];
    let manifestsParsed = 0;

    // Phase 1: Discover manifests from the file list
    const manifestFiles = context.files.filter((f) => this.isManifestFile(f.relativePath));
    const manifestFilePaths = new Set(manifestFiles.map((f) => f.relativePath));

    // Phase 2: Parse each manifest
    for (const file of manifestFiles) {
      const fullPath = path.join(context.root, file.relativePath);
      const result = this.parseManifest(file, fullPath);
      manifestsParsed++;

      if (result) {
        manifests.push(result);
        if (!result.parsed) {
          diagnosticsList.push(
            diagnostic(
              DiagnosticCode.MANIFEST_PARSE_FAILED,
              "warning",
              this.id,
              `Failed to parse manifest '${file.relativePath}': ${result.parseError ?? "Unknown error"}`,
              { path: file.relativePath, recoverable: true, details: { parseError: result.parseError } }
            )
          );
        }
      } else {
        diagnosticsList.push(
          diagnostic(
            DiagnosticCode.MANIFEST_PARSE_FAILED,
            "warning",
            this.id,
            `Failed to parse manifest '${file.relativePath}'`,
            { path: file.relativePath, recoverable: true }
          )
        );
      }
    }

    // Phase 3: Detect workspace packages from manifest data
    let workspacePatterns: string[] = [];
    const pnpmWorkspaceManifest = manifests.find((m) => m.type === "pnpm-workspace.yaml");
    if (pnpmWorkspaceManifest && pnpmWorkspaceManifest.parsed && pnpmWorkspaceManifest.raw) {
      const workspaceConfig = pnpmWorkspaceManifest.raw as { packages?: string[] } | undefined;
      if (Array.isArray(workspaceConfig?.packages)) {
        workspacePatterns.push(...workspaceConfig.packages);
      }
    }

    // Fallback: check root package.json for "workspaces" field if no pnpm-workspace patterns
    if (workspacePatterns.length === 0) {
      const rootPkgManifest = manifests.find((m) => m.relativePath === "package.json");
      if (rootPkgManifest && rootPkgManifest.parsed && rootPkgManifest.raw) {
        const pkgData = rootPkgManifest.raw as PackageJsonData & { workspaces?: string[] | { packages?: string[] } };
        if (Array.isArray(pkgData.workspaces)) {
          workspacePatterns.push(...pkgData.workspaces);
        } else if (pkgData.workspaces && Array.isArray((pkgData.workspaces as any).packages)) {
          workspacePatterns.push(...(pkgData.workspaces as any).packages);
        }
      }
    }

    if (workspacePatterns.length > 0) {
      const expanded = expandWorkspacePatterns(
        workspacePatterns,
        context.root,
        diagnosticsList
      );

      for (const pkgDir of expanded) {
        const pkgJsonPath = path.join(context.root, pkgDir, "package.json");
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = this.parseWorkspacePackage(pkgJsonPath, pkgDir);
          if (pkg) {
            workspacePackages.push(pkg);
          }
        } else {
          diagnosticsList.push(
            diagnostic(
              DiagnosticCode.WORKSPACE_PACKAGE_MISSING_MANIFEST,
              "warning",
              this.id,
              `Workspace package at '${pkgDir}' has no package.json`,
              { path: pkgDir, recoverable: true }
            )
          );
        }
      }
    }

    // Always include root package.json if it exists and wasn't already added
    const rootPkgJsonPath = path.join(context.root, "package.json");
    if (fs.existsSync(rootPkgJsonPath) && !workspacePackages.some((p) => p.relativeDir === "." || p.relativeDir === "")) {
      const rootPkg = this.parseWorkspacePackage(rootPkgJsonPath, ".");
      if (rootPkg) {
        workspacePackages.unshift(rootPkg);
      }
    }

    // Phase 4: Extract frameworks from all package.json manifests
    for (const mf of manifests) {
      if (mf.type === "package.json" && typeof mf.raw === "object" && mf.raw !== null) {
        const pkgData = mf.raw as PackageJsonData;
        const allDeps = { ...pkgData.dependencies, ...pkgData.devDependencies };
        if (allDeps["typescript"]) {
          languages.add("typescript");
        }
        const detected = detectFrameworks(pkgData, mf.relativePath);
        for (const fw of detected) {
          if (!frameworks.has(fw.id)) {
            frameworks.set(fw.id, fw.version ?? "unknown");
          }
        }
      }
    }

    // Inspect source files for native node:sqlite or sqlite imports
    for (const file of context.files) {
      if ((file.extension === ".ts" || file.extension === ".js") && file.sizeBytes <= this.config.maxTextInspectionSize) {
        const fullPath = path.join(context.root, file.relativePath);
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes("node:sqlite") || content.includes("sqlite3") || content.includes("better-sqlite3")) {
            frameworks.set("sqlite", "native");
            break;
          }
        } catch { /* skip unreadable */ }
      }
    }

    // Phase 5: Detect languages from file extensions
    for (const file of context.files) {
      const lang = extensionToLanguage(file.extension);
      if (lang) languages.add(lang);
    }

    // Add TypeScript if tsconfig found
    if (manifestFilePaths.has("tsconfig.json") || manifests.some((m) => m.type.startsWith("tsconfig"))) {
      languages.add("typescript");
    }

    // Detection assertions
    for (const [fw, ver] of frameworks) {
      evidence.createAssertion({
        subject: "stack",
        predicate: `framework-${fw}`,
        value: { framework: fw, version: ver },
        status: "observed",
        confidence: 1.0,
        sources: [{ file: ".", reason: `Detected framework '${fw}' from manifest` }],
        explanation: `Framework '${fw}' detected with version '${ver}'`
      });
    }

    for (const lang of languages) {
      evidence.createAssertion({
        subject: "stack",
        predicate: `language-${lang}`,
        value: lang,
        status: "observed",
        confidence: 1.0,
        sources: [{ file: ".", reason: `Detected language '${lang}' from source files` }],
        explanation: `Language '${lang}' detected in repository`
      });
    }

    // Detect supabase from files
    const supabaseInfo = detectSupabase(
      context.files.map((f) => f.relativePath),
      manifests
    );
    if (supabaseInfo.hasConfig || supabaseInfo.hasMigrations) {
      frameworks.set("supabase", "config");
      evidence.createAssertion({
        subject: "stack",
        predicate: "supabase",
        value: supabaseInfo,
        status: "observed",
        confidence: 0.95,
        sources: [{ file: "supabase/", reason: "Supabase config or migrations detected" }],
        explanation: "Supabase project detected"
      });
    }

    // Detect Firebase
    for (const mf of manifests) {
      if (mf.type === "firebase.json" || mf.type === ".firebaserc") {
        const fbInfo = detectFirebase(mf.raw, mf.relativePath);
        if (Object.keys(fbInfo).length > 0) {
          frameworks.set("firebase", "config");
          evidence.createAssertion({
            subject: "stack",
            predicate: "firebase",
            value: fbInfo,
            status: "observed",
            confidence: 0.95,
            sources: [{ file: mf.relativePath, reason: "Firebase configuration found" }],
            explanation: "Firebase project detected"
          });
        }
      }
    }

    // Determine primary vs secondary languages
    const primaryLanguages = [...languages].filter((l) =>
      ["typescript", "javascript", "python", "rust", "go", "java"].includes(l)
    );

    evidence.createAssertion({
      subject: "stack",
      predicate: "primary-languages",
      value: primaryLanguages.sort(),
      status: "inferred",
      confidence: 0.9,
      sources: [{ file: ".", reason: "Language detection from file extensions and manifests" }],
      explanation: `Primary languages: ${primaryLanguages.join(", ")}`
    });

    return {
      passId: this.id,
      version: this.version,
      aborted: false,
      assertions: evidence.getAssertions(),
      diagnostics: diagnosticsList,
      manifests,
      workspacePackages,
      languages,
      frameworks,
      manifestsParsed
    };
  }

  private findManifestPattern(relativePath: string): (typeof MANIFEST_PATTERNS)[number] | undefined {
    const filename = path.basename(relativePath);
    return MANIFEST_PATTERNS.find((mp) => {
      if (typeof mp.pattern === "string") {
        return relativePath === mp.pattern || filename === mp.pattern || relativePath.endsWith(`/${mp.pattern}`);
      }
      return mp.pattern.test(filename) || mp.pattern.test(relativePath);
    });
  }

  /** Check if a file path is a known manifest. */
  private isManifestFile(relativePath: string): boolean {
    return this.findManifestPattern(relativePath) !== undefined;
  }

  /** Parse a manifest file based on its type. */
  private parseManifest(file: RepositoryFile, fullPath: string): ManifestFinding | null {
    const match = this.findManifestPattern(file.relativePath);
    if (!match) return null;

    if (file.sizeBytes > this.config.maxManifestSize) {
      return {
        relativePath: file.relativePath,
        type: match.type,
        raw: null,
        sizeBytes: file.sizeBytes,
        parsed: false,
        parseError: `Exceeds max manifest size (${file.sizeBytes} > ${this.config.maxManifestSize})`
      };
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      let raw: unknown;

      switch (match.parser) {
        case "json":
          raw = JSON.parse(content);
          break;
        case "yaml":
          raw = parseYaml(content);
          break;
        case "toml":
          raw = parseToml(content);
          break;
        case "text":
        case "raw":
        default:
          raw = content;
          break;
      }

      return {
        relativePath: file.relativePath,
        type: match.type,
        raw,
        sizeBytes: file.sizeBytes,
        parsed: true
      };
    } catch (err) {
      return {
        relativePath: file.relativePath,
        type: match.type,
        raw: null,
        sizeBytes: file.sizeBytes,
        parsed: false,
        parseError: (err as Error).message
      };
    }
  }

  /** Parse a workspace package.json into a WorkspacePackage. */
  private parseWorkspacePackage(pkgJsonPath: string, relativeDir: string): WorkspacePackage | null {
    try {
      const content = fs.readFileSync(pkgJsonPath, "utf-8");
      const pkg = JSON.parse(content) as PackageJsonData;

      // Detect languages from files in this package
      const languages = new Set<string>();
      // Detect frameworks from dependencies
      const foundFrameworks = detectFrameworks(pkg, pkgJsonPath);

      const entryPoints: string[] = [];
      if (pkg.main) entryPoints.push(pkg.main);
      if (pkg.module) entryPoints.push(pkg.module);
      if (pkg.browser) entryPoints.push(pkg.browser);

      return {
        name: pkg.name ?? path.basename(relativeDir),
        relativeDir,
        version: pkg.version ?? "0.0.0",
        private: pkg.private ?? false,
        type: pkg.type,
        manifestPath: path.join(relativeDir, "package.json").replace(/\\/g, "/"),
        scripts: pkg.scripts ?? {},
        dependencies: pkg.dependencies ?? {},
        devDependencies: pkg.devDependencies ?? {},
        peerDependencies: pkg.peerDependencies ?? {},
        optionalDependencies: pkg.optionalDependencies ?? {},
        languages: [...languages].sort(),
        frameworks: [...new Set(foundFrameworks.map((f) => f.id))].sort(),
        entryPoints,
        role: detectPackageRole(relativeDir, pkg)
      };
    } catch {
      return null;
    }
  }
}

import type { PackageRole } from "../contracts.js";

/** Determine a package role based on directory and metadata. */
function detectPackageRole(relativeDir: string, pkg: PackageJsonData): PackageRole {
  const dir = relativeDir.toLowerCase();
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (dir.startsWith("apps/") || dir === "apps") {
    if (deps?.["react"] || deps?.["react-dom"] || deps?.["vite"]) return "frontend";
    if (pkg.name?.includes("cli") || deps?.["commander"]) return "cli";
    if (deps?.["fastify"] || deps?.["express"]) return "daemon-service";
    return "application";
  }
  if (dir.startsWith("packages/adapters")) return "adapter";
  if (dir.startsWith("packages/contracts")) return "contracts";
  if (dir.startsWith("packages/")) return "library";
  if (dir.startsWith("expert-packs")) return "expert-pack";
  if (dir.startsWith("tests") || dir === "tests") return "test";

  // Infer from dependencies
  if (deps?.["fastify"] || deps?.["express"]) return "daemon-service";
  if (deps?.["commander"] || pkg.bin) return "cli";
  if (deps?.["react"] || deps?.["vite"]) return "frontend";

  return "library";
}

/** Map file extension to likely language. */
function extensionToLanguage(ext: string): string | null {
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".sql": "sql",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "scss",
    ".less": "css",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".ps1": "powershell",
    ".psm1": "powershell"
  };
  return map[ext] ?? null;
}

/** Simple TOML parser for manifest validation. Throws SyntaxError on malformed TOML. */
function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, any> = {};
  let currentSection = result;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[")) {
      if (!line.endsWith("]")) {
        throw new SyntaxError(`Malformed TOML section header at line ${i + 1}: '${line}'`);
      }
      const sectionName = line.slice(1, -1).trim();
      if (!sectionName || sectionName.includes("[") || sectionName.includes("]")) {
        throw new SyntaxError(`Invalid section header name at line ${i + 1}: '${line}'`);
      }
      result[sectionName] = result[sectionName] ?? {};
      currentSection = result[sectionName];
      continue;
    }

    if (!line.includes("=")) {
      throw new SyntaxError(`Invalid TOML key-value line at line ${i + 1}: '${line}'`);
    }

    const eqIdx = line.indexOf("=");
    const key = line.slice(0, eqIdx).trim();
    const valStr = line.slice(eqIdx + 1).trim();

    if (!key) {
      throw new SyntaxError(`Empty TOML key at line ${i + 1}`);
    }

    if (valStr.startsWith('"')) {
      if (!valStr.endsWith('"') || valStr.length < 2) {
        throw new SyntaxError(`Unterminated string in TOML line ${i + 1}: '${line}'`);
      }
      currentSection[key] = valStr.slice(1, -1);
    } else if (valStr === "true") {
      currentSection[key] = true;
    } else if (valStr === "false") {
      currentSection[key] = false;
    } else if (!isNaN(Number(valStr))) {
      currentSection[key] = Number(valStr);
    } else if (valStr.startsWith("[")) {
      currentSection[key] = valStr.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
    } else {
      currentSection[key] = valStr;
    }
  }

  return result;
}

