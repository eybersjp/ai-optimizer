/**
 * Safe Walker — Bounded, deterministic filesystem walker.
 *
 * Features:
 * - Does not follow directory symlinks by default.
 * - Detects symlink loops.
 * - Records unreadable paths as diagnostics.
 * - Bounded by max files, max depth.
 * - Returns repository-relative paths with forward slashes.
 * - Sorts results deterministically.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RepositoryFile, ScannerDiagnostic } from "../contracts.js";
import type { ScannerConfiguration } from "../configuration.js";
import { IgnoreMatcher } from "./ignore-matcher.js";
import { diagnostic, DiagnosticCode } from "../diagnostics.js";

export interface WalkerOptions {
  config: ScannerConfiguration;
  extraIgnores: string[];
}

export interface WalkerResult {
  files: RepositoryFile[];
  diagnostics: ScannerDiagnostic[];
  inspected: number;
  skipped: number;
  aborted: boolean;
}

/**
 * Walk a directory tree safely and return discovered files.
 */
export function safeWalk(root: string, options: WalkerOptions): WalkerResult {
  const { config, extraIgnores } = options;
  const allIgnores = [...config.ignoreDirs, ...extraIgnores];
  const ignoreMatcher = new IgnoreMatcher(allIgnores, config.ignoreFiles);

  const files: RepositoryFile[] = [];
  const diagnostics: ScannerDiagnostic[] = [];
  let inspected = 0;
  let skipped = 0;
  let aborted = false;

  const visitedSymlinks = new Set<string>();

  function walk(currentDir: string, relativeDir: string, depth: number): void {
    if (aborted) return;

    // Depth limit
    if (config.maxDepth > 0 && depth > config.maxDepth) {
      diagnostics.push(
        diagnostic(
          DiagnosticCode.FILESYSTEM_LIMIT_EXCEEDED,
          "warning",
          "filesystem",
          `Max directory depth (${config.maxDepth}) exceeded at '${relativeDir}'`,
          { path: relativeDir, remediation: "Increase maxDepth or restructure directory" }
        )
      );
      return;
    }

    // File count limit
    if (config.maxFiles > 0 && files.length >= config.maxFiles) {
      diagnostics.push(
        diagnostic(
          DiagnosticCode.FILESYSTEM_LIMIT_EXCEEDED,
          "warning",
          "filesystem",
          `Max file count (${config.maxFiles}) reached`,
          { remediation: "Increase maxFiles or narrow the scan scope" }
        )
      );
      aborted = true;
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      diagnostics.push(
        diagnostic(
          DiagnosticCode.FILESYSTEM_PERMISSION_DENIED,
          "warning",
          "filesystem",
          `Cannot read directory '${relativeDir}': ${(err as Error).message}`,
          { path: relativeDir, recoverable: true }
        )
      );
      return; // Skip unreadable directory, continue scan
    }

    // Sort entries deterministically
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (aborted) return;

      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Check ignore
        if (ignoreMatcher.isDirIgnored(entry.name)) {
          skipped++;
          continue;
        }
        if (ignoreMatcher.isSubdirIgnored(relPath)) {
          skipped++;
          continue;
        }

        // Handle symlinks
        if (entry.isSymbolicLink()) {
          if (!config.followSymlinks) {
            // Record symlink as a finding
            let target: string | undefined;
            try {
              target = fs.readlinkSync(fullPath);
            } catch { /* ignore */ }
            files.push({
              relativePath: relPath,
              name: entry.name,
              extension: "",
              isBinary: false,
              sizeBytes: 0,
              isSymlink: true,
              symlinkTarget: target
            });
            diagnostics.push(
              diagnostic(
                DiagnosticCode.FILESYSTEM_SYMLINK_SKIPPED,
                "info",
                "filesystem",
                `Directory symlink skipped: '${relPath}' -> '${target ?? "?"}'`,
                { path: relPath }
              )
            );
            continue;
          }

          // Resolve real path; detect loops
          let realPath: string;
          try {
            realPath = fs.realpathSync(fullPath);
          } catch {
            continue;
          }
          if (visitedSymlinks.has(realPath)) {
            diagnostics.push(
              diagnostic(
                DiagnosticCode.FILESYSTEM_SYMLINK_SKIPPED,
                "info",
                "filesystem",
                `Symlink loop detected at '${relPath}'`,
                { path: relPath }
              )
            );
            continue;
          }
          visitedSymlinks.add(realPath);
        }

        walk(fullPath, relPath, depth + 1);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        // Check ignore
        if (ignoreMatcher.isFileIgnored(entry.name)) {
          skipped++;
          continue;
        }
        if (ignoreMatcher.isSubdirIgnored(relPath)) {
          skipped++;
          continue;
        }

        inspected++;

        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          skipped++;
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        const isSymlink = entry.isSymbolicLink();
        let symlinkTarget: string | undefined;

        if (isSymlink) {
          try {
            symlinkTarget = fs.readlinkSync(fullPath);
          } catch { /* ignore */ }
        }

        files.push({
          relativePath: relPath,
          name: entry.name,
          extension: ext,
          isBinary: isBinaryExtension(ext),
          sizeBytes: stat.size,
          isSymlink,
          symlinkTarget,
          modifiedAt: stat.mtime.toISOString()
        });

        if (config.maxFiles > 0 && files.length >= config.maxFiles) {
          diagnostics.push(
            diagnostic(
              DiagnosticCode.FILESYSTEM_LIMIT_EXCEEDED,
              "warning",
              "filesystem",
              `Max file count (${config.maxFiles}) reached`,
              { remediation: "Increase maxFiles or narrow the scan scope" }
            )
          );
          aborted = true;
          return;
        }
      }
    }
  }

  walk(root, "", 1);

  return { files, diagnostics, inspected, skipped, aborted };
}

/** Detect likely binary files by extension. */
function isBinaryExtension(ext: string): boolean {
  const binaryExts = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mp3", ".webm", ".ogg",
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".pyc", ".pyo",
    ".class", ".jar",
    ".map"
  ]);
  return binaryExts.has(ext);
}
