import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";
import { ExpertEngine } from "@ai-optimize/expert-engine";
import { ProfileCompiler } from "@ai-optimize/profile-compiler";

import { GeneratedArtifact } from "@ai-optimize/contracts";

describe("ProfileCompiler Vertical Slice Integration", () => {
  it("should compile canonical project profile and adapter artifacts", async () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    expect(compileOutput.canonicalProfile.project.name).toBe("ai-optimizer");
    expect(compileOutput.artifacts.length).toBeGreaterThan(0);

    const claudeArtifact = compileOutput.artifacts.find((a: GeneratedArtifact) => a.path === "CLAUDE.md");
    expect(claudeArtifact).toBeDefined();
    expect(claudeArtifact?.content).toContain("# ai-optimizer");
    expect(claudeArtifact?.content.split("\n").length).toBeLessThan(200);

    const vscodeArtifact = compileOutput.artifacts.find((a: GeneratedArtifact) => a.path === ".vscode/settings.json");
    expect(vscodeArtifact).toBeDefined();
    expect(vscodeArtifact?.content).toContain("// AI-OPTIMIZE:BEGIN");
  });
});
