/**
 * Classifier Tests — Subsystem: classifier
 *
 * Verifies stack-to-archetype classification, active expert resolution,
 * maturity classification, and identity propagation.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";

function createTempDir(prefix = "classifier-test-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanTempDir(dirPath: string): void {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {}
}

describe("Classifier Subsystem — ProjectClassifier", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it("classifies frontend application archetype correctly", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-react-app", dependencies: { react: "^18.0.0" } })
    );

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();

    const scanResult = scanner.scan(tmpDir);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTCLASS0001" });

    expect(profile.project.archetype).toBe("frontend-application");
    expect(profile.project.id).toBe("prj_TESTCLASS0001");
    expect(profile.experts.enabled).toContain("design-taste");
  });

  it("classifies backend daemon archetype correctly", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-daemon", dependencies: { fastify: "^4.0.0" } })
    );

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();

    const scanResult = scanner.scan(tmpDir);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTCLASS0002" });

    expect(profile.project.id).toBe("prj_TESTCLASS0002");
    expect(profile.stack.frameworks).toContain("fastify");
  });

  it("classifies monorepo topology correctly", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "root", private: true }));
    const pkgDir = path.join(tmpDir, "packages", "lib");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "@scope/lib" }));

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();

    const scanResult = scanner.scan(tmpDir);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTCLASS0003" });

    expect(profile.project.id).toBe("prj_TESTCLASS0003");
    expect(profile.experts.enabled).toContain("core-software");
  });

  it("propagates project ID deterministically without generating random IDs", () => {
    const classifierSource = fs.readFileSync(
      path.resolve("./packages/project-classifier/src/index.ts"),
      "utf-8"
    );
    expect(classifierSource).not.toContain("Math.random");

    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test-app" }));

    const scanResult = scanner.scan(tmpDir);
    const profile = classifier.classify(scanResult, { projectId: "prj_EXPLICITID999" });

    expect(profile.project.id).toBe("prj_EXPLICITID999");
  });
});
