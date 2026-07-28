/**
 * pnpm-workspace.yaml parser — Expands workspace patterns safely.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import type { ScannerDiagnostic } from "../contracts.js";
import { diagnostic, DiagnosticCode } from "../diagnostics.js";

export interface PnpmWorkspaceConfig {
  packages: string[];
}

/**
 * Parse a pnpm-workspace.yaml file.
 */
export function parsePnpmWorkspace(filePath: string): PnpmWorkspaceConfig | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content) as Record<string, unknown>;
    if (!parsed || !Array.isArray(parsed.packages)) return null;
    return { packages: parsed.packages.map(String) };
  } catch {
    return null;
  }
}

/**
 * Expand workspace glob patterns into actual directories relative to workspace root.
 * Supports basic glob patterns:
 *   - "*" → single-level wildcard
 *   - "**" → multi-level wildcard (any depth)
 *   - "packages/*" → all dirs directly under packages/
 *   - "apps/*" → all dirs directly under apps/
 *   - "packages/adapters/*" → nested dirs
 */
export interface WorkspacePatternSource {
  source: string;
  pattern: string;
}

export function expandWorkspacePatternsWithProvenance(
  patternsWithSource: WorkspacePatternSource[],
  workspaceRoot: string,
  diagnostics: ScannerDiagnostic[]
): Map<string, string[]> {
  const dirToPatterns = new Map<string, string[]>();

  for (const item of patternsWithSource) {
    const provTag = `${item.source}:${item.pattern}`;
    try {
      const expanded = expandPattern(item.pattern, workspaceRoot);
      for (const dir of expanded) {
        const existing = dirToPatterns.get(dir) ?? [];
        if (!existing.includes(provTag)) {
          existing.push(provTag);
        }
        dirToPatterns.set(dir, existing);
      }

      if (expanded.length === 0 && !item.pattern.includes("*")) {
        diagnostics.push(
          diagnostic(
            DiagnosticCode.WORKSPACE_PATTERN_INVALID,
            "warning",
            "manifest",
            `Workspace pattern '${item.pattern}' from '${item.source}' did not match any directories`,
            { path: item.pattern, recoverable: true }
          )
        );
      }
    } catch (err) {
      diagnostics.push(
        diagnostic(
          DiagnosticCode.WORKSPACE_PATTERN_INVALID,
          "warning",
          "manifest",
          `Invalid workspace pattern '${item.pattern}': ${(err as Error).message}`,
          { path: item.pattern, recoverable: true }
        )
      );
    }
  }

  return dirToPatterns;
}

/**
 * Expand workspace glob patterns into actual directories relative to workspace root.
 */
export function expandWorkspacePatterns(
  patterns: string[],
  workspaceRoot: string,
  diagnostics: ScannerDiagnostic[]
): string[] {
  const items = patterns.map((p) => ({ source: "workspace", pattern: p }));
  const map = expandWorkspacePatternsWithProvenance(items, workspaceRoot, diagnostics);
  return [...map.keys()].sort();
}

function expandPattern(pattern: string, root: string): string[] {
  // Simple patterns without wildcards
  if (!pattern.includes("*")) {
    const fullPath = path.join(root, pattern);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return [pattern.replace(/\\/g, "/")];
    }
    return [];
  }

  // Split pattern into segments
  const segments = pattern.split("/");
  return expandSegments(root, "", segments);
}

function expandSegments(
  currentDir: string,
  currentRel: string,
  segments: string[]
): string[] {
  if (segments.length === 0) {
    return currentRel ? [currentRel.replace(/\\/g, "/")] : [];
  }

  const seg = segments[0]!;

  // Handle ** (match any depth)
  if (seg === "**") {
    const results: string[] = [];
    const remaining = segments.slice(1);

    // Match zero depth
    if (remaining.length > 0) {
      results.push(...expandSegments(currentDir, currentRel, remaining));
    } else {
      // ** at end means everything
      results.push(currentRel || ".");
    }

    // Match one or more depth levels
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const rel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
          results.push(...expandSegments(
            path.join(currentDir, entry.name),
            rel,
            segments // Keep ** for deeper matching
          ));
        }
      }
    } catch { /* skip unreadable */ }

    return results;
  }

  // Handle * (single level wildcard)
  if (seg === "*") {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const rel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
          const remaining = segments.slice(1);
          if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === "*")) {
            results.push(rel);
          } else {
            results.push(...expandSegments(
              path.join(currentDir, entry.name),
              rel,
              remaining
            ));
          }
        }
      }
    } catch { /* skip unreadable */ }
    return results;
  }

  // Exact segment match
  const childDir = path.join(currentDir, seg);
  const childRel = currentRel ? `${currentRel}/${seg}` : seg;
  if (fs.existsSync(childDir) && fs.statSync(childDir).isDirectory()) {
    return expandSegments(childDir, childRel, segments.slice(1));
  }

  return [];
}
