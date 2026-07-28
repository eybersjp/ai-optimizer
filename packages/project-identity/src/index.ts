/**
 * @ai-optimize/project-identity
 *
 * Canonical project identity domain service.
 *
 * This package is the only production component responsible for creating,
 * loading, validating, migrating, or reconciling project identity.
 *
 * Public API:
 *   - Types and constants
 *   - Structured error types
 *   - Cryptographic identifier generators (no Math.random())
 *   - Deterministic assertion ID derivation
 *   - Identity lifecycle (create, load, persist)
 *   - Legacy migration
 *   - Controlled reconciliation
 */

// Types
export type {
  ProjectIdentity,
  IdentityCandidate,
  IdentityCandidateSource,
  AssertionIdParams
} from "./types.js";
export {
  IDENTITY_SCHEMA_VERSION,
  IDENTITY_FILE_NAME,
  IDENTITY_DIR
} from "./types.js";

// Errors
export { IdentityError, isIdentityError } from "./errors.js";
export type { IdentityErrorCode } from "./errors.js";

// ID generators
export {
  generateProjectId,
  generateActivationId,
  generateBackupId,
  generateEventId,
  generateCorrelationId
} from "./id-generator.js";

// Assertion identity
export { deriveAssertionId } from "./assertion-identity.js";

// Identity lifecycle
export {
  identityFilePath,
  identityExists,
  loadIdentity,
  createIdentity,
  persistIdentity,
  stableStringify,
  resolveRegisteredRoot
} from "./identity-service.js";

// Migration
export { migrateIdentity, discoverCandidates } from "./migration.js";

// Reconciliation
export {
  getIdentityStatus,
  reconcileIdentity
} from "./reconciliation.js";
export type { ReconciliationStatus, ReconciliationResult } from "./reconciliation.js";
