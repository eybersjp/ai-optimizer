import * as crypto from "node:crypto";
import {
  ProjectAssertion,
  AssertionStatus,
  EvidenceReference
} from "@ai-optimize/contracts";

/**
 * Parameters for creating a deterministic assertion.
 *
 * To produce a stable deterministic ID:
 *   - Provide projectId, scannerRuleId, scannerRuleVersion, and canonicalSourcePath.
 *   - Do NOT provide an explicit id; it will be derived via SHA-256.
 *
 * To use a caller-supplied override (e.g., for migration records):
 *   - Provide an explicit id.
 */
export interface AssertionParams {
  /** Optional override. When absent, the ID is derived deterministically from canonical fields. */
  id?: string;
  subject: string;
  predicate: string;
  value: unknown;
  status: AssertionStatus;
  confidence: number;
  sources: EvidenceReference[];
  explanation: string;
  /** Stable project ID (from @ai-optimize/project-identity). */
  projectId?: string;
  /** Stable rule/scanner identifier (e.g. "scanner-v1"). */
  scannerRuleId?: string;
  /** Stable rule/scanner version (e.g. "1.0.0"). */
  scannerRuleVersion?: string;
  /** Relative canonical source path (e.g. "package.json"). */
  canonicalSourcePath?: string;
  /** Additional stable scope discriminator. */
  scopeKey?: string;
}

export class EvidenceEngine {
  private assertions: Map<string, ProjectAssertion> = new Map();

  public createAssertion(params: AssertionParams): ProjectAssertion {
    const id = params.id ?? deriveAssertionId(params);
    const assertion: ProjectAssertion = {
      id,
      subject: params.subject,
      predicate: params.predicate,
      value: params.value,
      status: params.status,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      sources: params.sources,
      explanation: params.explanation,
      createdAt: new Date().toISOString()
    };

    this.assertions.set(id, assertion);
    return assertion;
  }

  public getAssertions(): ProjectAssertion[] {
    return Array.from(this.assertions.values());
  }

  public getAssertionsBySubject(subject: string): ProjectAssertion[] {
    return this.getAssertions().filter((a) => a.subject === subject);
  }

  public clear(): void {
    this.assertions.clear();
  }
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
 *   6. canonicalSourcePath
 *   7. scopeKey
 *
 * When optional fields are absent, the empty string is used as their value.
 * No timestamps, no random values, no absolute paths.
 */
function deriveAssertionId(params: AssertionParams): string {
  const fields = [
    params.projectId ?? "",
    params.scannerRuleId ?? "scanner-v1",
    params.scannerRuleVersion ?? "1.0.0",
    params.subject,
    params.predicate,
    params.canonicalSourcePath ?? "",
    params.scopeKey ?? ""
  ];
  const input = fields.join("\x00");
  const digest = crypto.createHash("sha256").update(input, "utf8").digest("hex");
  return `ast_${digest}`;
}
