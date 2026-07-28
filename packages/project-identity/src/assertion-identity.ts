/**
 * Deterministic Assertion Identity
 *
 * Derives stable SHA-256-based assertion IDs from canonical evidence data.
 *
 * Rules:
 *  - Input is stable canonical data only (no timestamps, no randoms, no absolute paths).
 *  - Fields are serialised in a fixed, documented order.
 *  - Path separators in canonicalSourcePath are normalised to forward slashes.
 *  - scopeKey and sourceLineRange are stable scope discriminators.
 *  - Output is a hex-encoded SHA-256 digest prefixed with "ast_".
 *
 * The assertion ID is identical across runs for identical canonical input.
 */
import * as crypto from "node:crypto";
import type { AssertionIdParams } from "./types.js";

/**
 * Normalise a canonical source path for stable hashing.
 * - Converts backslashes to forward slashes (Windows → POSIX)
 * - Collapses repeated slashes
 * - Strips leading ./ or .\ prefix
 * - Does NOT resolve .. segments (that could change the logical path)
 */
function normalisePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/\/+/g, "/").replace(/^\.\//, "");
}

/**
 * Derive a stable, deterministic assertion ID from canonical evidence parameters.
 *
 * Input field order (stable serialisation, NUL-separated):
 *   1. projectId
 *   2. scannerRuleId
 *   3. scannerRuleVersion
 *   4. subject
 *   5. predicate
 *   6. canonicalSourcePath (path separators normalised → forward slashes)
 *   7. scopeKey (empty string when not provided)
 *   8. sourceLineRange (empty string when not provided)
 *
 * Object property ordering does not affect the ID because fields are always
 * serialised in the exact order shown above.
 */
export function deriveAssertionId(params: AssertionIdParams): string {
  const fields = [
    params.projectId,
    params.scannerRuleId,
    params.scannerRuleVersion,
    params.subject,
    params.predicate,
    normalisePath(params.canonicalSourcePath),
    params.scopeKey ?? "",
    params.sourceLineRange ?? ""
  ];

  // Stable serialisation: join with NUL byte to prevent field-boundary collisions
  const input = fields.join("\x00");
  const digest = crypto.createHash("sha256").update(input, "utf8").digest("hex");
  return `ast_${digest}`;
}
