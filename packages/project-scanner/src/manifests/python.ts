/**
 * Python manifest parsers.
 *
 * Detects Python projects via pyproject.toml, requirements.txt, setup.py, setup.cfg, Pipfile.
 * Uses basic parsers that are robust against malformed files.
 */
import * as fs from "node:fs";

export interface PythonProjectData {
  name?: string;
  version?: string;
  dependencies?: string[];
  devDependencies?: string[];
}

/**
 * Parse pyproject.toml using a simple line-based approach.
 * Does not require a full TOML parser.
 */
export function parsePyprojectToml(filePath: string): { data: PythonProjectData | null; error?: string } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: PythonProjectData = {};
    let inProject = false;
    let inDeps = false;
    let inOptDeps = false;

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      if (trimmed.startsWith("[project]")) {
        inProject = true;
        inDeps = false;
        inOptDeps = false;
        continue;
      }
      if (trimmed.startsWith("[tool.") || trimmed.startsWith("[build-system]")) {
        inProject = false;
        inDeps = false;
        inOptDeps = false;
        continue;
      }
      if (trimmed.startsWith("dependencies =") || trimmed === "dependencies = [") {
        if (inProject) {
          inDeps = true;
          data.dependencies = [];
          continue;
        }
      }
      if (trimmed === "]" && inDeps) {
        inDeps = false;
        continue;
      }

      if (inProject) {
        if (trimmed.startsWith("name = ")) {
          data.name = extractTomlString(trimmed);
        } else if (trimmed.startsWith("version = ")) {
          data.version = extractTomlString(trimmed);
        }
      }

      if (inDeps) {
        const dep = trimmed.replace(/^"|"$/g, "").replace(/,/g, "").trim();
        if (dep && data.dependencies) {
          data.dependencies.push(dep);
        }
      }
    }

    return { data: data.name ? data : null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Parse requirements.txt (simple line-by-line, no markers/extras).
 */
export function parseRequirementsTxt(filePath: string): { data: string[] | null; error?: string } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const deps: string[] = [];

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
      // Take only the package name (before version specifiers)
      const pkg = trimmed.split(/[<>=~!@]/)[0]?.trim();
      if (pkg) deps.push(pkg);
    }

    return { data: deps.length > 0 ? deps : null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

/** Extract a TOML string value from a key = "value" line. */
function extractTomlString(line: string): string {
  const match = line.match(/=\s*"([^"]*)"/);
  return match ? match[1]! : "";
}
