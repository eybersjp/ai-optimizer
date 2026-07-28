/**
 * Legacy Identity Migration
 *
 * Safe migration for repositories that do not yet have .ai-optimize/project.json.
 *
 * Candidate discovery sources (in precedence order):
 *   1. .ai-optimize/project.json (already handled by caller — this module only runs when absent)
 *   2. Consistent project identity in durable event history (.ai-optimize/events.jsonl)
 *   3. Consistent identity in managed-artifact activation ledger (managed-artifacts.json)
 *   4. Legacy project-profile identity (project-profile.json)
 *   5. Backup snapshots (.ai-optimize/backups/*.json)
 *
 * Migration rules:
 *   - 0 candidates → create a new canonical ID and write project.json
 *   - 1 unique candidate → adopt it and write project.json
 *   - 2+ unique candidates → throw IDENTITY_CONFLICT with all candidates and their sources
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectIdentity, IdentityCandidate } from "./types.js";
import { IDENTITY_SCHEMA_VERSION, IDENTITY_DIR } from "./types.js";
import { IdentityError } from "./errors.js";
import { generateProjectId } from "./id-generator.js";
import { persistIdentity } from "./identity-service.js";

/**
 * Run migration for a legacy repository (no project.json present).
 * Returns the resolved canonical identity after writing project.json.
 */
export async function migrateIdentity(resolvedRoot: string): Promise<ProjectIdentity> {
  const candidates = discoverCandidates(resolvedRoot);
  const uniqueIds = [...new Set(candidates.map((c) => c.projectId))];

  if (uniqueIds.length === 0) {
    // No prior identity — create fresh
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

  if (uniqueIds.length === 1) {
    // Exactly one unique candidate — adopt it
    const identity: ProjectIdentity = {
      schemaVersion: IDENTITY_SCHEMA_VERSION,
      projectId: uniqueIds[0]!,
      registeredRoot: ".",
      createdAt: new Date().toISOString(),
      identityVersion: 1,
      aliases: []
    };
    persistIdentity(resolvedRoot, identity);
    return identity;
  }

  // Multiple conflicting candidates — do not guess, report conflict
  throw new IdentityError(
    "IDENTITY_CONFLICT",
    `Multiple conflicting project IDs discovered during migration. ` +
      `Found ${uniqueIds.length} unique IDs: ${uniqueIds.join(", ")}. ` +
      `Run 'ai-optimize identity reconcile' to resolve.`,
    { candidates }
  );
}

/**
 * Discover candidate project IDs from all available legacy sources.
 */
export function discoverCandidates(resolvedRoot: string): IdentityCandidate[] {
  const aiOptDir = path.join(resolvedRoot, IDENTITY_DIR);
  const candidates: IdentityCandidate[] = [];

  // Source: project-profile.json
  const profilePath = path.join(aiOptDir, "project-profile.json");
  if (fs.existsSync(profilePath)) {
    try {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8")) as Record<string, unknown>;
      const id = (profile["project"] as Record<string, unknown> | undefined)?.[
        "id"
      ] as string | undefined;
      if (id && isProjectIdFormat(id)) {
        candidates.push({
          projectId: id,
          source: "project-profile",
          description: `Found in .ai-optimize/project-profile.json`
        });
      }
    } catch {
      // Malformed — skip
    }
  }

  // Source: managed-artifacts.json
  const managedPath = path.join(aiOptDir, "managed-artifacts.json");
  if (fs.existsSync(managedPath)) {
    try {
      const managed = JSON.parse(fs.readFileSync(managedPath, "utf-8")) as unknown[];
      const managedIds = new Set<string>();
      for (const record of managed) {
        const r = record as Record<string, unknown>;
        const id = r["projectId"] as string | undefined;
        if (id && isProjectIdFormat(id)) {
          managedIds.add(id);
        }
      }
      for (const id of managedIds) {
        candidates.push({
          projectId: id,
          source: "managed-artifacts",
          description: `Found in .ai-optimize/managed-artifacts.json`
        });
      }
    } catch {
      // Malformed — skip
    }
  }

  // Source: events.jsonl
  const eventsPath = path.join(aiOptDir, "events.jsonl");
  if (fs.existsSync(eventsPath)) {
    try {
      const lines = fs.readFileSync(eventsPath, "utf-8").split("\n").filter(Boolean);
      const eventIds = new Set<string>();
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          const id = event["projectId"] as string | undefined;
          if (id && isProjectIdFormat(id)) {
            eventIds.add(id);
          }
        } catch {
          // Malformed line — skip
        }
      }
      for (const id of eventIds) {
        candidates.push({
          projectId: id,
          source: "events-jsonl",
          description: `Found in .ai-optimize/events.jsonl`
        });
      }
    } catch {
      // Unreadable — skip
    }
  }

  // Source: backup snapshots
  const backupsDir = path.join(aiOptDir, "backups");
  if (fs.existsSync(backupsDir)) {
    try {
      const backupFiles = fs
        .readdirSync(backupsDir)
        .filter((f) => f.endsWith(".json"))
        .sort();
      const backupIds = new Set<string>();
      for (const file of backupFiles) {
        try {
          const snapshot = JSON.parse(
            fs.readFileSync(path.join(backupsDir, file), "utf-8")
          ) as Record<string, unknown>;
          const id = snapshot["projectId"] as string | undefined;
          if (id && isProjectIdFormat(id)) {
            backupIds.add(id);
          }
        } catch {
          // Malformed — skip
        }
      }
      for (const id of backupIds) {
        candidates.push({
          projectId: id,
          source: "backup-snapshot",
          description: `Found in .ai-optimize/backups/`
        });
      }
    } catch {
      // Unreadable — skip
    }
  }

  return candidates;
}

/**
 * Validate that a string matches the expected project ID format (prj_ prefix).
 */
function isProjectIdFormat(id: string): boolean {
  return typeof id === "string" && id.startsWith("prj_") && id.length > 4;
}
