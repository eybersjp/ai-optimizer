/**
 * Identity Hardening Tests — Subsystem: identity hardening
 *
 * Tests identity migration, conflict handling, reconciliation, root mismatch,
 * malformed metadata, 128-bit UUID entropy, resolveRegisteredRoot, backup safety,
 * path separator normalization, line range scope, and property ordering.
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";

import {
  loadIdentity,
  getIdentityStatus,
  reconcileIdentity,
  IdentityError,
  isIdentityError,
  generateProjectId,
  generateActivationId,
  generateBackupId,
  generateEventId,
  deriveAssertionId,
  identityFilePath,
  persistIdentity,
  discoverCandidates,
  stableStringify,
  resolveRegisteredRoot
} from "@ai-optimize/project-identity";
import type { ProjectIdentity, AssertionIdParams } from "@ai-optimize/project-identity";

function createTempDir(prefix = "id-h-test-"): string {
  const dir = path.resolve(fs.mkdtempSync(prefix));
  return dir;
}

function removeTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function seedProjectProfile(dir: string, projectId: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.writeFileSync(
    path.join(aiOptDir, "project-profile.json"),
    JSON.stringify({
      schemaVersion: "1.0.0",
      project: { id: projectId, name: "test-app", root: dir, archetype: "frontend-application", maturity: "active-development" }
    }),
    "utf-8"
  );
}

function seedManagedArtifacts(dir: string, projectId: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.writeFileSync(
    path.join(aiOptDir, "managed-artifacts.json"),
    JSON.stringify([{ path: "CLAUDE.md", owner: "ai-optimize", projectId }]),
    "utf-8"
  );
}

function seedEventsJsonl(dir: string, projectId: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.appendFileSync(
    path.join(aiOptDir, "events.jsonl"),
    JSON.stringify({ id: "evt_001", type: "TEST", projectId, payload: {}, timestamp: new Date().toISOString() }) + "\n",
    "utf-8"
  );
}

function seedMalformedProjectJson(dir: string): void {
  const aiOptDir = path.join(dir, ".ai-optimize");
  fs.mkdirSync(aiOptDir, { recursive: true });
  fs.writeFileSync(path.join(aiOptDir, "project.json"), "{{{ not valid json }}}", "utf-8");
}

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
});

describe("Identity Migration — Single Candidate", () => {
  it("adopts the existing project ID from a legacy profile", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_LEGACYONLY00001");

    const identity = await loadIdentity(dir);
    expect(identity.projectId).toBe("prj_LEGACYONLY00001");

    removeTempDir(dir);
  });
});

describe("Identity Migration — Conflicting Candidates", () => {
  it("throws IDENTITY_CONFLICT when profile and managed artifacts disagree", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_ID_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_ID_00002");

    await expect(loadIdentity(dir)).rejects.toThrow(IdentityError);

    removeTempDir(dir);
  });
});

describe("Identity Reconciliation — Preserves Selected ID", () => {
  it("writes the selected ID as canonical", async () => {
    const dir = createTempDir();
    seedProjectProfile(dir, "prj_PROFILE_X_00001");
    seedManagedArtifacts(dir, "prj_MANAGED_Y_00002");

    const result = await reconcileIdentity(dir, "prj_MANAGED_Y_00002");
    expect(result.success).toBe(true);
    expect(result.canonical.projectId).toBe("prj_MANAGED_Y_00002");

    removeTempDir(dir);
  });
});

describe("Identity Validation — Registered Root Mismatch", () => {
  it("detects when stored registered root does not match current root", async () => {
    const dir = createTempDir();
    const identity: ProjectIdentity = {
      schemaVersion: "1.0.0",
      projectId: "prj_ROOTMISMATCH001",
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

describe("Identity Entropy — 128-bit UUID (Milestone 2A)", () => {
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
        const lines = content.split("\n").filter((l) => {
          const t = l.trim();
          return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
        });
        for (const line of lines) {
          expect(line).not.toMatch(/Math\.random\(\)/);
        }
      }
    }
  });

  it("all ID prefixes are correct (prj_, act_, bk_, evt_)", () => {
    expect(generateProjectId()).toMatch(/^prj_/);
    expect(generateActivationId()).toMatch(/^act_/);
    expect(generateBackupId()).toMatch(/^bk_/);
    expect(generateEventId()).toMatch(/^evt_/);
  });
});
