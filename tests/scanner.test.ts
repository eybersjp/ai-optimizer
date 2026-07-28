import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";

describe("ProjectScanner & Classifier", () => {
  it("should scan the current workspace and detect TypeScript monorepo", () => {
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();

    const root = path.resolve(".");
    const scanResult = scanner.scan(root);
    // Use a stable test projectId — classifier no longer generates IDs
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });

    expect(scanResult.files.length).toBeGreaterThan(0);
    expect(scanResult.languages).toContain("typescript");
    expect(profile.project.name).toBe("ai-optimizer");
    expect(profile.project.id).toBe("prj_TESTFIXEDID0001");
    expect(profile.stack.languages).toContain("typescript");
    expect(profile.experts.enabled).toContain("core-software");
    expect(profile.experts.enabled).toContain("typescript");
  });
});
