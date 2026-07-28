/**
 * Scanner Contracts — Typed interfaces for all scanner passes and results.
 *
 * These types are the foundation of the deterministic, bounded,
 * provider-neutral repository intelligence engine.
 */
import type { ProjectAssertion, EvidenceReference } from "@ai-optimize/contracts";
import type { ScannerConfiguration } from "./configuration.js";

// Re-export ScannerConfiguration for convenience
export type { ScannerConfiguration };

// ---------------------------------------------------------------------------
// Scanner diagnostic
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface ScannerDiagnostic {
  /** Stable diagnostic code (e.g. "FILESYSTEM_PERMISSION_DENIED"). */
  code: string;
  /** Severity level. */
  severity: DiagnosticSeverity;
  /** ID of the scanner pass that produced this diagnostic. */
  passId: string;
  /** Human-readable message. */
  message: string;
  /** Repository-relative path where the diagnostic occurred, if applicable. */
  path?: string;
  /** Whether scanning can continue after this diagnostic. */
  recoverable: boolean;
  /** Structured details (safe for diagnostics, no secrets). */
  details?: unknown;
  /** Suggested remediation. */
  remediation?: string;
}

// ---------------------------------------------------------------------------
// Core abstractions
// ---------------------------------------------------------------------------

/** A scanner pass must have a stable ID, version, and accept a typed context. */
export interface ScannerPass {
  readonly id: string;
  readonly version: string;
  run(context: ScannerContext): ScannerPassResult;
}

/** Shared context passed through all scanner passes. */
export interface ScannerContext {
  /** Resolved absolute root path. */
  root: string;
  /** Repository-relative root (always "." for the project root). */
  rootRelative: string;
  /** Scanner configuration with limits. */
  config: ScannerConfiguration;
  /** Additional ignore patterns from callers. */
  extraIgnores: string[];
  /** Files discovered so far. */
  files: RepositoryFile[];
  /** Assertions collected across passes. */
  assertions: ProjectAssertion[];
  /** Diagnostics collected across passes. */
  diagnostics: ScannerDiagnostic[];
  /** Manifests discovered (populated by manifest pass). */
  manifests: ManifestFinding[];
  /** Workspace packages discovered (populated by manifest/topology passes). */
  workspacePackages: WorkspacePackage[];
  /** Package graph (populated by topology pass). */
  packageGraph: PackageGraph;
  /** Git summary (populated by git pass). */
  gitSummary: GitSummary | null;
  /** Architecture findings (populated by architecture pass). */
  architectureFindings: ArchitectureFinding[];
  /** Detected primary/secondary languages. */
  languages: Set<string>;
  /** Detected frameworks (id → version/source). */
  frameworks: Map<string, string>;
  /** Per-pass elapsed timing (ms). Reported for diagnostics only; not deterministic. */
  timing: Record<string, number>;
  // Counters
  filesInspected: number;
  filesSkipped: number;
  manifestsParsed: number;
  diagnosticsCount: number;
}

/** Result of a single scanner pass. */
export interface ScannerPassResult {
  passId: string;
  version: string;
  aborted: boolean;
  abortedReason?: string;
  files?: RepositoryFile[];
  assertions: ProjectAssertion[];
  diagnostics: ScannerDiagnostic[];
  // Extended fields — passes may contribute additional data beyond the base interface
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Repository file
// ---------------------------------------------------------------------------

export interface RepositoryFile {
  /** Repository-relative path using forward slashes. */
  relativePath: string;
  /** File name. */
  name: string;
  /** File extension (including the dot, e.g. ".ts", ".json"). */
  extension: string;
  /** Whether the file appears to be binary. */
  isBinary: boolean;
  /** File size in bytes. */
  sizeBytes: number;
  /** Whether this is a symbolic link. */
  isSymlink: boolean;
  /** The symlink target, if applicable. */
  symlinkTarget?: string;
  /** Last modified timestamp (ISO 8601). */
  modifiedAt?: string;
}

// ---------------------------------------------------------------------------
// Manifest finding
// ---------------------------------------------------------------------------

export interface ManifestFinding {
  /** Repository-relative path. */
  relativePath: string;
  /** Manifest type identifier (e.g. "package.json", "pyproject.toml"). */
  type: string;
  /** Raw parsed content (JSON object, YAML object, etc.). */
  raw: unknown;
  /** Size in bytes. */
  sizeBytes: number;
  /** Whether parsing succeeded. */
  parsed: boolean;
  /** Error message if parsing failed. */
  parseError?: string;
}

// ---------------------------------------------------------------------------
// Workspace package
// ---------------------------------------------------------------------------

export interface WorkspacePackage {
  /** Package name (from manifest). */
  name: string;
  /** Repository-relative directory (e.g. "apps/cli"). */
  relativeDir: string;
  /** Version string. */
  version: string;
  /** Whether the package is private. */
  private: boolean;
  /** Package type ("module", "commonjs", or undefined). */
  type?: string;
  /** Path to the package manifest relative to repository root. */
  manifestPath: string;
  /** Scripts defined in the package. */
  scripts: Record<string, string>;
  /** Dependencies. */
  dependencies: Record<string, string>;
  /** Dev dependencies. */
  devDependencies: Record<string, string>;
  /** Peer dependencies. */
  peerDependencies: Record<string, string>;
  /** Optional dependencies. */
  optionalDependencies: Record<string, string>;
  /** Detected languages within this package. */
  languages: string[];
  /** Detected frameworks within this package. */
  frameworks: string[];
  /** Entry points (main, module, browser, exports). */
  entryPoints: string[];
  /** Detected package role. */
  role?: PackageRole;
}

export type PackageRole =
  | "application"
  | "cli"
  | "daemon-service"
  | "frontend"
  | "library"
  | "contracts"
  | "adapter"
  | "test"
  | "configuration"
  | "expert-pack"
  | "database"
  | "unknown";

// ---------------------------------------------------------------------------
// Package graph
// ---------------------------------------------------------------------------

export interface PackageGraph {
  nodes: PackageGraphNode[];
  edges: PackageGraphEdge[];
}

export interface PackageGraphNode {
  /** Package name. */
  name: string;
  /** Repository-relative directory. */
  relativeDir: string;
  /** Detected role. */
  role: PackageRole;
}

export interface PackageGraphEdge {
  /** Source package name. */
  source: string;
  /** Target package name. */
  target: string;
  /** Dependency type. */
  type: DependencyType;
}

export type DependencyType =
  | "runtime"
  | "development"
  | "peer"
  | "optional"
  | "workspace";

// ---------------------------------------------------------------------------
// Git summary
// ---------------------------------------------------------------------------

export interface GitSummary {
  /** Whether the path is inside a Git work tree. */
  insideWorkTree: boolean;
  /** Git top-level directory. */
  topLevel: string;
  /** Current branch name, or null if detached HEAD. */
  currentBranch: string | null;
  /** Whether HEAD is detached. */
  detachedHead: boolean;
  /** Current commit SHA (short form). */
  currentSha: string | null;
  /** Whether the working tree is clean. */
  isClean: boolean;
  /** Number of staged files. */
  stagedCount: number;
  /** Number of unstaged files. */
  unstagedCount: number;
  /** Number of untracked files. */
  untrackedCount: number;
  /** Configured remotes (URLs with credentials redacted). */
  remotes: RemoteInfo[];
  /** Recent commit subjects (max 10). */
  recentCommits: string[];
}

export interface RemoteInfo {
  name: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Architecture finding
// ---------------------------------------------------------------------------

export interface ArchitectureFinding {
  /** Stable finding ID (deterministic). */
  id: string;
  /** Rule ID that produced this finding. */
  ruleId: string;
  /** Rule version. */
  ruleVersion: string;
  /** Subject of the finding. */
  subject: string;
  /** Predicate of the finding. */
  predicate: string;
  /** Value of the finding. */
  value: unknown;
  /** Status: observed only when directly seen, inferred otherwise. */
  status: "observed" | "inferred" | "unresolved";
  /** Confidence (0.0 to 1.0). */
  confidence: number;
  /** IDs of supporting evidence assertions. */
  supportingEvidenceIds: string[];
  /** Repository-relative source paths. */
  sources: string[];
  /** Source line ranges where available. */
  lineRanges?: string[];
  /** Human-readable explanation. */
  explanation: string;
  /** Limitations or competing interpretations. */
  limitations?: string;
}

// ---------------------------------------------------------------------------
// Full rich scan result (new format, backwards compatible via ScanResult rich field)
// ---------------------------------------------------------------------------

export interface NewScanResult {
  root: string;
  rootRelative: string;
  files: RepositoryFile[];
  diagnostics: ScannerDiagnostic[];
  manifests: ManifestFinding[];
  workspacePackages: WorkspacePackage[];
  packageGraph: PackageGraph;
  gitSummary: GitSummary | null;
  architectureFindings: ArchitectureFinding[];
  languages: string[];
  frameworks: Record<string, string>;
  timing: Record<string, number>;
  filesInspected: number;
  filesSkipped: number;
  manifestsParsed: number;
}
