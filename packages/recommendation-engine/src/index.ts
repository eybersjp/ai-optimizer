import { ProjectProfile, ProjectAssertion } from "@ai-optimize/contracts";

export interface Recommendation {
  id: string;
  origin: "deterministic-rule" | "evidence-inference" | "expert-judgement";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
  proposedChanges: string[];
}

export class RecommendationEngine {
  public generateRecommendations(
    profile: ProjectProfile,
    assertions: ProjectAssertion[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Deterministic Rule 1: TypeScript Quality Gates
    if (profile.stack.languages.includes("typescript") && !profile.qualityGates.typecheck) {
      recommendations.push({
        id: "rec_ts_typecheck",
        origin: "deterministic-rule",
        title: "Enable Strict Typecheck Quality Gate",
        description: "TypeScript repository detected without explicit strict typecheck gate enabled.",
        impact: "high",
        actionable: true,
        proposedChanges: ["Enable qualityGates.typecheck in project profile"]
      });
    }

    // Evidence Inference 1: Tenancy Model Review
    if (profile.architecture.tenancy === "organisation-scoped") {
      recommendations.push({
        id: "rec_tenancy_review",
        origin: "evidence-inference",
        title: "Enforce Organisation Boundary Validation in API Routes",
        description: "Multi-tenant organisation-scoped tenancy detected. Ensure all endpoints filter by organisationId.",
        impact: "high",
        actionable: true,
        proposedChanges: ["Add security pack validator for tenant isolation"]
      });
    }

    // Expert Judgement 1: Claude Code Rules Integration
    if (profile.experts.enabled.includes("nextjs")) {
      recommendations.push({
        id: "rec_nextjs_rules",
        origin: "expert-judgement",
        title: "Include Next.js App Router Rules in Agent Context",
        description: "Next.js framework detected. Preload App Router & Server Action best practices into .claude/rules/.",
        impact: "medium",
        actionable: true,
        proposedChanges: ["Generate .claude/rules/nextjs.md"]
      });
    }

    return recommendations;
  }
}
