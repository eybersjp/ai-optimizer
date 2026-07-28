/**
 * Cryptographically secure identifier generators.
 *
 * All identifiers use node:crypto.randomUUID() (128-bit entropy).
 * Math.random() is never used.
 * Each generator returns a collision-resistant, clearly prefixed string.
 */
import * as crypto from "node:crypto";

/**
 * Generate the prefix portion of a UUID-derived identifier.
 * Uses crypto.randomUUID() for 128-bit random entropy (RFC 4122 UUID v4).
 * Strips hyphens and converts the UUID hex chars (32 nibbles = 128 bits).
 */
function uuidHex(uppercase: boolean): string {
  const raw = crypto.randomUUID().replace(/-/g, "");
  return uppercase ? raw.toUpperCase() : raw.toLowerCase();
}

/**
 * Generate a stable project ID.
 * Format: prj_<32 uppercase hex chars> (128-bit entropy via randomUUID)
 */
export function generateProjectId(): string {
  return `prj_${uuidHex(true)}`;
}

/**
 * Generate a cryptographically secure activation ID.
 * Format: act_<32 lowercase hex chars> (128-bit entropy via randomUUID)
 */
export function generateActivationId(): string {
  return `act_${uuidHex(false)}`;
}

/**
 * Generate a cryptographically secure backup ID.
 * Format: bk_<32 lowercase hex chars> (128-bit entropy via randomUUID)
 */
export function generateBackupId(): string {
  return `bk_${uuidHex(false)}`;
}

/**
 * Generate a cryptographically secure event ID.
 * Format: evt_<32 lowercase hex chars> (128-bit entropy via randomUUID)
 */
export function generateEventId(): string {
  return `evt_${uuidHex(false)}`;
}

/**
 * Generate a cryptographically secure correlation ID.
 * Format: cor_<32 lowercase hex chars> (128-bit entropy via randomUUID)
 */
export function generateCorrelationId(): string {
  return `cor_${uuidHex(false)}`;
}
