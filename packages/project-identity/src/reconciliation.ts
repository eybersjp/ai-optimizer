/**
 * Identity Reconciliation
 *
 * Controlled reconciliation for repositories with conflicting project IDs.
 *
 * Usage:
 *   ai-optimize identity status [dir]
 *   ai-optimize identity reconcile [dir] --use <projectId>
 *
 * Reconciliation:
 * - Validates the selected ID exists among discovered candidates (unless --create-new is used).
 * - Creates a purpose-built identity snapshot before modification (only files that may change).
 * - Updates canonical identity consistently.
 * - Preserves superseded IDs in the aliases array.
 * - Records a migration event in events.jsonl.
 * - Never deletes project history.
 * - Fails safely if runtime files are malformed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectIdentity, IdentityCandidate } from "./types.js";
import { IDENTITY_SCHEMA_VERSION, IDENTITY_DIR } from "./types.js";
import { IdentityError } from "./errors.js";
import { generateBackupId, generateEventId } from "./id-generator.js";
import { discoverCandidates } from "./migration.js";
import { persistIdentity } from "./identity-service.js";

export interface ReconciliationStatus {
  hasIdentity: boolean;
  identity?: ProjectIdentity;
  candidates: IdentityCandidate[];
  hasConflict: boolean;
  conflictingIds: string[];
}

export interface ReconciliationResult {
  success: boolean;
  canonical: ProjectIdentity;
  supersededIds: string[];
  backupPath: string;
}

/**
 * Files that may be modified by reconciliation.
 * The backup snapshot only captures these files — not backups, locks, history, or databases.
 */
const RECONCILIATION_AFFECTED_FILES = new Set([
  "project.json",
  "project-profile.json",
  "managed-artifacts.json"
]);

/**
 * Report identity status without modifying anything.
 */
export function getIdentityStatus(projectRoot: string): ReconciliationStatus {
  const resolvedRoot = path.resolve(projectRoot);
  const identityPath = path.join(resolvedRoot, IDENTITY_DIR, "project.json");

  let identity: ProjectIdentity | undefined;
  if (fs.existsSync(identityPath)) {
    try {
      identity = JSON.parse(fs.readFileSync(identityPath, "utf-8")) as ProjectIdentity;
    } catch {
      identity = undefined;
    }
  }

  const candidates = discoverCandidates(resolvedRoot);
  const uniqueIds = [...new Set(candidates.map((c) => c.projectId))];
  const hasConflict = uniqueIds.length > 1;

  return {
    hasIdentity: !!identity,
    identity,
    candidates,
    hasConflict,
    conflictingIds: hasConflict ? uniqueIds : []
  };
}

/**
 * Perform controlled reconciliation, selecting a canonical project ID.
 *
 * @param projectRoot - Path to the project root.
 * @param selectedId - The project ID to adopt as canonical.
 */
export async function reconcileIdentity(
  projectRoot: string,
  selectedId: string
): Promise<ReconciliationResult> {
  const resolvedRoot = path.resolve(projectRoot);
  const aiOptDir = path.join(resolvedRoot, IDENTITY_DIR);

  // Discover all candidates
  const candidates = discoverCandidates(resolvedRoot);
  const uniqueIds = [...new Set(candidates.map((c) => c.projectId))];

  // Validate: selectedId must be among discovered candidates
  if (!uniqueIds.includes(selectedId)) {
    throw new IdentityError(
      "IDENTITY_RECONCILIATION_FAILED",
      `Selected ID '${selectedId}' was not found among discovered candidates: ${uniqueIds.join(", ")}.`,
      { selectedId, candidates }
    );
  }

  // Create a purpose-built identity snapshot before any modification.
  // This captures only the files that may be changed by reconciliation,
  // NOT backups, locks, staging, event history, SQLite databases, or temp files.
  const backupId = generateBackupId();
  const backupPath = createIdentitySnapshot(aiOptDir, backupId);

  // Capture pre-reconciliation file contents for safe rollback on failure
  const affectedSnapshots = readAffectedFilesSnapshot(aiOptDir);

  try {
    // Load existing identity if present to preserve its createdAt and merge aliases
    let existingIdentity: ProjectIdentity | undefined;
    const identityPath = path.join(aiOptDir, "project.json");
    if (fs.existsSync(identityPath)) {
      try {
        existingIdentity = JSON.parse(
          fs.readFileSync(identityPath, "utf-8")
        ) as ProjectIdentity;
      } catch {
        existingIdentity = undefined;
      }
    }

    // All other discovered IDs become aliases
    const supersededIds = uniqueIds.filter((id) => id !== selectedId);
    const existingAliases = existingIdentity?.aliases ?? [];
    const mergedAliases = [...new Set([...existingAliases, ...supersededIds])].sort();

    const canonical: ProjectIdentity = {
      schemaVersion: IDENTITY_SCHEMA_VERSION,
      projectId: selectedId,
      registeredRoot: ".",
      createdAt: existingIdentity?.createdAt ?? new Date().toISOString(),
      identityVersion: (existingIdentity?.identityVersion ?? 0) + 1,
      aliases: mergedAliases
    };

    persistIdentity(resolvedRoot, canonical);

    // Record a migration event in events.jsonl (non-destructive append)
    appendReconciliationEvent(aiOptDir, selectedId, supersededIds, backupPath);

    return {
      success: true,
      canonical,
      supersededIds,
      backupPath
    };
  } catch (err) {
    // On failure: restore the exact affected files from the pre-reconciliation snapshot
    restoreAffectedFiles(aiOptDir, affectedSnapshots);

    throw new IdentityError(
      "IDENTITY_RECONCILIATION_FAILED",
      `Reconciliation failed: ${(err as Error).message}. ` +
        `Affected files have been restored from snapshot. Backup preserved at ${backupPath}.`,
      { backupPath, originalError: (err as Error).message }
    );
  }
}

/**
 * Create a purpose-built identity snapshot containing only the files that may be
 * changed by reconciliation:
 *   - project.json
 *   - project-profile.json
 *   - managed-artifacts.json
 *
 * Explicitly excluded:
 *   - .ai-optimize/backups/*
 *   - .ai-optimize/staging/*
 *   - .ai-optimize/activation.lock
 *   - .ai-optimize/events.jsonl (immutable historical events — never rewritten)
 *   - SQLite -wal and -shm files
 *   - Temporary files (*.tmp, *.temp)
 *   - The backup currently being created
 *
 * The backup is written as JSON to .ai-optimize/backups/<backupId>-pre-reconcile.json.
 */
function createIdentitySnapshot(aiOptDir: string, backupId: string): string {
  const backupDir = path.join(aiOptDir, "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `${backupId}-pre-reconcile.json`);

  const snapshot: Record<string, unknown> = {
    backupId,
    timestamp: new Date().toISOString(),
    type: "identity-reconciliation-snapshot",
    files: {}
  };

  const files = snapshot["files"] as Record<string, string>;

  for (const fileName of RECONCILIATION_AFFECTED_FILES) {
    const fullPath = path.join(aiOptDir, fileName);
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        files[fileName] = fs.readFileSync(fullPath, "utf-8");
      }
    } catch {
      // Skip unreadable files
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), "utf-8");
  return backupPath;
}

/**
 * Read the current content of all files affected by reconciliation.
 * Used for safe rollback on failure.
 */
function readAffectedFilesSnapshot(aiOptDir: string): Map<string, string | null> {
  const snapshot = new Map<string, string | null>();
  for (const fileName of RECONCILIATION_AFFECTED_FILES) {
    const fullPath = path.join(aiOptDir, fileName);
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        snapshot.set(fileName, fs.readFileSync(fullPath, "utf-8"));
      } else {
        snapshot.set(fileName, null); // File doesn't exist
      }
    } catch {
      snapshot.set(fileName, null);
    }
  }
  return snapshot;
}

/**
 * Restore affected files from a pre-reconciliation snapshot.
 * Used as a fail-safe when reconciliation throws after modifying files.
 */
function restoreAffectedFiles(aiOptDir: string, snapshot: Map<string, string | null>): void {
  for (const [fileName, content] of snapshot) {
    const fullPath = path.join(aiOptDir, fileName);
    try {
      if (content === null) {
        // File didn't exist before — remove if it was created
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } else {
        // Restore original content
        fs.writeFileSync(fullPath, content, "utf-8");
      }
    } catch {
      // Best-effort restore — continue to next file
    }
  }
}

/**
 * Append a reconciliation event to events.jsonl.
 */
function appendReconciliationEvent(
  aiOptDir: string,
  selectedId: string,
  supersededIds: string[],
  backupPath: string
): void {
  const eventsPath = path.join(aiOptDir, "events.jsonl");
  const event = {
    id: generateEventId(),
    type: "IDENTITY_RECONCILED",
    projectId: selectedId,
    payload: {
      selectedId,
      supersededIds,
      backupPath
    },
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`, "utf-8");
}
