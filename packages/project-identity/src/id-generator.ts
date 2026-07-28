/**
 * Cryptographically secure identifier generators.
 *
 * All identifiers use node:crypto. Math.random() is never used.
 * Each generator returns a collision-resistant, clearly prefixed string.
 */
import * as crypto from "node:crypto";

/**
 * Generate a stable project ID.
 * Format: prj_<16 uppercase hex chars>
 */
export function generateProjectId(): string {
  const bytes = crypto.randomBytes(8);
  return `prj_${bytes.toString("hex").toUpperCase()}`;
}

/**
 * Generate a cryptographically secure activation ID.
 * Format: act_<16 lowercase hex chars>
 */
export function generateActivationId(): string {
  const bytes = crypto.randomBytes(8);
  return `act_${bytes.toString("hex")}`;
}

/**
 * Generate a cryptographically secure backup ID.
 * Format: bk_<16 lowercase hex chars>
 */
export function generateBackupId(): string {
  const bytes = crypto.randomBytes(8);
  return `bk_${bytes.toString("hex")}`;
}

/**
 * Generate a cryptographically secure event ID.
 * Format: evt_<20 lowercase hex chars>
 */
export function generateEventId(): string {
  const bytes = crypto.randomBytes(10);
  return `evt_${bytes.toString("hex")}`;
}

/**
 * Generate a cryptographically secure correlation ID.
 * Format: cor_<16 lowercase hex chars>
 */
export function generateCorrelationId(): string {
  const bytes = crypto.randomBytes(8);
  return `cor_${bytes.toString("hex")}`;
}
