import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { getAuthoritativeTestInventory } from "./test-inventory.js";
import { checkSourceArtifacts } from "./guard-source-artifacts.js";

const REQUIRED_SUBSYSTEMS = [
  "activation",
  "audit verification",
  "classifier",
  "compiler",
  "identity",
  "identity hardening",
  "scanner"
];

function runVerification() {
  const root = path.resolve(".");
  console.log("=========================================");
  console.log(" AI OPTIMIZE REPOSITORY VERIFICATION");
  console.log("=========================================\n");

  // Step 1: Workspace Build
  console.log("=== STEP 1: Workspace Build (pnpm build) ===");
  try {
    const buildOutput = execFileSync("pnpm", ["build"], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      windowsHide: true
    });
    console.log(buildOutput);
    console.log("✓ Step 1: Workspace Build PASSED\n");
  } catch (err: any) {
    console.error("❌ Step 1: Workspace Build FAILED");
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }

  // Step 2: Source Artifact Hygiene Guard
  console.log("=== STEP 2: Source Artifact Hygiene Guard ===");
  const sourceViolations = checkSourceArtifacts(root);
  if (sourceViolations.length > 0) {
    console.error("❌ Step 2: Source Artifact Guard FAILED:");
    for (const v of sourceViolations) {
      console.error(`   - ${v.file}: ${v.reason}`);
    }
    process.exit(1);
  }
  console.log("✓ Step 2: Source Artifact Hygiene Guard PASSED\n");

  // Step 3: Authoritative Subsystem Test Suite Execution
  console.log("=== STEP 3: Subsystem Test Execution & Inventory Collection ===");
  let inventory;
  try {
    inventory = getAuthoritativeTestInventory(root);
  } catch (err: any) {
    console.error("❌ Step 3: Subsystem Test Execution FAILED");
    console.error(err.message);
    process.exit(1);
  }

  console.log(`Total Test Files:      ${inventory.totalFiles}`);
  console.log(`Total Collected Tests: ${inventory.totalCollectedTests}`);
  console.log(`Passed Tests:          ${inventory.totalPassed}`);
  console.log(`Failed Tests:          ${inventory.totalFailed}`);
  console.log(`Skipped Tests:         ${inventory.totalSkipped}`);
  console.log(`Todo Tests:            ${inventory.totalTodo}`);
  console.log(`Subsystems (${inventory.subsystems.length}):   ${inventory.subsystems.join(", ")}\n`);

  // Step 4: Strict Count & Subsystem Mismatch Verification
  console.log("=== STEP 4: Authoritative Inventory Comparison & Verification Gates ===");
  let failedGate = false;

  if (inventory.totalFailed > 0) {
    console.error(`❌ Gate Failure: ${inventory.totalFailed} tests failed!`);
    failedGate = true;
  }

  if (inventory.totalSkipped > 0) {
    console.error(`❌ Gate Failure: ${inventory.totalSkipped} skipped tests detected (threshold: 0)!`);
    failedGate = true;
  }

  if (inventory.totalCollectedTests !== inventory.tests.length) {
    console.error(
      `❌ Gate Failure: Vitest collected test count (${inventory.totalCollectedTests}) differs from inventory test list length (${inventory.tests.length})!`
    );
    failedGate = true;
  }

  for (const req of REQUIRED_SUBSYSTEMS) {
    const subsystemTests = inventory.tests.filter((t) => t.subsystem === req);
    if (subsystemTests.length === 0) {
      console.error(`❌ Gate Failure: Required subsystem '${req}' has 0 collected tests!`);
      failedGate = true;
    }
  }

  if (failedGate) {
    console.error("❌ Step 4: Verification Gates FAILED!");
    process.exit(1);
  }
  console.log("✓ Step 4: Verification Gates PASSED\n");

  // Step 5: TypeScript Typecheck & Lint
  console.log("=== STEP 5: TypeScript Typecheck & Lint (pnpm lint) ===");
  try {
    const lintOutput = execFileSync("pnpm", ["lint"], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      windowsHide: true
    });
    console.log(lintOutput);
    console.log("✓ Step 5: TypeScript Typecheck PASSED\n");
  } catch (err: any) {
    console.error("❌ Step 5: TypeScript Typecheck FAILED");
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }

  // Step 6: Git Whitespace Integrity Check
  console.log("=== STEP 6: Git Whitespace Integrity Check (git diff --check) ===");
  try {
    execFileSync("git", ["diff", "--check"], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      windowsHide: true
    });
    console.log("✓ Step 6: Git Whitespace Check PASSED\n");
  } catch (err: any) {
    console.error("❌ Step 6: Git Whitespace Check FAILED");
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }

  console.log("=========================================");
  console.log(" ALL VERIFICATION CHECKS PASSED CLEANLY!");
  console.log("=========================================");
}

runVerification();
