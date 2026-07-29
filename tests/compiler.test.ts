/**
 * Compiler Tests — Subsystem: compiler
 *
 * Verifies ProfileCompiler integration, artifact generation for Claude Code
 * and VS Code adapters, determinism, identity propagation, and path sanity.
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";
import { ExpertEngine } from "@ai-optimize/expert-engine";
import { ProfileCompiler } from "@ai-optimize/profile-compiler";
import type { GeneratedArtifact } from "@ai-optimize/contracts";

describe("Compiler Subsystem — ProfileCompiler Baseline", () => {
  it("1. Generates canonical project profile and adapter artifacts", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    expect(compileOutput.canonicalProfile.project.name).toBe("ai-optimizer");
    expect(compileOutput.canonicalProfile.project.id).toBe("prj_TESTFIXEDID0001");
    expect(compileOutput.artifacts.length).toBeGreaterThan(0);
  });

  it("2. Generates Claude Code artifacts (CLAUDE.md, rules, settings)", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code"]
    });

    const claudeArtifact = compileOutput.artifacts.find((a: GeneratedArtifact) => a.path === "CLAUDE.md");
    expect(claudeArtifact).toBeDefined();
    expect(claudeArtifact?.content).toContain("# ai-optimizer");
    expect(claudeArtifact?.content.split("\n").length).toBeLessThan(200);
  });

  it("3. Generates VS Code artifacts (.vscode/settings.json)", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["vscode"]
    });

    const vscodeArtifact = compileOutput.artifacts.find((a: GeneratedArtifact) => a.path === ".vscode/settings.json");
    expect(vscodeArtifact).toBeDefined();
    expect(vscodeArtifact?.content).toContain("// AI-OPTIMIZE:BEGIN");
  });

  it("4. Enforces stable artifact path ordering", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileInput = {
      project: profile,
      experts: activePacks,
      targetAdapters: ["vscode", "claude-code"]
    };

    const out1 = await compiler.compile(compileInput);
    const out2 = await compiler.compile(compileInput);

    const paths1 = out1.artifacts.map((a) => a.path);
    const paths2 = out2.artifacts.map((a) => a.path);

    expect(paths1).toEqual(paths2);
    expect(paths1).toContain("CLAUDE.md");
    expect(paths1).toContain(".vscode/settings.json");
  });

  it("5. Produces byte-identical output for identical input", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileInput = {
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    };

    const out1 = await compiler.compile(compileInput);
    const out2 = await compiler.compile(compileInput);

    expect(out1.artifacts).toEqual(out2.artifacts);
    expect(out1.activationPlan).toEqual(out2.activationPlan);
  });

  it("6. Propagates project identity through compile output and activation plan", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_PROPAGATE0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code"]
    });

    expect(compileOutput.canonicalProfile.project.id).toBe("prj_PROPAGATE0001");
    expect(compileOutput.activationPlan.projectId).toBe("prj_PROPAGATE0001");
  });

  it("7. Compile output does not contain absolute developer paths in portable artifacts", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    for (const artifact of compileOutput.artifacts) {
      // Artifact content must not hardcode developer machine absolute path
      expect(artifact.content).not.toContain(root);
      expect(artifact.path).not.toContain(":\\");
    }
  });

  it("8. Enforces deterministic active expert pack ordering", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });

    const activePacks1 = expertEngine.resolveActivePacks(profile);
    const activePacks2 = expertEngine.resolveActivePacks(profile);

    const ids1 = activePacks1.map((p) => p.id);
    const ids2 = activePacks2.map((p) => p.id);

    expect(ids1).toEqual(ids2);
  });
});
