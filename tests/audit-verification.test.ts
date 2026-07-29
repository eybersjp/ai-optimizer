/**
 * Audit Verification Tests — Subsystem: audit verification (Milestone 3B)
 *
 * Validates test inventory integrity, subsystem suite discovery, TypeScript evidence
 * ownership, path safety, and scanner determinism.
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { buildTestInventory } from "../scripts/test-inventory.js";

describe("Audit Verification Subsystem — Test Integrity & Scanner Evidence", () => {
  it("1. All required subsystem suites are discoverable in test inventory", () => {
    const inventory = buildTestInventory();
    const requiredSubsystems = [
      "activation",
      "classifier",
      "compiler",
      "identity",
      "identity hardening",
      "scanner"
    ];

    for (const required of requiredSubsystems) {
      expect(inventory.subsystems).toContain(required);
    }
  });

  it("2. Compiler integration tests are present and discoverable", () => {
    const inventory = buildTestInventory();
    const compilerTests = inventory.tests.filter((t) => t.subsystem === "compiler");
    expect(compilerTests.length).toBeGreaterThanOrEqual(5);
    expect(compilerTests.some((t) => t.file === "tests/compiler.test.ts")).toBe(true);
  });

  it("3. Test inventory count accurately reflects discoverable tests", () => {
    const inventory = buildTestInventory();
    expect(inventory.totalActiveTests).toBe(inventory.tests.filter((t) => t.status === "active").length);
    expect(inventory.totalFiles).toBe(inventory.subsystems.length);
  });

  it("4. Skipped tests are reported separately from active tests", () => {
    const inventory = buildTestInventory();
    expect(typeof inventory.totalSkippedTests).toBe("number");
    expect(inventory.totalSkippedTests).toBe(inventory.tests.filter((t) => t.status === "skipped").length);
  });

  it("5. TypeScript evidence ownership is accurate (Option A: package-owned)", () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const result = scanner.scan(root);

    const tsTechs = result.rich.technologies.filter((t) => t.id === "typescript");
    expect(tsTechs.length).toBe(17);

    for (const tech of tsTechs) {
      expect(tech.owningPackage).toBeTruthy();
      expect(tech.owningPackageDir).toBeTruthy();
      expect(tech.sourcePath).toBeTruthy();
      expect(tech.evidenceId).toMatch(/^ast_/);

      // Verify that claimed sourcePath exists on disk
      const fullPath = path.resolve(tech.sourcePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it("6. No absolute checkout path appears in scanner summary output", () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const result = scanner.scan(root);

    // rootRelative must be "."
    expect(result.rich.rootRelative).toBe(".");

    for (const pkg of result.rich.workspacePackages) {
      expect(pkg.relativeDir).not.toContain(":\\");
      expect(pkg.relativeDir).not.toContain(root);
    }

    for (const tech of result.rich.technologies) {
      expect(tech.sourcePath).not.toContain(":\\");
      expect(tech.sourcePath).not.toContain(root);
    }
  });

  it("7. Repeated scanner summary output is deterministic (excluding timing)", () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();

    const res1 = scanner.scan(root);
    const res2 = scanner.scan(root);

    expect(res1.rich.workspacePackages).toEqual(res2.rich.workspacePackages);
    expect(res1.rich.packageGraph).toEqual(res2.rich.packageGraph);
    expect(res1.rich.technologies.map((t) => t.evidenceId)).toEqual(
      res2.rich.technologies.map((t) => t.evidenceId)
    );
    expect(res1.rich.repositoryUnits).toEqual(res2.rich.repositoryUnits);
  });
});
