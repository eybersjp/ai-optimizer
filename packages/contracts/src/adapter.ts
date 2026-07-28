import { CompileInput, GeneratedArtifact } from "./compiler.js";

export interface AdapterState {
  id: string;
  active: boolean;
  managedFiles: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface AgentEnvironmentAdapter {
  readonly id: string;
  readonly displayName: string;

  detect(projectRoot: string): Promise<boolean>;
  compile(input: CompileInput): Promise<GeneratedArtifact[]>;
  validate(artifacts: GeneratedArtifact[]): Promise<ValidationResult>;
}
