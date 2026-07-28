/**
 * Scanner Configuration — Configurable limits and ignore defaults.
 *
 * All limits are overridable per scan via the constructor.
 */
export interface ScannerConfiguration {
  /** Maximum number of files to discover (0 = unlimited). */
  maxFiles: number;
  /** Maximum directory depth (0 = unlimited). */
  maxDepth: number;
  /** Maximum manifest file size in bytes to read fully. */
  maxManifestSize: number;
  /** Maximum text file size in bytes to inspect for content-based detection. */
  maxTextInspectionSize: number;
  /** Maximum scan duration in ms (0 = unlimited). */
  maxDurationMs: number;
  /** Whether to follow directory symlinks. */
  followSymlinks: boolean;
  /** Default directory names to ignore. */
  ignoreDirs: string[];
  /** Default file patterns to ignore (glob-style). */
  ignoreFiles: string[];
  /** Maximum number of recent commits to collect from Git. */
  maxGitCommits: number;
  /** Git command timeout in ms. */
  gitTimeoutMs: number;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfiguration = {
  maxFiles: 100000,
  maxDepth: 50,
  maxManifestSize: 2 * 1024 * 1024, // 2 MB
  maxTextInspectionSize: 1024 * 1024, // 1 MB
  maxDurationMs: 30000, // 30 seconds
  followSymlinks: false,
  ignoreDirs: [
    ".git",
    "node_modules",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".turbo",
    ".cache",
    ".parcel-cache",
    ".vite",
    "target",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".ai-optimize/backups",
    ".ai-optimize/staging",
    ".ai-optimize/activation.lock",
    ".ai-optimize/state.db"
  ],
  ignoreFiles: [
    "*.pyc",
    "*.pyo",
    "*.so",
    "*.dylib",
    "*.dll",
    "*.exe",
    "*.bin",
    "*.class",
    "*.map",
    "*.d.ts.map",
    "*.js.map",
    "*.db-journal",
    "*.db-wal",
    "*.db-shm"
  ],
  maxGitCommits: 10,
  gitTimeoutMs: 5000
};

