import * as path from "node:path";
import { ProjectProfile } from "@ai-optimize/contracts";
import { ScanResult } from "@ai-optimize/project-scanner";

/**
 * Options passed to classify().
 * The projectId MUST come from the canonical identity service.
 * ProjectClassifier never generates project IDs.
 */
export interface ClassifyOptions {
  /** Stable canonical project ID from @ai-optimize/project-identity. */
  projectId: string;
}

export class ProjectClassifier {
  public classify(scanResult: ScanResult, options: ClassifyOptions): ProjectProfile {
    const projectName = path.basename(scanResult.root);

    // Combine top-level and workspace-level frameworks
    const allFrameworks = new Set<string>(scanResult.frameworks);
    if (scanResult.rich?.workspacePackages) {
      for (const pkg of scanResult.rich.workspacePackages) {
        for (const fw of pkg.frameworks) {
          allFrameworks.add(fw);
        }
      }
    }

    const hasNext = allFrameworks.has("nextjs");
    const hasSupabase = allFrameworks.has("supabase");
    const hasReact = allFrameworks.has("react");
    const hasExpress = allFrameworks.has("express");
    const hasFastify = allFrameworks.has("fastify");

    // Infer archetype & maturity
    let archetype = "modular-monolith";
    if (hasNext && hasSupabase) {
      archetype = "multi-tenant-saas";
    } else if (hasReact) {
      archetype = "frontend-application";
    } else if (hasExpress || hasFastify) {
      archetype = "backend-service";
    }

    const maturity = "active-development";

    // Infer active experts based on stack findings
    const enabledExperts: string[] = ["core-software"];

    if (scanResult.languages.includes("typescript")) {
      enabledExperts.push("typescript");
    }
    if (hasNext) {
      enabledExperts.push("nextjs");
    }
    if (hasSupabase) {
      enabledExperts.push("postgresql", "supabase");
    }
    if (hasReact || hasNext) {
      enabledExperts.push("design-taste", "motion-design", "impeccable-design");
    }
    enabledExperts.push("security", "testing");

    const frameworksList = Array.from(allFrameworks).sort();

    return {
      schemaVersion: "1.0.0",
      project: {
        id: options.projectId,
        name: projectName,
        root: ".", // Portable repository-relative root
        archetype,
        maturity
      },
      stack: {
        languages: scanResult.languages.length > 0 ? scanResult.languages : ["typescript"],
        frameworks: frameworksList,
        packageManager: "pnpm",
        database: hasSupabase ? "postgresql" : undefined,
        databaseProvider: hasSupabase ? "supabase" : undefined,
        deployment: hasNext ? "vercel" : undefined
      },
      architecture: {
        style: archetype,
        tenancy: hasSupabase ? "organisation-scoped" : "single-tenant",
        confidence: 0.88
      },
      experts: {
        enabled: enabledExperts
      },
      agents: {
        primary: "project-orchestrator",
        implementation: "software-engineer",
        review: "code-reviewer",
        verification: "verification-engineer"
      },
      context: {
        strategy: "task-scoped",
        maximumPreloadTokens: 12000,
        dynamicRetrieval: true
      },
      qualityGates: {
        typecheck: true,
        lint: true,
        unitTests: true,
        browserVerification: hasReact || hasNext,
        securityReview: true
      }
    };
  }
}
