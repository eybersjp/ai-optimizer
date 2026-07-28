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
    // Use stable JSON serialisation: deterministic key order, 2-space indent, LF newline.
    artifacts.push({
      path: ".ai-optimize/project-profile.json",
      content: stableJsonStringify(input.project),
      artifactType: "project-profile",
      targetAdapter: "core"
    });
    steps.push({
      action: "create",
      targetPath: ".ai-optimize/project-profile.json",
      description: "Write canonical provider-neutral project profile"
    });

    // Sort adapter IDs for stable ordering across identical inputs
    const targetAdapterIds = [...(input.targetAdapters || ["claude-code", "vscode"])].sort();

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

      // Sort artifacts within each adapter by path for stable ordering
      const sortedGenerated = [...generated].sort((a, b) => a.path.localeCompare(b.path));
      for (const art of sortedGenerated) {
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

/**
 * Produce byte-identical JSON for identical inputs.
 *
 * Rules:
 * - Consistent 2-space indentation
 * - LF newline termination
 * - No timestamps or random values injected
 * - Arrays preserved in their canonical order
 * - Object key order is governed by the input object's insertion order
 *   (TypeScript/V8 preserves insertion order for string keys)
 */
function stableJsonStringify(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}
