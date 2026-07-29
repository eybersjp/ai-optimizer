import * as fs from "node:fs";
import * as path from "node:path";

export interface TestItem {
  file: string;
  subsystem: string;
  suite: string;
  name: string;
  status: "active" | "skipped";
}

export interface InventoryResult {
  totalFiles: number;
  totalActiveTests: number;
  totalSkippedTests: number;
  subsystems: string[];
  tests: TestItem[];
}

const SUBSYSTEM_MAPPING: Record<string, string> = {
  "activation.test.ts": "activation",
  "classifier.test.ts": "classifier",
  "compiler.test.ts": "compiler",
  "identity.test.ts": "identity",
  "identity-hardening.test.ts": "identity hardening",
  "scanner.test.ts": "scanner",
  "audit-verification.test.ts": "audit verification"
};

export function buildTestInventory(testsDir = path.resolve("./tests")): InventoryResult {
  const testFiles = fs.readdirSync(testsDir)
    .filter((f) => f.endsWith(".test.ts"))
    .sort();

  const tests: TestItem[] = [];
  let totalActive = 0;
  let totalSkipped = 0;
  const discoveredSubsystems = new Set<string>();

  for (const filename of testFiles) {
    const filePath = path.join(testsDir, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    const relativePath = `tests/${filename}`.replace(/\\/g, "/");
    const subsystem = SUBSYSTEM_MAPPING[filename] ?? "unknown";
    discoveredSubsystems.add(subsystem);

    const lines = content.split("\n");
    let currentSuite = "Root";

    for (const line of lines) {
      const trimmed = line.trim();
      const describeMatch = trimmed.match(/describe\s*\(\s*["']([^"']+)["']/);
      if (describeMatch) {
        currentSuite = describeMatch[1];
        continue;
      }

      const itMatch = trimmed.match(/(?:it|test)\s*\(\s*["']([^"']+)["']/);
      const itSkipMatch = trimmed.match(/(?:it|test)\.skip\s*\(\s*["']([^"']+)["']/);

      if (itSkipMatch) {
        tests.push({
          file: relativePath,
          subsystem,
          suite: currentSuite,
          name: itSkipMatch[1],
          status: "skipped"
        });
        totalSkipped++;
      } else if (itMatch) {
        tests.push({
          file: relativePath,
          subsystem,
          suite: currentSuite,
          name: itMatch[1],
          status: "active"
        });
        totalActive++;
      }
    }
  }

  return {
    totalFiles: testFiles.length,
    totalActiveTests: totalActive,
    totalSkippedTests: totalSkipped,
    subsystems: [...discoveredSubsystems].sort(),
    tests
  };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/test-inventory.ts")) {
  const inventory = buildTestInventory();
  console.log(JSON.stringify(inventory, null, 2));
}
