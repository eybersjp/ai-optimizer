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

program
  .command("init [dir]")
  .description("Initialize AI Optimize for a repository and generate baseline profile")
  .action(async (dir = ".") => {
    const root = path.resolve(dir);
    console.log(`[AI Optimize] Scanning repository at ${root}...`);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);

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
  .action((dir = ".") => {
    const root = path.resolve(dir);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);

    console.log("\n=== PROJECT PROFILE ===");
    console.log(JSON.stringify(profile, null, 2));

    console.log("\n=== EVIDENCE ASSERTIONS ===");
    console.log(JSON.stringify(scanResult.assertions, null, 2));
  });

program
  .command("explain [dir]")
  .description("Explain evidence supporting current architecture classification")
  .action((dir = ".") => {
    const root = path.resolve(dir);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);

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
  .action((dir = ".") => {
    const root = path.resolve(dir);
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);
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
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);
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
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);
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
    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult);
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
  .action((dir = ".") => {
    const root = path.resolve(dir);
    const profilePath = path.join(root, ".ai-optimize", "project-profile.json");
    const managedPath = path.join(root, ".ai-optimize", "managed-artifacts.json");

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

program.parse(process.argv);
