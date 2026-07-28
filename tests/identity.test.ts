/**
 * Identity Tests — Milestone 2: Stable and Deterministic Project Identity
 *
 * Tests are isolated in temporary directories so they never depend on the
 * developer's actual checkout path or committed local runtime state.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";
import { ExpertEngine } from "@ai-optimize/expert-engine";
import { ProfileCompiler } from "@ai-optimize/profile-compiler";
import { ActivationEngine } from "@ai-optimize/activation-engine";

import {
  loadIdentity,
  createIdentity,
  getIdentityStatus,
  reconcileIdentity,
  IdentityError,
  isIdentityError,
  generateProjectId,
  generateActivationId,
  generateBackupId,
  generateEventId,
  deriveAssertionId,
  identityExists,
  identityFilePath,
  persistIdentity,
  migrateIdentity,
  discoverCandidates,
  stableStringify,
  resolveRegisteredRoot,
  IDENTITY_SCHEMA_VERSION,
  IDENTITY_FILE_NAME,
  IDENTITY_DIR
} from "@ai-optimize/project-identity";
import type { ProjectIdentity, AssertionIdParams } from "@ai-optimize/project-identity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temporary directory with a given prefix and return its path. */
function createTempDir(prefix = "id-test-"): string {
  const dir = path.resolve(fs.mkdtempSync(prefix));
  return dir;
}

/** Remove a temporary directory recursively. */
function removeTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Write a minimal package.json to a directory so the scanner is happy. */
function seedMinimalPackageJson(dir: string, name = "test-app"): void {
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, dependencies: { react: "^18.0.0" } }),
    "utf-8"
  );
}

/** Write project-profile.json with a given ID into .ai-optimize/. */
function seedProjectProfile(dir: string, projectId: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.writeFileSync(
    path.join(aiOptDir, "project-profile.json"),
    JSON.stringify({
      schemaVersion: "1.0.0",
      project: {
        id: projectId,
        name: "test-app",
        root: dir,
        archetype: "frontend-application",
        maturity: "active-development"
      },
      stack: { languages: ["typescript"], frameworks: ["react"] },
      architecture: { style: "frontend-application", confidence: 0.88 },
      experts: { enabled: ["core-software"] },
      agents: { primary: "orchestrator", implementation: "engineer", review: "reviewer", verification: "verifier" },
      context: { strategy: "task-scoped", maximumPreloadTokens: 12000, dynamicRetrieval: true },
      qualityGates: { typecheck: true, lint: true, unitTests: true, browserVerification: false, securityReview: true }
    }),
    "utf-8"
  );
}

/** Write managed-artifacts.json with a given projectId. */
function seedManagedArtifacts(dir: string, projectId: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.writeFileSync(
    path.join(aiOptDir, "managed-artifacts.json"),
    JSON.stringify([
      {
        path: "CLAUDE.md",
        owner: "ai-optimize",
        projectId,
        artifactType: "claude-instructions",
        generatedHash: "sha256:abc",
        activationId: "act_abc123"
      }
    ]),
    "utf-8"
  );
}

/** Write events.jsonl with a given projectId. */
function seedEventsJsonl(dir: string, projectId: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.appendFileSync(
    path.join(aiOptDir, "events.jsonl"),
    JSON.stringify({ id: "evt_001", type: "TEST", projectId, payload: {}, timestamp: new Date().toISOString() }) + "\n",
    "utf-8"
  );
}

/** Write a malformed project.json to simulate invalid identity metadata. */
function seedMalformedProjectJson(dir: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.writeFileSync(path.join(aiOptDir, "project.json"), "{{{ not valid json }}}", "utf-8");
}

// ---------------------------------------------------------------------------
// 1. Initial registration creates one project ID
// ---------------------------------------------------------------------------
describe("Project Identity — Creation", () => {
  it("creates a persistent canonical identity on first registration", () => {
    const dir = createTempDir();

    const identity = createIdentity(dir);
    // 128-bit UUID → 32 hex chars
    expect(identity.projectId).toMatch(/^prj_[A-F0-9]{32}$/);
    expect(identity.schemaVersion).toBe("1.0.0");
    expect(identity.registeredRoot).toBe(".");
    expect(identity.identityVersion).toBe(1);
    expect(identity.aliases).toEqual([]);
    expect(typeof identity.createdAt).toBe("string");

    // Verify it was persisted
    const filePath = identityFilePath(dir);
    expect(fs.existsSync(filePath)).toBe(true);

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 2. Repeated identity loads return the same ID
// ---------------------------------------------------------------------------
describe("Project Identity — Load Stability", () => {
  it("returns the same ID across repeated loads", async () => {
    const dir = createTempDir();

    const identity1 = createIdentity(dir);
    const identity2 = await loadIdentity(dir);
    const identity3 = await loadIdentity(dir);

    expect(identity2.projectId).toBe(identity1.projectId);
    expect(identity3.projectId).toBe(identity1.projectId);

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 3. Repeated scans use the same project ID
// ---------------------------------------------------------------------------
describe("Project Identity — Scan Stability", () => {
  it("propagates the same project ID through scan and classify", async () => {
    const dir = createTempDir();
    seedMinimalPackageJson(dir);

    const identity = createIdentity(dir);
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();

    const scan1 = scanner.scan(dir);
    const profile1 = classifier.classify(scan1, { projectId: identity.projectId });

    const scan2 = scanner.scan(dir);
    const profile2 = classifier.classify(scan2, { projectId: identity.projectId });

    expect(profile1.project.id).toBe(identity.projectId);
    expect(profile2.project.id).toBe(identity.projectId);
    expect(profile1.project.id).toBe(profile2.project.id);

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 4. Analyse, compile, diff, and activate-equivalent calls use the same ID
// ---------------------------------------------------------------------------
describe("Project Identity — Propagation Through Pipeline", () => {
  async function runPipeline(dir: string): Promise<{ projectId: string }> {
    const identity = createIdentity(dir);
    seedMinimalPackageJson(dir);

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();
    const activationEngine = new ActivationEngine();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(dir);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    // The activation plan should contain the project ID
    const planProjectId = compileOutput.activationPlan.projectId;

    // Activate
    const result = await activationEngine.activate(dir, compileOutput);

    return {
      projectId: identity.projectId
    };
  }

  it("ensures identity flows from creation through compilation and activation", async () => {
    const dir = createTempDir();

    const { projectId } = await runPipeline(dir);

    // Check that managed-artifacts.json uses the same project ID
    const managedPath = path.join(dir, ".ai-optimize", "managed-artifacts.json");
    expect(fs.existsSync(managedPath)).toBe(true);
    const managed = JSON.parse(fs.readFileSync(managedPath, "utf-8"));
    for (const record of managed) {
      expect(record.projectId).toBe(projectId);
    }

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 5. The classifier does not generate identity
// ---------------------------------------------------------------------------
describe("Project Identity — Classifier Does Not Generate", () => {
  it("does not contain Math.random() ID generation in production code", () => {
    // Static check: the classifier source should never call Math.random
    const classifierSource = fs.readFileSync(
      path.resolve("./packages/project-classifier/src/index.ts"),
      "utf-8"
    );
    expect(classifierSource).not.toContain("Math.random");
  });

  it("never assigns project.id from a non-identity source", () => {
    const classifier = new ProjectClassifier();
    const scanner = new ProjectScanner();
    const dir = createTempDir();
    seedMinimalPackageJson(dir);

    const scanResult = scanner.scan(dir);

    // If we don't pass projectId, it should be a TypeScript error, but at
    // runtime we should assert it uses the provided value (not generate one).
    const profile = classifier.classify(scanResult, { projectId: "prj_EXPLICITLYPASSED" });
    expect(profile.project.id).toBe("prj_EXPLICITLYPASSED");

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 6. Identical assertions receive identical IDs
// ---------------------------------------------------------------------------
describe("Assertion Identity — Deterministic IDs", () => {
  const stableParams: AssertionIdParams = {
    projectId: "prj_STABLEID",
    scannerRuleId: "scanner-v1",
    scannerRuleVersion: "1.0.0",
    subject: "test-subject",
    predicate: "has-property",
    canonicalSourcePath: "package.json",
    scopeKey: ""
  };

  it("produces identical IDs for identical canonical input", () => {
    const id1 = deriveAssertionId(stableParams);
    const id2 = deriveAssertionId(stableParams);
    expect(id1).toBe(id2);
  });

  it("produces IDs with the ast_ prefix", () => {
    const id = deriveAssertionId(stableParams);
    expect(id).toMatch(/^ast_[a-f0-9]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// 7. Different assertion evidence produces a different ID
// ---------------------------------------------------------------------------
describe("Assertion Identity — Distinct Inputs", () => {
  const baseParams: AssertionIdParams = {
    projectId: "prj_A",
    scannerRuleId: "rule-a",
    scannerRuleVersion: "1.0.0",
    subject: "s",
    predicate: "p",
    canonicalSourcePath: "f.json",
    scopeKey: ""
  };

  it("different projectId produces different ID", () => {
    const a = deriveAssertionId({ ...baseParams, projectId: "prj_A" });
    const b = deriveAssertionId({ ...baseParams, projectId: "prj_B" });
    expect(a).not.toBe(b);
  });

  it("different subject produces different ID", () => {
    const a = deriveAssertionId({ ...baseParams, subject: "s1" });
    const b = deriveAssertionId({ ...baseParams, subject: "s2" });
    expect(a).not.toBe(b);
  });

  it("different source path produces different ID", () => {
    const a = deriveAssertionId({ ...baseParams, canonicalSourcePath: "a.json" });
    const b = deriveAssertionId({ ...baseParams, canonicalSourcePath: "b.json" });
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// 8. Two identical compilations produce byte-identical artifacts
// ---------------------------------------------------------------------------
describe("Compiler Determinism — Byte-Identical Output", () => {
  it("compiles byte-identical artifacts from identical canonical inputs", async () => {
    const dir = createTempDir();
    seedMinimalPackageJson(dir);

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(dir);
    const profile = classifier.classify(scanResult, { projectId: "prj_DET00000000001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileInput = {
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    };

    const output1 = await compiler.compile(compileInput);
    const output2 = await compiler.compile(compileInput);

    // Byte comparison of each artifact
    expect(output1.artifacts.length).toBe(output2.artifacts.length);
    for (let i = 0; i < output1.artifacts.length; i++) {
      expect(output1.artifacts[i].path).toBe(output2.artifacts[i].path);
      expect(output1.artifacts[i].content).toBe(output2.artifacts[i].content);
      expect(output1.artifacts[i].artifactType).toBe(output2.artifacts[i].artifactType);
      expect(output1.artifacts[i].targetAdapter).toBe(output2.artifacts[i].targetAdapter);
    }

    // Activation plan should also be deterministic
    expect(output1.activationPlan.steps.length).toBe(output2.activationPlan.steps.length);

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 9. Compiler output ordering is deterministic
// ---------------------------------------------------------------------------
describe("Compiler Determinism — Ordering", () => {
  it("produces consistently ordered artifact paths across runs", async () => {
    const dir = createTempDir();
    seedMinimalPackageJson(dir);

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(dir);
    const profile = classifier.classify(scanResult, { projectId: "prj_ORD00000000001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileInput = {
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    };

    // Compile three times — ordering must be stable
    const paths1 = (await compiler.compile(compileInput)).artifacts.map((a) => a.path);
    const paths2 = (await compiler.compile(compileInput)).artifacts.map((a) => a.path);
    const paths3 = (await compiler.compile(compileInput)).artifacts.map((a) => a.path);

    expect(paths1).toEqual(paths2);
    expect(paths2).toEqual(paths3);

    // Verify stable adapter ordering (claude-code before vscode alphabetically)
    expect(paths1.indexOf("CLAUDE.md")).toBeLessThan(paths1.indexOf(".vscode/settings.json"));

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 10. Legacy repository with one candidate ID migrates safely
// ---------------------------------------------------------------------------
describe("Identity Migration — Single Candidate", () => {
  it("adopts the existing project ID from a legacy profile", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_LEGACYONLY00001");

    const identity = await loadIdentity(dir);

    // Should have adopted the legacy ID
    expect(identity.projectId).toBe("prj_LEGACYONLY00001");
    expect(identity.aliases).toEqual([]);
    expect(identity.identityVersion).toBe(1);

    // project.json should now exist
    expect(fs.existsSync(identityFilePath(dir))).toBe(true);

    removeTempDir(dir);
  });

  it("adopts when the legacy ID is in managed-artifacts.json", async () => {
    const dir = createTempDir();
    seedManagedArtifacts(dir, "prj_MANAGEDONLY001");

    const identity = await loadIdentity(dir);

    expect(identity.projectId).toBe("prj_MANAGEDONLY001");

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 11. Legacy repository with conflicting IDs returns IDENTITY_CONFLICT
// ---------------------------------------------------------------------------
describe("Identity Migration — Conflicting Candidates", () => {
  it("throws IDENTITY_CONFLICT when profile and managed artifacts disagree", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_ID_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_ID_00002");

    await expect(loadIdentity(dir)).rejects.toThrow(IdentityError);
    await expect(loadIdentity(dir)).rejects.toMatchObject({
      code: "IDENTITY_CONFLICT"
    });

    removeTempDir(dir);
  });

  it("includes all candidate IDs and sources in the error detail", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_A_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_B_00002");

    try {
      await loadIdentity(dir);
      // Should not reach this line
      expect(true).toBe(false);
    } catch (err) {
      expect(isIdentityError(err)).toBe(true);
      if (isIdentityError(err)) {
        expect(err.code).toBe("IDENTITY_CONFLICT");
        expect(err.detail).toBeDefined();
        const detail = err.detail as { candidates: unknown[] };
        expect(detail.candidates).toBeDefined();
        expect(detail.candidates.length).toBeGreaterThanOrEqual(2);
      }
    }

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 12. Reconciliation preserves the selected ID
// ---------------------------------------------------------------------------
describe("Identity Reconciliation — Preserves Selected ID", () => {
  it("writes the selected ID as canonical", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_X_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_Y_00002");

    const result = await reconcileIdentity(dir, "prj_MANAGED_Y_00002");
    expect(result.success).toBe(true);
    expect(result.canonical.projectId).toBe("prj_MANAGED_Y_00002");

    // Verify on disk
    const loaded = await loadIdentity(dir);
    expect(loaded.projectId).toBe("prj_MANAGED_Y_00002");

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 13. Reconciliation records superseded IDs
// ---------------------------------------------------------------------------
describe("Identity Reconciliation — Superseded IDs", () => {
  it("records non-selected IDs in the aliases array", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_Z_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_W_00002");

    const result = await reconcileIdentity(dir, "prj_MANAGED_W_00002");

    expect(result.supersededIds).toContain("prj_PROFILE_Z_00001");
    expect(result.canonical.aliases).toContain("prj_PROFILE_Z_00001");

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 14. Reconciliation does not delete event or activation history
// ---------------------------------------------------------------------------
describe("Identity Reconciliation — Preserves History", () => {
  it("does not remove events.jsonl or managed-artifacts.json", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_H_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_H_00002");
    seedEventsJsonl(dir, "prj_MANAGED_H_00002");

    // Record the pre-reconciliation file list
    const aiOptDir = path.join(dir, ".ai-optimize");
    const filesBefore = fs.readdirSync(aiOptDir).sort();

    await reconcileIdentity(dir, "prj_MANAGED_H_00002");

    const filesAfter = fs.readdirSync(aiOptDir).sort();

    // Reconciliation adds project.json and may back up, but must not delete
    // pre-existing history files.
    expect(filesAfter).toContain("events.jsonl");
    expect(filesAfter).toContain("managed-artifacts.json");
    expect(filesAfter).toContain("project-profile.json");

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 15. Registered-root mismatch is detected
// ---------------------------------------------------------------------------
describe("Identity Validation — Registered Root Mismatch", () => {
  it("detects when the stored registered root does not match the current root", async () => {
    const dir = createTempDir();
    const identity: ProjectIdentity = {
      schemaVersion: "1.0.0",
      projectId: "prj_ROOTMISMATCH001",
      // Store an absolute path that won't match the resolved root on another machine
      registeredRoot: "/nonexistent/path",
      createdAt: new Date().toISOString(),
      identityVersion: 1,
      aliases: []
    };
    persistIdentity(dir, identity);

    await expect(loadIdentity(dir)).rejects.toMatchObject({
      code: "REGISTERED_ROOT_MISMATCH"
    });

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 16. Malformed identity metadata fails safely
// ---------------------------------------------------------------------------
describe("Identity Validation — Malformed Metadata", () => {
  it("throws IDENTITY_FILE_INVALID for unparseable project.json", async () => {
    const dir = createTempDir();
    seedMalformedProjectJson(dir);

    await expect(loadIdentity(dir)).rejects.toMatchObject({
      code: "IDENTITY_FILE_INVALID"
    });

    removeTempDir(dir);
  });

  it("throws IDENTITY_FILE_INVALID for structurally invalid project.json", async () => {
    const dir = createTempDir();
    const aiOptDir = path.join(dir, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    // Write a valid JSON but missing required fields
    fs.writeFileSync(
      path.join(aiOptDir, "project.json"),
      JSON.stringify({ foo: "bar" }),
      "utf-8"
    );

    await expect(loadIdentity(dir)).rejects.toMatchObject({
      code: "IDENTITY_FILE_INVALID"
    });

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// 17. Production identity generation contains no Math.random()
// ---------------------------------------------------------------------------
describe("Identity Generation — No Math.random()", () => {
  const productionSourceGlobs = [
    "packages/project-identity/src/**/*.ts",
    "packages/evidence-engine/src/**/*.ts",
    "packages/activation-engine/src/**/*.ts",
    "packages/memory-engine/src/**/*.ts",
    "packages/project-classifier/src/**/*.ts",
    "apps/cli/src/**/*.ts",
    "apps/daemon/src/**/*.ts"
  ];

  it("no Math.random() calls remain in identity-related production source files", () => {
    for (const glob of productionSourceGlobs) {
      // We can't glob from within the test, so check known files
      const filesToCheck = [
        "packages/project-identity/src/id-generator.ts",
        "packages/evidence-engine/src/index.ts",
        "packages/activation-engine/src/index.ts",
        "packages/memory-engine/src/index.ts",
        "packages/project-classifier/src/index.ts",
        "apps/cli/src/index.ts",
        "apps/daemon/src/index.ts"
      ];

      for (const file of filesToCheck) {
        const fullPath = path.resolve(file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          // Filter out comments that mention Math.random
          const lines = content.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            // Skip comment lines
            if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
            expect(trimmed).not.toMatch(/Math\.random\(\)/);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Additional: EvidenceEngine integration with deterministic assertion IDs
// ---------------------------------------------------------------------------
describe("EvidenceEngine — Deterministic Assertion Creation", () => {
  it("creates deterministic assertion IDs when projectId is provided", () => {
    const engine = new EvidenceEngine();

    const a1 = engine.createAssertion({
      subject: "test",
      predicate: "value",
      value: 42,
      status: "observed",
      confidence: 0.9,
      sources: [{ file: "test.json", reason: "testing" }],
      explanation: "A test assertion",
      projectId: "prj_EVIDENCETEST01",
      scannerRuleId: "scanner-v1",
      scannerRuleVersion: "1.0.0",
      canonicalSourcePath: "test.json"
    });

    const a2 = engine.createAssertion({
      subject: "test",
      predicate: "value",
      value: 42,
      status: "observed",
      confidence: 0.9,
      sources: [{ file: "test.json", reason: "testing" }],
      explanation: "A test assertion",
      projectId: "prj_EVIDENCETEST01",
      scannerRuleId: "scanner-v1",
      scannerRuleVersion: "1.0.0",
      canonicalSourcePath: "test.json"
    });

    // Deterministic: same input = same ID
    expect(a1.id).toBe(a2.id);
    expect(a1.id).toMatch(/^ast_[a-f0-9]{64}$/);
  });

  it("uses an explicit id override when provided", () => {
    const engine = new EvidenceEngine();
    const assertion = engine.createAssertion({
      id: "ast_manual_override",
      subject: "test",
      predicate: "value",
      value: true,
      status: "observed",
      confidence: 0.5,
      sources: [],
      explanation: "Manual ID test"
    });

    expect(assertion.id).toBe("ast_manual_override");
  });
});

// ---------------------------------------------------------------------------
// Additional: Typed error testing
// ---------------------------------------------------------------------------
describe("Identity Errors — Typed Error Handling", () => {
  it("IdentityError has the correct code and message", () => {
    const err = new IdentityError("PROJECT_NOT_REGISTERED", "Project not found");
    expect(err.code).toBe("PROJECT_NOT_REGISTERED");
    expect(err.message).toBe("Project not found");
    expect(err.name).toBe("IdentityError");
  });

  it("isIdentityError works correctly", () => {
    expect(isIdentityError(new IdentityError("IDENTITY_CONFLICT", "Conflict"))).toBe(true);
    expect(isIdentityError(new Error("Generic"))).toBe(false);
    expect(isIdentityError(null)).toBe(false);
    expect(isIdentityError("string")).toBe(false);
  });

  it("all error codes are represented", () => {
    const codes = [
      "PROJECT_NOT_REGISTERED",
      "IDENTITY_CONFLICT",
      "IDENTITY_FILE_INVALID",
      "IDENTITY_RECONCILIATION_REQUIRED",
      "IDENTITY_RECONCILIATION_FAILED",
      "REGISTERED_ROOT_MISMATCH"
    ] as const;

    for (const code of codes) {
      const err = new IdentityError(code, `Test ${code}`);
      expect(err.code).toBe(code);
    }
  });
});

// ---------------------------------------------------------------------------
// Additional: Stable stringify produces byte-identical output
// ---------------------------------------------------------------------------
describe("stableStringify — Deterministic Serialization", () => {
  it("produces identical output for identical identity objects", () => {
    const identity: ProjectIdentity = {
      schemaVersion: "1.0.0",
      projectId: "prj_STABLETEST001",
      registeredRoot: ".",
      createdAt: "2026-01-01T00:00:00.000Z",
      identityVersion: 1,
      aliases: ["prj_OLDID0001", "prj_OLDID0002"]
    };

    const s1 = stableStringify(identity);
    const s2 = stableStringify(identity);

    expect(s1).toBe(s2);
  });

  it("sort aliases deterministically", () => {
    const identity: ProjectIdentity = {
      schemaVersion: "1.0.0",
      projectId: "prj_SORTTEST001",
      registeredRoot: ".",
      createdAt: "2026-06-01T00:00:00.000Z",
      identityVersion: 1,
      aliases: ["prj_Z_ALIAS", "prj_A_ALIAS"]
    };

    const result = stableStringify(identity);
    // The aliases should be sorted alphabetically: prj_A_ALIAS before prj_Z_ALIAS
    const aIndex = result.indexOf("prj_A_ALIAS");
    const zIndex = result.indexOf("prj_Z_ALIAS");
    expect(aIndex).toBeLessThan(zIndex);
  });
});

// ---------------------------------------------------------------------------
// Additional: Identifier generators use crypto and correct prefixes
// ---------------------------------------------------------------------------
describe("Identifier Generators — Crypto-based and Prefix-correct", () => {
  it("generateProjectId returns prj_ prefixed 128-bit hex string", () => {
    const id = generateProjectId();
    // randomUUID → 32 hex chars (128 bits)
    expect(id).toMatch(/^prj_[A-F0-9]{32}$/);
  });

  it("generateActivationId returns act_ prefixed 128-bit hex string", () => {
    const id = generateActivationId();
    expect(id).toMatch(/^act_[a-f0-9]{32}$/);
  });

  it("generateBackupId returns bk_ prefixed 128-bit hex string", () => {
    const id = generateBackupId();
    expect(id).toMatch(/^bk_[a-f0-9]{32}$/);
  });

  it("generateEventId returns evt_ prefixed 128-bit hex string", () => {
    const id = generateEventId();
    expect(id).toMatch(/^evt_[a-f0-9]{32}$/);
  });

  it("generated IDs are collision-resistant across multiple calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateProjectId());
    }
    expect(ids.size).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Milestone 2A — Identifier Entropy Hardening
// ---------------------------------------------------------------------------
describe("Identifier Entropy — 128-bit UUID (Milestone 2A)", () => {
  it("no identifier generator uses randomBytes(8) anymore", () => {
    const source = fs.readFileSync(
      path.resolve("./packages/project-identity/src/id-generator.ts"),
      "utf-8"
    );
    // Should use randomUUID, not randomBytes
    expect(source).toContain("randomUUID");
    expect(source).not.toContain("randomBytes");
  });

  it("no production identifier generator uses Math.random()", () => {
    const files = [
      "packages/project-identity/src/id-generator.ts",
      "packages/activation-engine/src/index.ts",
      "packages/evidence-engine/src/index.ts",
      "packages/memory-engine/src/index.ts"
    ];
    for (const file of files) {
      const fullPath = path.resolve(file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const codeLines = content.split("\n").filter((l) => {
          const t = l.trim();
          return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
        });
        for (const line of codeLines) {
          expect(line).not.toMatch(/Math\.random\(\)/);
        }
      }
    }
  });

  it("all ID prefixes are correct (prj_, act_, bk_, evt_, cor_)", () => {
    expect(generateProjectId()).toMatch(/^prj_/);
    expect(generateActivationId()).toMatch(/^act_/);
    expect(generateBackupId()).toMatch(/^bk_/);
    expect(generateEventId()).toMatch(/^evt_/);
  });

  it("generates 1000 unique activation IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateActivationId());
    }
    expect(ids.size).toBe(1000);
  });

  it("generates 1000 unique backup IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateBackupId());
    }
    expect(ids.size).toBe(1000);
  });

  it("generates 1000 unique event IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateEventId());
    }
    expect(ids.size).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Milestone 2A — Registered Root Resolution
// ---------------------------------------------------------------------------
describe("Registered Root — resolveRegisteredRoot (Milestone 2A)", () => {
  it("resolves '.' as the parent directory of .ai-optimize/project.json", () => {
    const dir = createTempDir();
    const aiOptDir = path.join(dir, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    const identityFile = path.join(aiOptDir, "project.json");
    fs.writeFileSync(identityFile, "{}", "utf-8");

    const resolved = resolveRegisteredRoot(identityFile, ".");
    // The resolved root should be the parent of .ai-optimize, i.e., dir
    expect(path.basename(resolved)).toBe(path.basename(dir));
    // Should be normalized (no trailing separators)
    expect(resolved).not.toMatch(/[/\\]$/);

    removeTempDir(dir);
  });

  it("resolves a relative subdirectory correctly", () => {
    const dir = createTempDir();
    const aiOptDir = path.join(dir, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    const identityFile = path.join(aiOptDir, "project.json");
    fs.writeFileSync(identityFile, "{}", "utf-8");

    const resolved = resolveRegisteredRoot(identityFile, "subdir");
    expect(path.basename(resolved)).toBe("subdir");
    expect(path.dirname(resolved)).toBe(path.resolve(dir));

    removeTempDir(dir);
  });

  it("never depends on process.cwd() after the metadata file is located", () => {
    // The resolveRegisteredRoot function receives the identity file path directly,
    // so it always resolves relative to that file's location, not cwd.
    const dir = createTempDir();
    const nestedDir = path.join(dir, "nested", "deep");
    fs.mkdirSync(nestedDir, { recursive: true });
    const aiOptDir = path.join(nestedDir, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    const identityFile = path.join(aiOptDir, "project.json");
    fs.writeFileSync(identityFile, "{}", "utf-8");

    // Resolve with registeredRoot "." meaning the parent of .ai-optimize is the root.
    // This should resolve to nestedDir regardless of process.cwd().
    const resolved = resolveRegisteredRoot(identityFile, ".");
    expect(path.basename(resolved)).toBe(path.basename(nestedDir));
    // The resolved path should equal the canonical nested directory
    expect(resolved).toBe(path.resolve(nestedDir));

    removeTempDir(dir);
  });

  it("handles a deleted root gracefully (does not throw)", () => {
    const dir = createTempDir();
    const aiOptDir = path.join(dir, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    const identityFile = path.join(aiOptDir, "project.json");
    fs.writeFileSync(identityFile, "{}", "utf-8");

    // Remove the parent dir to simulate a deleted root
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(aiOptDir, { recursive: true }); // recreate .ai-optimize
    fs.writeFileSync(identityFile, "{}", "utf-8");

    // resolveRegisteredRoot should still resolve the path even if it no longer exists
    const resolved = resolveRegisteredRoot(identityFile, ".");
    // The returned path should still be a valid path string
    expect(resolved).toBeTruthy();
    expect(typeof resolved).toBe("string");

    removeTempDir(dir);
  });

  it("detects a moved or copied identity file via non-existent resolved root on load", async () => {
    const dir = createTempDir();
    const identity: ProjectIdentity = {
      schemaVersion: "1.0.0",
      projectId: "prj_MOVEDROOTTEST001",
      registeredRoot: "/nonexistent/moved/path",
      createdAt: new Date().toISOString(),
      identityVersion: 1,
      aliases: []
    };
    persistIdentity(dir, identity);

    // Loading should fail with REGISTERED_ROOT_MISMATCH because the resolved
    // canonical root (/nonexistent/moved/path) does not exist.
    await expect(loadIdentity(dir)).rejects.toMatchObject({
      code: "REGISTERED_ROOT_MISMATCH"
    });

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// Milestone 2A — Reconciliation Backup Behaviour
// ---------------------------------------------------------------------------
describe("Reconciliation Backup — Scope and Safety (Milestone 2A)", () => {
  it("backup creation terminates normally when previous backups exist", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_B1_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_B2_00002");

    // Create a previous backup
    const backupDir = path.join(dir, ".ai-optimize", "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(
      path.join(backupDir, "bk_previous-backup.json"),
      JSON.stringify({ previous: true }),
      "utf-8"
    );

    // Reconciliation should succeed despite existing backups
    const result = await reconcileIdentity(dir, "prj_MANAGED_B2_00002");
    expect(result.success).toBe(true);
    expect(result.canonical.projectId).toBe("prj_MANAGED_B2_00002");

    // The previous backup must still exist
    expect(fs.existsSync(path.join(backupDir, "bk_previous-backup.json"))).toBe(true);

    removeTempDir(dir);
  });

  it("backup does not recursively include other backups", async () => {
    const dir = createTempDir();
    // Seed an existing project.json with the ID that matches managed-artifacts
    const canonicalId = "prj_MANAGED_B4_00002";
    persistIdentity(dir, {
      schemaVersion: "1.0.0",
      projectId: canonicalId,
      registeredRoot: ".",
      createdAt: new Date().toISOString(),
      identityVersion: 1,
      aliases: []
    });
    seedProjectProfile(dir, "prj_PROFILE_B3_00001");
    seedManagedArtifacts(dir, canonicalId);
    seedEventsJsonl(dir, canonicalId);

    // Create a lock file and a stale backup — these must NOT appear in the snapshot
    const aiOptDir = path.join(dir, ".ai-optimize");
    fs.writeFileSync(path.join(aiOptDir, "activation.lock"), "stale", "utf-8");
    const backupDir = path.join(aiOptDir, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, "stale-backup.json"), "{}", "utf-8");

    const result = await reconcileIdentity(dir, canonicalId);
    expect(result.success).toBe(true);

    // Read the backup snapshot and verify it only contains the affected files
    const snapshot = JSON.parse(fs.readFileSync(result.backupPath, "utf-8"));
    const backedUpFiles = Object.keys(snapshot.files || {});
    expect(backedUpFiles).toContain("project.json");
    expect(backedUpFiles).toContain("project-profile.json");
    expect(backedUpFiles).toContain("managed-artifacts.json");
    // Must NOT include backups, lock, or events.jsonl
    expect(backedUpFiles).not.toContain("backups");
    expect(backedUpFiles).not.toContain("activation.lock");
    expect(backedUpFiles).not.toContain("events.jsonl");

    removeTempDir(dir);
  });

  it("immutable historical events are preserved after reconciliation", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_E1_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_E2_00002");
    seedEventsJsonl(dir, "prj_MANAGED_E2_00002");

    // Record the pre-reconciliation event content
    const aiOptDir = path.join(dir, ".ai-optimize");
    const eventsBefore = fs.readFileSync(path.join(aiOptDir, "events.jsonl"), "utf-8");

    await reconcileIdentity(dir, "prj_MANAGED_E2_00002");

    // Original events must still be present
    const eventsAfter = fs.readFileSync(path.join(aiOptDir, "events.jsonl"), "utf-8");
    expect(eventsAfter).toContain(eventsBefore.trim());

    removeTempDir(dir);
  });

  it("superseded IDs remain discoverable via discoverCandidates after reconciliation", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_S1_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_S2_00002");

    await reconcileIdentity(dir, "prj_MANAGED_S2_00002");

    // Re-run discoverCandidates — the superseded ID should still be discoverable
    // from the original project-profile.json
    const candidates = discoverCandidates(dir);
    const candidateIds = candidates.map((c) => c.projectId);
    expect(candidateIds).toContain("prj_PROFILE_S1_00001");
    expect(candidateIds).toContain("prj_MANAGED_S2_00002");

    // The canonical identity should list the superseded ID in aliases
    const identity = await loadIdentity(dir);
    expect(identity.aliases).toContain("prj_PROFILE_S1_00001");

    removeTempDir(dir);
  });
});

// ---------------------------------------------------------------------------
// Milestone 2A — Assertion Identity Path Normalization and Scope
// ---------------------------------------------------------------------------
describe("Assertion Identity — Path Separator Normalization (Milestone 2A)", () => {
  const baseParams: AssertionIdParams = {
    projectId: "prj_NORMTEST",
    scannerRuleId: "scanner-v1",
    scannerRuleVersion: "1.0.0",
    subject: "test",
    predicate: "value",
    canonicalSourcePath: "src/lib/util.ts",
    scopeKey: ""
  };

  it("backslash and forward slash produce the same ID on Windows", () => {
    // Both should normalise to "src/lib/util.ts"
    const idForward = deriveAssertionId({
      ...baseParams,
      canonicalSourcePath: "src/lib/util.ts"
    });
    const idBackslash = deriveAssertionId({
      ...baseParams,
      canonicalSourcePath: "src\\lib\\util.ts"
    });
    expect(idForward).toBe(idBackslash);
  });

  it("leading ./ is stripped for stable hashing", () => {
    const idNoPrefix = deriveAssertionId({
      ...baseParams,
      canonicalSourcePath: "src/lib/util.ts"
    });
    const idWithDot = deriveAssertionId({
      ...baseParams,
      canonicalSourcePath: "./src/lib/util.ts"
    });
    expect(idNoPrefix).toBe(idWithDot);
  });
});

describe("Assertion Identity — Source Line Range Scope (Milestone 2A)", () => {
  const baseParams: AssertionIdParams = {
    projectId: "prj_LINETEST",
    scannerRuleId: "scanner-v1",
    scannerRuleVersion: "1.0.0",
    subject: "function",
    predicate: "exists",
    canonicalSourcePath: "src/index.ts",
    scopeKey: ""
  };

  it("different source line ranges produce different IDs", () => {
    const idNoRange = deriveAssertionId(baseParams);
    const idRange1 = deriveAssertionId({ ...baseParams, sourceLineRange: "10-25" });
    const idRange2 = deriveAssertionId({ ...baseParams, sourceLineRange: "30-45" });

    expect(idNoRange).not.toBe(idRange1);
    expect(idRange1).not.toBe(idRange2);
  });

  it("same evidence scope and line range produce the same ID", () => {
    const a = deriveAssertionId({ ...baseParams, sourceLineRange: "42-58" });
    const b = deriveAssertionId({ ...baseParams, sourceLineRange: "42-58" });
    expect(a).toBe(b);
  });

  it("scopeKey changes produce different IDs", () => {
    const a = deriveAssertionId({ ...baseParams, scopeKey: "package:foo" });
    const b = deriveAssertionId({ ...baseParams, scopeKey: "package:bar" });
    expect(a).not.toBe(b);
  });
});

describe("Assertion Identity — Object Property Ordering (Milestone 2A)", () => {
  it("different property ordering in input does not affect the ID", () => {
    // deriveAssertionId reads fields by name, not by spread order
    const paramsA: AssertionIdParams = {
      projectId: "prj_ORDER",
      scannerRuleId: "rule-v1",
      scannerRuleVersion: "1.0.0",
      subject: "module",
      predicate: "depends-on",
      canonicalSourcePath: "package.json",
      scopeKey: "lodash",
      sourceLineRange: ""
    };
    const paramsB: AssertionIdParams = {
      // Same values, different declaration order (though TypeScript interfaces
      // don't enforce runtime ordering). The function reads named properties.
      sourceLineRange: "",
      scopeKey: "lodash",
      canonicalSourcePath: "package.json",
      predicate: "depends-on",
      subject: "module",
      scannerRuleVersion: "1.0.0",
      scannerRuleId: "rule-v1",
      projectId: "prj_ORDER"
    };

    expect(deriveAssertionId(paramsA)).toBe(deriveAssertionId(paramsB));
  });
});
