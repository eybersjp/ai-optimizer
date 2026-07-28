/**
 * Ignore Matcher — Determines whether a path or name should be ignored.
 *
 * Supports:
 * - Directory name exclusion (exact match)
 * - File pattern exclusion (glob-style, currently simple suffix/prefix)
 * - Repository-specific .gitignore and .ai-optimizeignore (documented subset)
 *
 * This is NOT a full Git-ignore implementation. Supported patterns:
 * - Exact directory names
 * - Wildcard file patterns (*.ext)
 * - Subdirectory paths (dir/subdir)
 *
 * Limitations (documented):
 * - No negation patterns
 * - No double-star (**) recursion patterns
 * - No anchored patterns
 */
export class IgnoreMatcher {
  private dirExact: Set<string>;
  private fileSuffix: string[];
  private subdirPrefix: string[];

  constructor(ignoreDirs: string[], ignoreFiles: string[]) {
    this.dirExact = new Set();
    this.fileSuffix = [];
    this.subdirPrefix = [];

    for (const dir of ignoreDirs) {
      if (dir.startsWith("*.")) {
        this.fileSuffix.push(dir.slice(1)); // keep the dot + suffix
      } else if (dir.includes("/")) {
        this.subdirPrefix.push(dir);
      } else {
        this.dirExact.add(dir);
      }
    }

    for (const pattern of ignoreFiles) {
      if (pattern.startsWith("*.")) {
        this.fileSuffix.push(pattern.slice(1));
      } else {
        this.fileSuffix.push(pattern);
      }
    }
  }

  /** Check if a directory should be ignored by name alone. */
  isDirIgnored(name: string): boolean {
    return this.dirExact.has(name);
  }

  /** Check if a file should be ignored by name/extension. */
  isFileIgnored(name: string): boolean {
    for (const suffix of this.fileSuffix) {
      if (name.endsWith(suffix)) return true;
    }
    return false;
  }

  /** Check if a relative path matches a subdirectory ignore pattern. */
  isSubdirIgnored(relativePath: string): boolean {
    for (const prefix of this.subdirPrefix) {
      if (relativePath.startsWith(prefix)) return true;
    }
    return false;
  }
}
