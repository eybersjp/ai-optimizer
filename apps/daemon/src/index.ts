import Fastify from "fastify";
import * as path from "node:path";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";
import { ExpertEngine } from "@ai-optimize/expert-engine";
import { RecommendationEngine } from "@ai-optimize/recommendation-engine";
import { ProfileCompiler } from "@ai-optimize/profile-compiler";
import { ActivationEngine } from "@ai-optimize/activation-engine";
import { MemoryEngine } from "@ai-optimize/memory-engine";

const fastify = Fastify({ logger: true });

const scanner = new ProjectScanner();
const classifier = new ProjectClassifier();
const expertEngine = new ExpertEngine();
const recommendationEngine = new RecommendationEngine();
const compiler = new ProfileCompiler();
const activationEngine = new ActivationEngine();
const memoryEngine = new MemoryEngine();

// Load builtin expert packs
const expertPacksDir = path.resolve("../../expert-packs");
expertEngine.loadBuiltinPacks(expertPacksDir);
memoryEngine.init();

fastify.post("/api/v1/projects/init", async (request, reply) => {
  const { path: projectPath } = request.body as { path: string };
  const root = path.resolve(projectPath || ".");
  const scanResult = scanner.scan(root);
  const profile = classifier.classify(scanResult);

  memoryEngine.recordEvent(root, "PROJECT_REGISTERED", profile.project.id, { name: profile.project.name });

  return { success: true, profile };
});

fastify.get("/api/v1/projects/analyse", async (request, reply) => {
  const { path: projectPath } = request.query as { path?: string };
  const root = path.resolve(projectPath || ".");
  const scanResult = scanner.scan(root);
  const profile = classifier.classify(scanResult);

  return { scanResult, profile };
});

fastify.get("/api/v1/projects/explain", async (request, reply) => {
  const { path: projectPath } = request.query as { path?: string };
  const root = path.resolve(projectPath || ".");
  const scanResult = scanner.scan(root);
  const profile = classifier.classify(scanResult);

  return {
    summary: `Project '${profile.project.name}' is classified as archetype '${profile.project.archetype}'.`,
    architecture: profile.architecture,
    stack: profile.stack,
    assertions: scanResult.assertions
  };
});

fastify.get("/api/v1/projects/recommendations", async (request, reply) => {
  const { path: projectPath } = request.query as { path?: string };
  const root = path.resolve(projectPath || ".");
  const scanResult = scanner.scan(root);
  const profile = classifier.classify(scanResult);
  const recommendations = recommendationEngine.generateRecommendations(profile, scanResult.assertions);

  return { recommendations };
});

fastify.post("/api/v1/projects/compile", async (request, reply) => {
  const { path: projectPath, targetAdapters } = request.body as { path?: string; targetAdapters?: string[] };
  const root = path.resolve(projectPath || ".");
  const scanResult = scanner.scan(root);
  const profile = classifier.classify(scanResult);
  const activePacks = expertEngine.resolveActivePacks(profile);

  const compileOutput = await compiler.compile({
    project: profile,
    experts: activePacks,
    targetAdapters: targetAdapters || ["claude-code", "vscode"]
  });

  return compileOutput;
});

fastify.post("/api/v1/projects/activate", async (request, reply) => {
  const { path: projectPath, targetAdapters } = request.body as { path?: string; targetAdapters?: string[] };
  const root = path.resolve(projectPath || ".");
  const scanResult = scanner.scan(root);
  const profile = classifier.classify(scanResult);
  const activePacks = expertEngine.resolveActivePacks(profile);

  const compileOutput = await compiler.compile({
    project: profile,
    experts: activePacks,
    targetAdapters: targetAdapters || ["claude-code", "vscode"]
  });

  const activationResult = await activationEngine.activate(root, compileOutput);

  if (activationResult.success) {
    memoryEngine.recordEvent(root, "ACTIVATION_COMPLETED", profile.project.id, {
      activationId: activationResult.activationId,
      backupId: activationResult.backupId
    });
  }

  return activationResult;
});

fastify.post("/api/v1/projects/rollback", async (request, reply) => {
  const { path: projectPath, backupId } = request.body as { path?: string; backupId?: string };
  const root = path.resolve(projectPath || ".");
  const result = await activationEngine.rollback(root, backupId);

  return result;
});

const start = async () => {
  try {
    await fastify.listen({ port: 4737, host: "127.0.0.1" });
    console.log("AI Optimize Daemon listening on http://127.0.0.1:4737");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
