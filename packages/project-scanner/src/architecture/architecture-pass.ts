/**
 * Architecture Pass (Pass 5) — Deterministic Architectural Synthesis.
 *
 * Pass ID: "architecture"
 * Version: "1.0.0"
 *
 * Derives architectural findings from evidence using deterministic rules.
 * Does NOT call an external LLM.
 */
import type { ScannerPass, ScannerContext, ScannerPassResult, ArchitectureFinding, PackageGraph, WorkspacePackage } from "../contracts.js";
import type { ScannerConfiguration } from "../configuration.js";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";
import { deriveAssertionId } from "@ai-optimize/project-identity";

const RULE_ID = "architecture-rule";
const RULE_VERSION = "1.0.0";

export class ArchitecturePass implements ScannerPass {
  readonly id = "architecture";
  readonly version = RULE_VERSION;

  constructor(_config: ScannerConfiguration) {}

  run(context: ScannerContext): ScannerPassResult {
    const evidence = new EvidenceEngine();
    const findings: ArchitectureFinding[] = [];

    // Finding 1: Monorepo topology
    if (context.workspacePackages.length > 1) {
      findings.push(this.makeFinding(
        "architecture",
        "topology-type",
        "monorepo",
        "observed",
        1.0,
        [`${context.workspacePackages.length} workspace packages detected`],
        "Multi-package workspace topology"
      ));
    } else {
      findings.push(this.makeFinding(
        "architecture",
        "topology-type",
        "single-package",
        "observed",
        1.0,
        ["Single package in repository"],
        "Single-package repository topology"
      ));
    }

    // Finding 2: Frontend/backend separation
    const frontendPkgs = context.workspacePackages.filter((p) => p.role === "frontend");
    const backendPkgs = context.workspacePackages.filter((p) => p.role === "daemon-service");

    if (frontendPkgs.length > 0 && backendPkgs.length > 0) {
      findings.push(this.makeFinding(
        "architecture",
        "frontend-backend-separation",
        true,
        "observed",
        1.0,
        [...frontendPkgs.map((p) => p.relativeDir), ...backendPkgs.map((p) => p.relativeDir)],
        "Frontend and backend packages are separated in the workspace"
      ));
    }

    // Finding 3: Shared contracts architecture
    const contractsPkgs = context.workspacePackages.filter((p) => p.role === "contracts");
    if (contractsPkgs.length > 0) {
      findings.push(this.makeFinding(
        "architecture",
        "shared-contracts",
        true,
        "observed",
        1.0,
        contractsPkgs.map((p) => p.relativeDir),
        "Shared contracts package detected"
      ));
    }

    // Finding 4: Adapter architecture
    const adapterPkgs = context.workspacePackages.filter((p) => p.role === "adapter");
    if (adapterPkgs.length > 0) {
      findings.push(this.makeFinding(
        "architecture",
        "adapter-architecture",
        true,
        "observed",
        1.0,
        adapterPkgs.map((p) => p.relativeDir),
        "Adapter pattern detected with multiple adapter packages"
      ));
    }

    // Finding 5: Database presence
    const frameworkEntries = [...context.frameworks.entries()];
    const hasDatabase = frameworkEntries.some(([fw]) =>
      ["supabase", "firebase", "prisma", "drizzle"].includes(fw)
    );
    if (hasDatabase) {
      findings.push(this.makeFinding(
        "stack",
        "database-presence",
        true,
        "observed",
        0.95,
        ["package manifest dependencies"],
        "Database framework detected in dependencies"
      ));
    }

    // Finding 6: Test framework presence
    const testFrameworks = ["vitest", "jest", "playwright", "cypress"];
    const hasTests = frameworkEntries.some(([fw]) => testFrameworks.includes(fw));
    if (hasTests) {
      findings.push(this.makeFinding(
        "stack",
        "test-framework",
        true,
        "observed",
        1.0,
        ["package manifest devDependencies"],
        "Test framework detected"
      ));
    }

    // Finding 7: Architecture style inference
    const allRoles = new Set(context.workspacePackages.map((p) => p.role));
    let archStyle = "modular-monolith";
    let archConfidence = 0.7;

    if (allRoles.has("frontend") && allRoles.has("daemon-service")) {
      archStyle = "frontend-backend-separation";
      archConfidence = 0.85;
    } else if (context.workspacePackages.length > 5) {
      archStyle = "multi-package-monorepo";
      archConfidence = 0.9;
    } else if (context.workspacePackages.length > 1) {
      archStyle = "modular-monolith";
      archConfidence = 0.8;
    }

    findings.push(this.makeFinding(
      "architecture",
      "architecture-style",
      archStyle,
      "inferred",
      archConfidence,
      [`${context.workspacePackages.length} workspace packages with roles: ${[...allRoles].join(", ")}`],
      `Architecture style inferred as '${archStyle}'`
    ));

    // Generate evidence assertions for each finding
    for (const finding of findings) {
      evidence.createAssertion({
        id: finding.id,
        subject: finding.subject,
        predicate: finding.predicate,
        value: finding.value,
        status: finding.status,
        confidence: finding.confidence,
        sources: finding.sources.map((s) => ({ file: s, reason: finding.explanation })),
        explanation: finding.explanation
      });
    }

    return {
      passId: this.id,
      version: this.version,
      aborted: false,
      assertions: evidence.getAssertions(),
      diagnostics: [],
      architectureFindings: findings,
      languages: undefined,
      frameworks: undefined
    };
  }

  private makeFinding(
    subject: string,
    predicate: string,
    value: unknown,
    status: "observed" | "inferred" | "unresolved",
    confidence: number,
    sources: string[],
    explanation: string
  ): ArchitectureFinding {
    return {
      id: `arch_${subject}_${predicate}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      subject,
      predicate,
      value,
      status,
      confidence,
      supportingEvidenceIds: [],
      sources,
      explanation,
      limitations: confidence < 1.0
        ? `Confidence is ${confidence}. More evidence could improve accuracy.`
        : undefined
    };
  }
}
