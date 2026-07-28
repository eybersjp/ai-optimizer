/**
 * Project Identity Service
 *
 * The single production component responsible for:
 * - Creating canonical project identity on first registration
 * - Loading and validating persistent identity from .ai-optimize/project.json
 * - Detecting registered-root mismatches
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

  return readAndValidateIdentity(resolvedRoot, filePath);
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
 * Read, parse, and structurally validate a project.json file.
 */
function readAndValidateIdentity(resolvedRoot: string, filePath: string): ProjectIdentity {
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

  // Registered-root validation: the stored root must match the actual resolved root.
  // We store "." as a relative reference, which always matches its own root.
  // If the stored value is an absolute path that differs from the current root,
  // report a mismatch (handles cloned or moved repositories).
  if (
    identity.registeredRoot !== "." &&
    path.resolve(identity.registeredRoot) !== resolvedRoot
  ) {
    throw new IdentityError(
      "REGISTERED_ROOT_MISMATCH",
      `Identity file references root '${identity.registeredRoot}' but current root is '${resolvedRoot}'.`,
      { storedRoot: identity.registeredRoot, currentRoot: resolvedRoot, filePath }
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
