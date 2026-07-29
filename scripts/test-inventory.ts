import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

export interface TestItem {
  file: string;
  subsystem: string;
  suite: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "todo";
  duration?: number;
}

export interface InventoryResult {
  totalFiles: number;
  totalCollectedTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalTodo: number;
  subsystems: string[];
  tests: TestItem[];
}

export const SUBSYSTEM_MAPPING: Record<string, string> = {
  "activation.test.ts": "activation",
  "classifier.test.ts": "classifier",
  "compiler.test.ts": "compiler",
  "identity.test.ts": "identity",
  "identity-hardening.test.ts": "identity hardening",
  "scanner.test.ts": "scanner",
  "audit-verification.test.ts": "audit verification"
};

export function getAuthoritativeTestInventory(root = path.resolve(".")): InventoryResult {
  let jsonOutput = "";
  try {
    jsonOutput = execFileSync("npx", ["vitest", "run", "--reporter=json"], {
      cwd: root,
      encoding: "utf-8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      windowsHide: true
    });
  } catch (err: any) {
    jsonOutput = err.stdout?.toString() ?? err.stderr?.toString() ?? "";
  }

  const jsonStart = jsonOutput.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`Failed to extract JSON from Vitest output: ${jsonOutput.slice(0, 500)}`);
  }
  const rawData = JSON.parse(jsonOutput.slice(jsonStart));

  const tests: TestItem[] = [];
  const discoveredSubsystems = new Set<string>();

  for (const fileResult of rawData.testResults ?? []) {
    const normPath = (fileResult.name ?? "").replace(/\\/g, "/");
    const filename = path.basename(normPath);
    const relativeFile = normPath.includes("tests/") ? `tests/${filename}` : filename;
    const subsystem = SUBSYSTEM_MAPPING[filename] ?? "unknown";
    discoveredSubsystems.add(subsystem);

    for (const assertion of fileResult.assertionResults ?? []) {
      const suite = (assertion.ancestorTitles ?? []).join(" > ") || "Root";
      const statusMap: Record<string, "passed" | "failed" | "skipped" | "todo"> = {
        passed: "passed",
        failed: "failed",
        pending: "skipped",
        skipped: "skipped",
        todo: "todo"
      };
      const status = statusMap[assertion.status] ?? "passed";
      tests.push({
        file: relativeFile,
        subsystem,
        suite,
        name: assertion.title,
        status,
        duration: assertion.duration
      });
    }
  }

  return {
    totalFiles: rawData.numTotalTestSuites ?? 0,
    totalCollectedTests: rawData.numTotalTests ?? 0,
    totalPassed: rawData.numPassedTests ?? 0,
    totalFailed: rawData.numFailedTests ?? 0,
    totalSkipped: rawData.numPendingTests ?? 0,
    totalTodo: rawData.numTodoTests ?? 0,
    subsystems: [...discoveredSubsystems].sort(),
    tests
  };
}

// Backwards-compatible export name for inventory callers
export const buildTestInventory = getAuthoritativeTestInventory;

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/test-inventory.ts")) {
  const inventory = getAuthoritativeTestInventory();
  console.log(JSON.stringify(inventory, null, 2));
}
