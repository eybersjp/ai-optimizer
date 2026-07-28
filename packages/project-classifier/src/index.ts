import * as path from "node:path";
import { ProjectProfile } from "@ai-optimize/contracts";
import { ScanResult } from "@ai-optimize/project-scanner";

export class ProjectClassifier {
  public classify(scanResult: ScanResult): ProjectProfile {
    const projectName = path.basename(scanResult.root);
    const hasNext = scanResult.frameworks.includes("nextjs");
    const hasSupabase = scanResult.frameworks.includes("supabase");
    const hasReact = scanResult.frameworks.includes("react");

    // Infer archetype & maturity
    let archetype = "modular-monolith";
    if (hasNext && hasSupabase) {
      archetype = "multi-tenant-saas";
    } else if (hasReact) {
      archetype = "frontend-application";
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
    enabledExperts.push("security", "testing");

    return {
      schemaVersion: "1.0.0",
      project: {
        id: `prj_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        name: projectName,
        root: scanResult.root,
        archetype,
        maturity
      },
      stack: {
        languages: scanResult.languages.length > 0 ? scanResult.languages : ["typescript"],
        frameworks: scanResult.frameworks,
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
