import {
  AgentEnvironmentAdapter,
  CompileInput,
  GeneratedArtifact,
  ValidationResult
} from "@ai-optimize/contracts";

export class VSCodeAdapter implements AgentEnvironmentAdapter {
  public readonly id = "vscode";
  public readonly displayName = "Visual Studio Code";

  public async detect(projectRoot: string): Promise<boolean> {
    return true;
  }

  public async compile(input: CompileInput): Promise<GeneratedArtifact[]> {
    const { project } = input;

    const managedContent = `{
  // AI-OPTIMIZE:BEGIN project=${project.project.id}
  "aiOptimize.active": true,
  "aiOptimize.profile": ".ai-optimize/project-profile.json",
  "aiOptimize.archetype": "${project.project.archetype}"
  // AI-OPTIMIZE:END
}`;

    return [
      {
        path: ".vscode/settings.json",
        content: managedContent,
        artifactType: "vscode-settings",
        targetAdapter: this.id,
        isManagedBlock: true
      }
    ];
  }

  public async validate(artifacts: GeneratedArtifact[]): Promise<ValidationResult> {
    return { valid: true };
  }
}
