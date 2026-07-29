/**
 * Audit Verification Tests — Subsystem: audit verification (Milestone 3C)
 *
 * Validates test inventory integrity, subsystem suite discovery, TypeScript evidence
 * priority, source artifact hygiene, path safety, and scanner determinism.
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { getAuthoritativeTestInventory } from "../scripts/test-inventory.js";
import { checkSourceArtifacts } from "../scripts/guard-source-artifacts.js";

describe("Audit Verification Subsystem — Test Integrity & Scanner Evidence", () => {
  it("1. All required subsystem suites are discoverable and collected in test inventory", () => {
    const inventory = getAuthoritativeTestInventory();
    const requiredSubsystems = [
      "activation",
      "audit verification",
      "classifier",
      "compiler",
      "identity",
      "identity hardening",
      "scanner"
    ];

    for (const required of requiredSubsystems) {
      expect(inventory.subsystems).toContain(required);
      const subTests = inventory.tests.filter((t) => t.subsystem === required);
      expect(subTests.length).toBeGreaterThan(0);
    }
  });

  it("2. Compiler integration tests are present and collected", () => {
    const inventory = getAuthoritativeTestInventory();
    const compilerTests = inventory.tests.filter((t) => t.subsystem === "compiler");
    expect(compilerTests.length).toBeGreaterThanOrEqual(5);
    expect(compilerTests.some((t) => t.file === "tests/compiler.test.ts")).toBe(true);
  });

  it("3. Test inventory collected total matches sum of test statuses", () => {
    const inventory = getAuthoritativeTestInventory();
    expect(inventory.totalCollectedTests).toBe(inventory.tests.length);
    expect(inventory.totalCollectedTests).toBe(
      inventory.totalPassed + inventory.totalFailed + inventory.totalSkipped + inventory.totalTodo
    );
  });

  it("4. Skipped tests are reported separately from active tests", () => {
    const inventory = getAuthoritativeTestInventory();
    expect(typeof inventory.totalSkipped).toBe("number");
    expect(inventory.totalSkipped).toBe(inventory.tests.filter((t) => t.status === "skipped").length);
  });

  it("5. TypeScript evidence ownership is accurate and cites authored source files", () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const result = scanner.scan(root);

    const tsTechs = result.rich.technologies.filter((t) => t.id === "typescript");
    expect(tsTechs.length).toBe(17);

    for (const tech of tsTechs) {
      expect(tech.owningPackage).toBeTruthy();
      expect(tech.owningPackageDir).toBeTruthy();
      expect(tech.sourcePath).toBeTruthy();
      expect(tech.sourcePath).not.endsWith(".d.ts");
      expect(tech.evidenceId).toMatch(/^ast_/);

      const fullPath = path.resolve(tech.sourcePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }

    // Specific check for packages/contracts
    const contractsTech = tsTechs.find((t) => t.owningPackage === "@ai-optimize/contracts");
    expect(contractsTech).toBeDefined();
    expect(contractsTech?.sourcePath).toMatch(/^packages\/contracts\/src\/.*\.ts$/);
    expect(contractsTech?.sourcePath).not.toContain(".d.ts");
  });

  it("6. Source directory build artifact guard passes cleanly", () => {
    const violations = checkSourceArtifacts();
    expect(violations).toEqual([]);
  });

  it("7. No absolute checkout path appears in scanner summary output", () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const result = scanner.scan(root);

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

  it("8. Repeated scanner summary output is deterministic (excluding timing)", () => {
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
