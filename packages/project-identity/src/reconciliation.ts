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
 * - Creates a complete backup of the .ai-optimize directory before modification.
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

  // Create backup before any modification
  const backupId = generateBackupId();
  const backupPath = await createAiOptDirBackup(aiOptDir, backupId);

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
    throw new IdentityError(
      "IDENTITY_RECONCILIATION_FAILED",
      `Reconciliation failed: ${(err as Error).message}. Backup preserved at ${backupPath}.`,
      { backupPath, originalError: (err as Error).message }
    );
  }
}

/**
 * Create a timestamped backup of the entire .ai-optimize directory.
 */
async function createAiOptDirBackup(
  aiOptDir: string,
  backupId: string
): Promise<string> {
  const backupDir = path.join(aiOptDir, "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `${backupId}-pre-reconcile.json`);

  // Snapshot all JSON files in .ai-optimize (excluding backups dir itself)
  const snapshot: Record<string, unknown> = {
    backupId,
    timestamp: new Date().toISOString(),
    files: {}
  };

  if (fs.existsSync(aiOptDir)) {
    for (const entry of fs.readdirSync(aiOptDir)) {
      if (entry === "backups") continue;
      const fullPath = path.join(aiOptDir, entry);
      try {
        if (fs.statSync(fullPath).isFile()) {
          (snapshot["files"] as Record<string, string>)[entry] = fs.readFileSync(
            fullPath,
            "utf-8"
          );
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), "utf-8");
  return backupPath;
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
