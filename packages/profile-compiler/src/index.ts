import {
  CompileInput,
  CompileOutput,
  GeneratedArtifact,
  CompileWarning,
  AgentEnvironmentAdapter
} from "@ai-optimize/contracts";
import { ClaudeCodeAdapter } from "@ai-optimize/adapter-claude-code";
import { VSCodeAdapter } from "@ai-optimize/adapter-vscode";

export class ProfileCompiler {
  private adapters: Map<string, AgentEnvironmentAdapter> = new Map();

  constructor() {
    this.registerAdapter(new ClaudeCodeAdapter());
    this.registerAdapter(new VSCodeAdapter());
  }

  public registerAdapter(adapter: AgentEnvironmentAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public async compile(input: CompileInput): Promise<CompileOutput> {
    const artifacts: GeneratedArtifact[] = [];
    const warnings: CompileWarning[] = [];
    const steps: { action: "create" | "modify" | "backup" | "verify"; targetPath: string; description: string }[] = [];

    // Target configuration artifacts (.ai-optimize/project-profile.json)
    artifacts.push({
      path: ".ai-optimize/project-profile.json",
      content: JSON.stringify(input.project, null, 2),
      artifactType: "project-profile",
      targetAdapter: "core"
    });
    steps.push({
      action: "create",
      targetPath: ".ai-optimize/project-profile.json",
      description: "Write canonical provider-neutral project profile"
    });

    const targetAdapterIds = input.targetAdapters || ["claude-code", "vscode"];

    for (const adapterId of targetAdapterIds) {
      const adapter = this.adapters.get(adapterId);
      if (!adapter) {
        warnings.push({
          code: "ADAPTER_NOT_FOUND",
          message: `Target adapter '${adapterId}' not registered`,
          severity: "warning"
        });
        continue;
      }

      const generated = await adapter.compile(input);
      const validation = await adapter.validate(generated);

      if (!validation.valid) {
        warnings.push({
          code: "ADAPTER_VALIDATION_FAILED",
          message: `Adapter '${adapterId}' generated invalid artifacts: ${(validation.errors || []).join(", ")}`,
          severity: "error"
        });
      }

      for (const art of generated) {
        artifacts.push(art);
        steps.push({
          action: art.isManagedBlock ? "modify" : "create",
          targetPath: art.path,
          description: `Generate ${art.artifactType} for ${adapter.displayName}`
        });
      }
    }

    return {
      canonicalProfile: input.project,
      artifacts,
      warnings,
      activationPlan: {
        projectId: input.project.project.id,
        steps,
        targetAdapters: targetAdapterIds
      }
    };
  }
}
