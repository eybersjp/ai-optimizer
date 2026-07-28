import { describe, it, expect, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";
import { ExpertEngine } from "@ai-optimize/expert-engine";
import { ProfileCompiler } from "@ai-optimize/profile-compiler";
import { ActivationEngine } from "@ai-optimize/activation-engine";

describe("ActivationEngine Transactional Lock & Rollback", () => {
  const tempTestDir = path.resolve("./temp_test_repo");

  afterEach(() => {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  it("should transactionally activate and restore baseline state on rollback", async () => {
    fs.mkdirSync(tempTestDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempTestDir, "package.json"),
      JSON.stringify({ name: "temp-app", dependencies: { react: "^18.0.0" } }),
      "utf-8"
    );

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    const expertEngine = new ExpertEngine();
    const compiler = new ProfileCompiler();
    const activationEngine = new ActivationEngine();

    expertEngine.loadBuiltinPacks(path.resolve("expert-packs"));

    const scanResult = scanner.scan(tempTestDir);
    const profile = classifier.classify(scanResult);
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compileOutput = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    const result = await activationEngine.activate(tempTestDir, compileOutput);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tempTestDir, "CLAUDE.md"))).toBe(true);

    const rollbackResult = await activationEngine.rollback(tempTestDir, result.backupId);
    expect(rollbackResult.success).toBe(true);
    expect(fs.existsSync(path.join(tempTestDir, "CLAUDE.md"))).toBe(false);
  });
});
