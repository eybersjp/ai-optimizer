#!/usr/bin/env node
import { Command } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";
import { ExpertEngine } from "@ai-optimize/expert-engine";
import { RecommendationEngine } from "@ai-optimize/recommendation-engine";
import { ProfileCompiler } from "@ai-optimize/profile-compiler";
import { ActivationEngine } from "@ai-optimize/activation-engine";
import {
  loadIdentity,
  createIdentity,
  getIdentityStatus,
  reconcileIdentity,
  IdentityError
} from "@ai-optimize/project-identity";

const program = new Command();

program
  .name("ai-optimize")
  .description("AI Optimize - Configuration Compiler and Governance System")
  .version("0.1.0");

const scanner = new ProjectScanner();
const classifier = new ProjectClassifier();
const expertEngine = new ExpertEngine();
const recommendationEngine = new RecommendationEngine();
const compiler = new ProfileCompiler();
const activationEngine = new ActivationEngine();

expertEngine.loadBuiltinPacks(path.resolve("./expert-packs"));

/**
 * Load canonical project identity for a given root.
 * For `init`, creates identity if missing; for all others, loads existing.
 */
async function requireIdentity(root: string) {
  try {
    return await loadIdentity(root);
  } catch (err) {
    if (err instanceof IdentityError) {
      if (err.code === "IDENTITY_CONFLICT") {
        console.error(`[AI Optimize] Identity conflict detected: ${err.message}`);
        console.error(`[AI Optimize] Run: ai-optimize identity reconcile ${root} --use <projectId>`);
      } else {
        console.error(`[AI Optimize] Identity error (${err.code}): ${err.message}`);
      }
    } else {
      console.error(`[AI Optimize] Unexpected error loading identity: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

program
  .command("init [dir]")
  .description("Initialize AI Optimize for a repository and generate baseline profile")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    console.log(`[AI Optimize] Scanning repository at ${root}...`);

    // Load or create canonical identity
    let identity;
    try {
      identity = await loadIdentity(root);
      console.log(`[AI Optimize] Loaded existing project identity: ${identity.projectId}`);
    } catch (err) {
      if (err instanceof IdentityError && err.code === "PROJECT_NOT_REGISTERED") {
        identity = createIdentity(root);
        console.log(`[AI Optimize] Created new project identity: ${identity.projectId}`);
      } else if (err instanceof IdentityError && err.code === "IDENTITY_CONFLICT") {
        console.error(`[AI Optimize] Identity conflict: ${err.message}`);
        console.error(`[AI Optimize] Run: ai-optimize identity reconcile ${root} --use <projectId>`);
        process.exit(1);
      } else {
        identity = createIdentity(root);
        console.log(`[AI Optimize] Created new project identity: ${identity.projectId}`);
      }
    }

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });

    const aiOptDir = path.join(root, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    fs.writeFileSync(
      path.join(aiOptDir, "project-profile.json"),
      JSON.stringify(profile, null, 2),
      "utf-8"
    );

    console.log(`[AI Optimize] Project initialized: ${profile.project.name} (${profile.project.archetype})`);
    console.log(`[AI Optimize] Profile compiled to .ai-optimize/project-profile.json`);
  });

program
  .command("analyse [dir]")
  .description("Analyse repository architecture, stack, and evidence assertions")
  .option("--summary", "Print concise workspace discovery and technology evidence summary")
  .action(async (dir = ".", options: { summary?: boolean }) => {
    const root = path.resolve(dir);
    const identity = await requireIdentity(root);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });

    if (options.summary) {
      console.log("\n=== WORKSPACE DISCOVERY SUMMARY ===");
      console.log(`Repository Root:      ${scanResult.rich.rootRelative}`);
      console.log(`pnpm Workspace Pkgs:  ${scanResult.rich.workspacePackages.length}`);
      console.log(`Package Graph Nodes:  ${scanResult.rich.packageGraph.nodes.length}`);
      console.log(`Repository Units:     ${scanResult.rich.repositoryUnits.length}`);
      console.log(`Expert Packs:         ${scanResult.rich.expertPacks.length}`);
      console.log(`Applications:         ${scanResult.rich.applications.length}`);
      console.log(`Libraries:            ${scanResult.rich.libraries.length}`);
      console.log(`Configuration Units:  ${scanResult.rich.configurationUnits.length}`);

      console.log("\n=== WORKSPACE PACKAGES ===");
      for (const pkg of scanResult.rich.workspacePackages) {
        const matched = (pkg.matchedBy ?? []).join(",");
        console.log(`- ${pkg.name.padEnd(38)} [${pkg.relativeDir}] role=${pkg.role ?? "unknown"} matchedBy=${matched}`);
      }

      console.log("\n=== TECHNOLOGY & FRAMEWORK EVIDENCE ===");
      for (const tech of scanResult.rich.technologies) {
        const pkgStr = tech.owningPackage ? `${tech.owningPackage} (${tech.owningPackageDir})` : ".";
        console.log(`- [${tech.category.toUpperCase()}] ${tech.name.padEnd(12)} status=${tech.status.padEnd(8)} owner=${pkgStr.padEnd(45)} ver=${(tech.version ?? "unknown").padEnd(10)} src=${tech.sourcePath}`);
        console.log(`  Evidence ID: ${tech.evidenceId}`);
      }
      return;
    }

    console.log("\n=== PROJECT PROFILE ===");
    console.log(JSON.stringify(profile, null, 2));

    console.log("\n=== EVIDENCE ASSERTIONS ===");
    console.log(JSON.stringify(scanResult.assertions, null, 2));
  });

program
  .command("explain [dir]")
  .description("Explain evidence supporting current architecture classification")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    const identity = await requireIdentity(root);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });

    console.log(`\nProject: ${profile.project.name}`);
    console.log(`Archetype: ${profile.project.archetype} (Confidence: ${profile.architecture.confidence * 100}%)`);
    console.log(`Tenancy: ${profile.architecture.tenancy}`);
    console.log("\nEvidence Assertions:");
    for (const a of scanResult.assertions) {
      console.log(`- [${a.status.toUpperCase()}] ${a.subject}.${a.predicate}: ${a.explanation}`);
    }
  });

program
  .command("recommendations [dir]")
  .description("Show rule and inference-based project recommendations")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    const identity = await requireIdentity(root);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });
    const recs = recommendationEngine.generateRecommendations(profile, scanResult.assertions);

    console.log("\n=== PROJECT RECOMMENDATIONS ===");
    for (const r of recs) {
      console.log(`\n[${r.origin}] ${r.title} (${r.impact.toUpperCase()})`);
      console.log(`  ${r.description}`);
      console.log(`  Proposed changes: ${r.proposedChanges.join(", ")}`);
    }
  });

program
  .command("compile [dir]")
  .description("Compile target IDE and agent configurations")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    const identity = await requireIdentity(root);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compiled = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    console.log("\n=== COMPILED ARTIFACTS ===");
    for (const art of compiled.artifacts) {
      console.log(`- ${art.path} (${art.artifactType} -> ${art.targetAdapter})`);
    }
  });

program
  .command("diff [dir]")
  .description("Show proposed file changes before activation")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    const identity = await requireIdentity(root);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compiled = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    console.log("\n=== PROPOSED ACTIVATION DIFF ===");
    for (const step of compiled.activationPlan.steps) {
      console.log(`[${step.action.toUpperCase()}] ${step.targetPath}: ${step.description}`);
    }
  });

program
  .command("activate [dir]")
  .description("Safely activate compiled configuration with backup & lock")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    const identity = await requireIdentity(root);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: identity.projectId });
    const activePacks = expertEngine.resolveActivePacks(profile);

    const compiled = await compiler.compile({
      project: profile,
      experts: activePacks,
      targetAdapters: ["claude-code", "vscode"]
    });

    console.log(`[AI Optimize] Activating configuration for ${profile.project.name}...`);
    const result = await activationEngine.activate(root, compiled);

    if (result.success) {
      console.log(`[AI Optimize] Activation successful! (Id: ${result.activationId}, Backup: ${result.backupId})`);
      console.log(`[AI Optimize] Applied artifacts: ${result.appliedArtifacts.join(", ")}`);
    } else {
      console.error(`[AI Optimize] Activation failed: ${result.error}`);
    }
  });

program
  .command("status [dir]")
  .description("Show active configuration status and managed artifacts")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    const profilePath = path.join(root, ".ai-optimize", "project-profile.json");
    const managedPath = path.join(root, ".ai-optimize", "managed-artifacts.json");
    const identityPath = path.join(root, ".ai-optimize", "project.json");

    if (fs.existsSync(identityPath)) {
      const identity = JSON.parse(fs.readFileSync(identityPath, "utf-8"));
      console.log(`\nCanonical Identity: ${identity.projectId}`);
      if (identity.aliases?.length > 0) {
        console.log(`Superseded Aliases: ${identity.aliases.join(", ")}`);
      }
    }

    if (fs.existsSync(profilePath)) {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
      console.log(`\nProject Status: ACTIVE`);
      console.log(`Project Name: ${profile.project.name}`);
      console.log(`Archetype: ${profile.project.archetype}`);

      if (fs.existsSync(managedPath)) {
        const managed = JSON.parse(fs.readFileSync(managedPath, "utf-8"));
        console.log("\nManaged Artifacts:");
        for (const m of managed) {
          console.log(`- ${m.path} (${m.artifactType}) Hash: ${m.generatedHash.substring(0, 16)}...`);
        }
      }
    } else {
      console.log(`\nProject Status: UNREGISTERED / NOT ACTIVATED`);
    }
  });

program
  .command("rollback [dir]")
  .description("Rollback active configuration to previous snapshot")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    console.log(`[AI Optimize] Initiating rollback for ${root}...`);
    const result = await activationEngine.rollback(root);

    if (result.success) {
      console.log(`[AI Optimize] Rollback successful! Snapshot ${result.activationId} restored.`);
      console.log(`Restored files:\n${result.restoredFiles.map((f) => `- ${f}`).join("\n")}`);
    } else {
      console.error(`[AI Optimize] Rollback failed: ${result.error}`);
    }
  });

// Identity management subcommands
const identityCmd = program
  .command("identity")
  .description("Manage project identity");

identityCmd
  .command("status [dir]")
  .description("Report identity status without modifying anything")
  .action((dir = ".") => {
    const root = path.resolve(dir);
    const status = getIdentityStatus(root);

    console.log(`\n=== IDENTITY STATUS: ${root} ===`);
    if (status.hasIdentity) {
      console.log(`Canonical ID:     ${status.identity?.projectId}`);
      console.log(`Schema Version:   ${status.identity?.schemaVersion}`);
      console.log(`Identity Version: ${status.identity?.identityVersion}`);
      console.log(`Created At:       ${status.identity?.createdAt}`);
      console.log(`Registered Root:  ${status.identity?.registeredRoot}`);
      if (status.identity?.aliases && status.identity.aliases.length > 0) {
        console.log(`Aliases:          ${status.identity.aliases.join(", ")}`);
      }
    } else {
      console.log("No canonical identity file found.");
    }

    if (status.candidates.length > 0) {
      console.log(`\nDiscovered candidates (${status.candidates.length}):`);
      for (const c of status.candidates) {
        console.log(`  [${c.source}] ${c.projectId}: ${c.description}`);
      }
    }

    if (status.hasConflict) {
      console.log(`\n⚠  IDENTITY CONFLICT: ${status.conflictingIds.length} conflicting IDs found.`);
      console.log(`   Run: ai-optimize identity reconcile ${dir} --use <projectId>`);
    }
  });

identityCmd
  .command("reconcile [dir]")
  .description("Resolve conflicting project IDs by selecting the canonical ID")
  .option("--use <projectId>", "The project ID to adopt as canonical")
  .action(async (dir = ".", options: { use?: string }) => {
    const root = path.resolve(dir);

    if (!options.use) {
      console.error("[AI Optimize] --use <projectId> is required.");
      console.error(`[AI Optimize] Run: ai-optimize identity status ${dir} to see available IDs.`);
      process.exit(1);
    }

    console.log(`[AI Optimize] Reconciling identity for ${root}...`);
    console.log(`[AI Optimize] Selected canonical ID: ${options.use}`);

    try {
      const result = await reconcileIdentity(root, options.use);
      console.log(`[AI Optimize] Reconciliation successful!`);
      console.log(`  Canonical ID: ${result.canonical.projectId}`);
      if (result.supersededIds.length > 0) {
        console.log(`  Superseded:   ${result.supersededIds.join(", ")}`);
      }
      console.log(`  Backup at:    ${result.backupPath}`);
    } catch (err) {
      if (err instanceof IdentityError) {
        console.error(`[AI Optimize] Reconciliation failed (${err.code}): ${err.message}`);
      } else {
        console.error(`[AI Optimize] Reconciliation failed: ${(err as Error).message}`);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
