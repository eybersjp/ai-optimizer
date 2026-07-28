/**
 * Project Identity Domain Types
 *
 * Canonical persistent metadata for a registered project.
 * This is the source of truth for project identity across all operations.
 */

export const IDENTITY_SCHEMA_VERSION = "1.0.0" as const;
export const IDENTITY_FILE_NAME = "project.json" as const;
export const IDENTITY_DIR = ".ai-optimize" as const;

/**
 * The canonical project identity record persisted in .ai-optimize/project.json.
 */
export interface ProjectIdentity {
  /** Schema version for forward-compatible evolution. */
  schemaVersion: typeof IDENTITY_SCHEMA_VERSION;
  /** Stable canonical project ID (prj_ prefix, crypto-generated). */
  projectId: string;
  /** Relative path to the project root from its registered location. Always "." for the canonical root. */
  registeredRoot: string;
  /** ISO 8601 timestamp of initial registration. Never updated. */
  createdAt: string;
  /** Identity format version for migration tracking. */
  identityVersion: number;
  /** Superseded or legacy project IDs recorded during migration. Never deleted. */
  aliases: string[];
}

/**
 * A candidate project ID discovered during migration scan.
 */
export interface IdentityCandidate {
  /** The candidate project ID. */
  projectId: string;
  /** Where this candidate was found. */
  source: IdentityCandidateSource;
  /** Human-readable description of discovery. */
  description: string;
}

export type IdentityCandidateSource =
  | "project-profile"
  | "managed-artifacts"
  | "events-jsonl"
  | "backup-snapshot"
  | "project-json";

/**
 * Parameters for deriving a deterministic assertion ID.
 * All fields must be stable canonical values — no timestamps, no randoms.
 */
export interface AssertionIdParams {
  projectId: string;
  scannerRuleId: string;
  scannerRuleVersion: string;
  subject: string;
  predicate: string;
  /** Relative canonical source path, or empty string if not applicable. */
  canonicalSourcePath: string;
  /** Stable string encoding of the scope, or empty string. */
  scopeKey?: string;
}
