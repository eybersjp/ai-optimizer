import { execSync } from "node:child_process";
import { buildTestInventory } from "./test-inventory.js";

function runStep(name: string, command: string): void {
  console.log(`\n=== STEP: ${name} (${command}) ===`);
  try {
    const output = execSync(command, { encoding: "utf-8", stdio: "pipe" });
    if (output.trim()) console.log(output.trim());
    console.log(`✓ ${name} PASSED`);
  } catch (err: any) {
    console.error(`❌ ${name} FAILED:`);
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    process.exit(1);
  }
}

function main(): void {
  console.log("=========================================");
  console.log(" AI OPTIMIZE REPOSITORY VERIFICATION");
  console.log("=========================================");

  runStep("1. Workspace Build", "pnpm build");
  runStep("2. Subsystem Test Suite Execution", "pnpm test");
  runStep("3. TypeScript Typecheck & Lint", "pnpm lint");
  runStep("4. Git Whitespace Integrity Check", "git diff --check");

  console.log("\n=== 5. AUTHORITATIVE TEST INVENTORY REPORT ===");
  const inventory = buildTestInventory();
  console.log(`Total Test Files:   ${inventory.totalFiles}`);
  console.log(`Total Active Tests:  ${inventory.totalActiveTests}`);
  console.log(`Total Skipped Tests: ${inventory.totalSkippedTests}`);
  console.log(`Covered Subsystems:  ${inventory.subsystems.join(", ")}`);

  console.log("\n=========================================");
  console.log(" ALL VERIFICATION CHECKS PASSED CLEANLY!");
  console.log("=========================================");
}

main();
