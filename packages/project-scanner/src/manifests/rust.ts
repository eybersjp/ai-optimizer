/**
 * Rust Cargo.toml parser — Detects Rust projects and dependencies.
 */
import * as fs from "node:fs";

export interface CargoData {
  name?: string;
  version?: string;
  edition?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  isWorkspace?: boolean;
  members?: string[];
}

/**
 * Parse Cargo.toml using a simple line-based approach.
 */
export function parseCargoToml(filePath: string): { data: CargoData | null; error?: string } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: CargoData = {};
    let inPackage = false;
    let inDeps = false;
    let inDevDeps = false;
    let inWorkspace = false;

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      if (trimmed.startsWith("[package]")) {
        inPackage = true;
        inDeps = false;
        inDevDeps = false;
        inWorkspace = false;
        continue;
      }
      if (trimmed.startsWith("[dependencies]")) {
        inPackage = false;
        inDeps = true;
        inDevDeps = false;
        inWorkspace = false;
        continue;
      }
      if (trimmed.startsWith("[dev-dependencies]")) {
        inPackage = false;
        inDeps = false;
        inDevDeps = true;
        inWorkspace = false;
        continue;
      }
      if (trimmed.startsWith("[workspace]")) {
        inPackage = false;
        inDeps = false;
        inDevDeps = false;
        inWorkspace = true;
        data.isWorkspace = true;
        continue;
      }
      if (trimmed.startsWith("[")) {
        inPackage = false;
        inDeps = false;
        inDevDeps = false;
        inWorkspace = false;
        continue;
      }

      if (inPackage) {
        if (trimmed.startsWith("name = ")) {
          data.name = extractCargoString(trimmed);
        } else if (trimmed.startsWith("version = ")) {
          data.version = extractCargoString(trimmed);
        } else if (trimmed.startsWith("edition = ")) {
          data.edition = extractCargoString(trimmed);
        }
      }

      if (inDeps && trimmed.includes("=")) {
        if (!data.dependencies) data.dependencies = {};
        const parts = trimCargoDep(trimmed);
        if (parts) data.dependencies[parts[0]] = parts[1];
      }

      if (inDevDeps && trimmed.includes("=")) {
        if (!data.devDependencies) data.devDependencies = {};
        const parts = trimCargoDep(trimmed);
        if (parts) data.devDependencies[parts[0]] = parts[1];
      }

      if (inWorkspace && trimmed.startsWith("members = ")) {
        const match = trimmed.match(/=\s*\[(.*)\]/);
        if (match && match[1]) {
          data.members = match[1].split(",").map((s) => s.trim().replace(/"/g, "")).filter(Boolean);
        }
      }
    }

    return { data: data.name || data.isWorkspace ? data : null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

function extractCargoString(line: string): string {
  const match = line.match(/=\s*"([^"]*)"/);
  return match ? match[1]! : line.split("=")[1]?.trim() ?? "";
}

function trimCargoDep(line: string): [string, string] | null {
  const parts = line.split("=").map((s) => s.trim());
  if (parts.length < 2) return null;
  const name = parts[0]!.replace(/"/g, "");
  let version = parts.slice(1).join("=").replace(/"/g, "").trim();
  // Handle inline tables like { version = "1.0", features = [...] }
  if (version.startsWith("{")) {
    const verMatch = version.match(/version\s*=\s*"([^"]*)"/);
    version = verMatch ? verMatch[1]! : "unknown";
  }
  return [name, version];
}
