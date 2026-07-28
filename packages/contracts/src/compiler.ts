import { z } from "zod";
import { ProjectProfileSchema } from "./project-profile.js";
import { ExpertPackSchema } from "./expert-pack.js";

export const GeneratedArtifactSchema = z.object({
  path: z.string(),
  content: z.string(),
  artifactType: z.string(),
  targetAdapter: z.string(),
  isManagedBlock: z.boolean().optional()
});

export type GeneratedArtifact = z.infer<typeof GeneratedArtifactSchema>;

export const CompileWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"])
});

export type CompileWarning = z.infer<typeof CompileWarningSchema>;

export const ActivationPlanStepSchema = z.object({
  action: z.enum(["create", "modify", "backup", "verify"]),
  targetPath: z.string(),
  description: z.string()
});

export const ActivationPlanSchema = z.object({
  projectId: z.string(),
  steps: z.array(ActivationPlanStepSchema),
  targetAdapters: z.array(z.string())
});

export type ActivationPlan = z.infer<typeof ActivationPlanSchema>;

export const CompileInputSchema = z.object({
  project: ProjectProfileSchema,
  experts: z.array(ExpertPackSchema),
  decisions: z.array(z.any()).optional(),
  targetAdapters: z.array(z.string()).default(["claude-code", "vscode"])
});

export type CompileInput = z.infer<typeof CompileInputSchema>;

export const CompileOutputSchema = z.object({
  canonicalProfile: ProjectProfileSchema,
  artifacts: z.array(GeneratedArtifactSchema),
  warnings: z.array(CompileWarningSchema),
  activationPlan: ActivationPlanSchema
});

export type CompileOutput = z.infer<typeof CompileOutputSchema>;
