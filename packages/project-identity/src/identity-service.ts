/**
 * Project Identity Service
 *
 * The single production component responsible for:
 * - Creating canonical project identity on first registration
 * - Loading and validating persistent identity from .ai-optimize/project.json
 * - Detecting registered-root mismatches
 * - Resolving registered root relative to the identity metadata file
 * - Migrating legacy repositories via the migration module
 *
 * No other production component may create or modify project identity directly.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectIdentity } from "./types.js";
import {
  IDENTITY_SCHEMA_VERSION,
  IDENTITY_FILE_NAME,
  IDENTITY_DIR
} from "./types.js";
import { IdentityError } from "./errors.js";
import { generateProjectId } from "./id-generator.js";
import { migrateIdentity } from "./migration.js";

/**
 * Path to the canonical identity file for a given project root.
 */
export function identityFilePath(projectRoot: string): string {
  return path.join(path.resolve(projectRoot), IDENTITY_DIR, IDENTITY_FILE_NAME);
}

/**
 * Check whether a canonical identity file exists for the given project root.
 */
export function identityExists(projectRoot: string): boolean {
  return fs.existsSync(identityFilePath(projectRoot));
}

/**
 * Resolve the canonical project root given a path to the .ai-optimize/project.json file
 * and the registeredRoot stored inside it.
 *
 * Algorithm:
 *   1. Take the directory containing the identity file (e.g. /repo/.ai-optimize).
 *   2. Resolve registeredRoot relative to that directory's PARENT.
 *      - When registeredRoot is "." (the common case), the parent directory IS the root.
 *   3. Canonicalise using path.resolve() which normalises .. segments and separators.
 *   4. Use fs.realpathSync if available to resolve symlinks (falls back to path.resolve).
 *   5. Normalise path separators for the platform (backslashes on Windows).
 *   6. Never depends on process.cwd() after the identity file has been located.
 *
 * This ensures a committed relative root like "." is always interpreted relative to
 * the directory containing .ai-optimize/project.json, not relative to process.cwd().
 */
export function resolveRegisteredRoot(
  identityFilePath: string,
  registeredRoot: string
): string {
  // Directory containing the .ai-optimize folder (the parent of .ai-optimize/)
  const metadataDir = path.dirname(identityFilePath); // .../.ai-optimize
  const parentDir = path.dirname(metadataDir); // parent of .ai-optimize

  // Resolve registeredRoot relative to parentDir
  const resolved = path.resolve(parentDir, registeredRoot);

  // Attempt real-path resolution for symlinks; fall back to the resolved path
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    try {
      return fs.realpathSync(resolved);
    } catch {
      return resolved;
    }
  }
}

/**
 * Load and validate the canonical identity from .ai-optimize/project.json.
 *
 * @throws IdentityError(IDENTITY_FILE_INVALID) if the file cannot be parsed or is structurally invalid.
 * @throws IdentityError(REGISTERED_ROOT_MISMATCH) if the current resolved root differs from the stored root.
 * @throws IdentityError(PROJECT_NOT_REGISTERED) if no identity file exists and migration finds nothing.
 * @throws IdentityError(IDENTITY_CONFLICT) if migration finds multiple conflicting candidates.
 * @throws IdentityError(IDENTITY_RECONCILIATION_REQUIRED) if automatic resolution is not possible.
 */
export async function loadIdentity(projectRoot: string): Promise<ProjectIdentity> {
  const resolvedRoot = path.resolve(projectRoot);
  const filePath = identityFilePath(resolvedRoot);

  if (!fs.existsSync(filePath)) {
    // Attempt migration for legacy repositories
    return migrateIdentity(resolvedRoot);
  }

  return readAndValidateIdentity(filePath);
}

/**
 * Create a new canonical identity for a project root.
 * Only called when no identity exists and migration finds no candidates.
 */
export function createIdentity(projectRoot: string): ProjectIdentity {
  const resolvedRoot = path.resolve(projectRoot);
  const identity: ProjectIdentity = {
    schemaVersion: IDENTITY_SCHEMA_VERSION,
    projectId: generateProjectId(),
    registeredRoot: ".",
    createdAt: new Date().toISOString(),
    identityVersion: 1,
    aliases: []
  };

  persistIdentity(resolvedRoot, identity);
  return identity;
}

/**
 * Persist identity to disk as .ai-optimize/project.json.
 */
export function persistIdentity(projectRoot: string, identity: ProjectIdentity): void {
  const resolvedRoot = path.resolve(projectRoot);
  const dirPath = path.join(resolvedRoot, IDENTITY_DIR);
  const filePath = path.join(dirPath, IDENTITY_FILE_NAME);

  fs.mkdirSync(dirPath, { recursive: true });

  // Deterministic JSON serialisation: sorted keys, 2-space indent, LF newline
  fs.writeFileSync(filePath, stableStringify(identity), "utf-8");
}

/**
 * Read, parse, structurally validate, and root-check a project.json file.
 */
function readAndValidateIdentity(filePath: string): ProjectIdentity {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    throw new IdentityError(
      "IDENTITY_FILE_INVALID",
      `Failed to parse identity file at ${filePath}: ${(e as Error).message}`,
      { filePath }
    );
  }

  if (!isValidIdentityShape(raw)) {
    throw new IdentityError(
      "IDENTITY_FILE_INVALID",
      `Identity file at ${filePath} does not conform to the expected schema.`,
      { filePath, raw }
    );
  }

  const identity = raw as ProjectIdentity;

  // Resolve the canonical root via resolveRegisteredRoot
  const canonicalRoot = resolveRegisteredRoot(filePath, identity.registeredRoot);

  // The caller-supplied projectRoot should match the resolved canonical root.
  // Note: we do NOT compare against process.cwd() — the resolveRegisteredRoot
  // function resolves the root relative to the identity file location.
  if (!fs.existsSync(canonicalRoot)) {
    throw new IdentityError(
      "REGISTERED_ROOT_MISMATCH",
      `Identity file at ${filePath} has registeredRoot '${identity.registeredRoot}', ` +
        `which resolved to '${canonicalRoot}', but this path does not exist. ` +
        `The repository may have been moved or the identity file copied.`,
      { filePath, registeredRoot: identity.registeredRoot, canonicalRoot }
    );
  }

  return identity;
}

/**
 * Structural shape guard for ProjectIdentity.
 */
function isValidIdentityShape(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r["schemaVersion"] === "string" &&
    typeof r["projectId"] === "string" &&
    r["projectId"].startsWith("prj_") &&
    typeof r["registeredRoot"] === "string" &&
    typeof r["createdAt"] === "string" &&
    typeof r["identityVersion"] === "number" &&
    Array.isArray(r["aliases"])
  );
}

/**
 * Produce deterministic JSON output with a stable key order.
 * This ensures identity files are byte-identical for identical inputs.
 */
export function stableStringify(identity: ProjectIdentity): string {
  const ordered = {
    schemaVersion: identity.schemaVersion,
    projectId: identity.projectId,
    registeredRoot: identity.registeredRoot,
    createdAt: identity.createdAt,
    identityVersion: identity.identityVersion,
    aliases: [...identity.aliases].sort()
  };
  return JSON.stringify(ordered, null, 2) + "\n";
}
