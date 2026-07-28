/**
 * Deterministic Assertion Identity
 *
 * Derives stable SHA-256-based assertion IDs from canonical evidence data.
 *
 * Rules:
 *  - Input is stable canonical data only (no timestamps, no randoms, no absolute paths).
 *  - Fields are serialised in a fixed, documented order.
 *  - Output is a hex-encoded SHA-256 digest prefixed with "ast_".
 *
 * The assertion ID is identical across runs for identical canonical input.
 */
import * as crypto from "node:crypto";
import type { AssertionIdParams } from "./types.js";

/**
 * Derive a stable, deterministic assertion ID from canonical evidence parameters.
 *
 * Input field order (stable serialisation, newline-separated):
 *   1. projectId
 *   2. scannerRuleId
 *   3. scannerRuleVersion
 *   4. subject
 *   5. predicate
 *   6. canonicalSourcePath
 *   7. scopeKey (empty string when not provided)
 */
export function deriveAssertionId(params: AssertionIdParams): string {
  const fields = [
    params.projectId,
    params.scannerRuleId,
    params.scannerRuleVersion,
    params.subject,
    params.predicate,
    params.canonicalSourcePath,
    params.scopeKey ?? ""
  ];

  // Stable serialisation: join with NUL byte to prevent field-boundary collisions
  const input = fields.join("\x00");
  const digest = crypto.createHash("sha256").update(input, "utf8").digest("hex");
  return `ast_${digest}`;
}
