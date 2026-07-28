import {
  AgentEnvironmentAdapter,
  CompileInput,
  GeneratedArtifact,
  ValidationResult
} from "@ai-optimize/contracts";

export class ClaudeCodeAdapter implements AgentEnvironmentAdapter {
  public readonly id = "claude-code";
  public readonly displayName = "Claude Code";

  public async detect(projectRoot: string): Promise<boolean> {
    return true; // Always supported
  }

  public async compile(input: CompileInput): Promise<GeneratedArtifact[]> {
    const { project } = input;
    const artifacts: GeneratedArtifact[] = [];

    // 1. CLAUDE.md (Concise, bounded < 200 lines)
    const claudeMdContent = `# ${project.project.name}

> Compiled by AI Optimize v0.1

## Project Profile
- Archetype: ${project.project.archetype}
- Maturity: ${project.project.maturity}
- Architecture Style: ${project.architecture.style}
- Tenancy: ${project.architecture.tenancy ?? "single-tenant"}

## Technical Stack
- Languages: ${project.stack.languages.join(", ")}
- Frameworks: ${project.stack.frameworks.join(", ")}
- Package Manager: ${project.stack.packageManager ?? "pnpm"}
- Database: ${project.stack.database ?? "N/A"} (${project.stack.databaseProvider ?? "N/A"})

## Quality Gates
- Typecheck Required: ${project.qualityGates.typecheck}
- Unit Tests Required: ${project.qualityGates.unitTests}
- Security Review Required: ${project.qualityGates.securityReview}
- Browser Verification Required: ${project.qualityGates.browserVerification}

## Enabled Experts
${project.experts.enabled.map((e) => `- ${e}`).join("\n")}
`;

    artifacts.push({
      path: "CLAUDE.md",
      content: claudeMdContent,
      artifactType: "claude-instructions",
      targetAdapter: this.id
    });

    // 2. .claude/rules/architecture.md
    const archRuleContent = `# Architecture Guidelines

- Architecture Style: ${project.architecture.style}
- Tenancy Model: ${project.architecture.tenancy ?? "single-tenant"}
- Confidence: ${project.architecture.confidence * 100}%

### Enforcement Rules
1. Maintain strict modular boundaries between packages.
2. All tenant data must be scoped to the primary organisation context.
`;

    artifacts.push({
      path: ".claude/rules/architecture.md",
      content: archRuleContent,
      artifactType: "claude-rule",
      targetAdapter: this.id
    });

    // 3. .claude/settings.json
    const claudeSettings = {
      aiOptimize: {
        active: true,
        projectId: project.project.id,
        schemaVersion: project.schemaVersion
      },
      permissions: {
        allowShellCommands: false
      }
    };

    artifacts.push({
      path: ".claude/settings.json",
      content: JSON.stringify(claudeSettings, null, 2),
      artifactType: "claude-settings",
      targetAdapter: this.id
    });

    return artifacts;
  }

  public async validate(artifacts: GeneratedArtifact[]): Promise<ValidationResult> {
    for (const artifact of artifacts) {
      if (artifact.path === "CLAUDE.md") {
        const lineCount = artifact.content.split("\n").length;
        if (lineCount > 200) {
          return {
            valid: false,
            errors: [`CLAUDE.md exceeded 200 lines limit (${lineCount} lines)`]
          };
        }
      }
      if (artifact.path.endsWith(".json")) {
        try {
          JSON.parse(artifact.content);
        } catch (e: any) {
          return {
            valid: false,
            errors: [`Invalid JSON in ${artifact.path}: ${e.message}`]
          };
        }
      }
    }

    return { valid: true };
  }
}
