import { z } from "zod";

export const ManagedArtifactRecordSchema = z.object({
  path: z.string(),
  owner: z.literal("ai-optimize"),
  projectId: z.string(),
  artifactType: z.string(),
  generatedHash: z.string(),
  previousHash: z.string().optional(),
  activationId: z.string()
});

export type ManagedArtifactRecord = z.infer<typeof ManagedArtifactRecordSchema>;

export const BackupSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  timestamp: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string().nullable(),
      hash: z.string().nullable()
    })
  )
});

export type BackupSnapshot = z.infer<typeof BackupSnapshotSchema>;

export const ActivationResultSchema = z.object({
  success: z.boolean(),
  activationId: z.string(),
  projectId: z.string(),
  appliedArtifacts: z.array(z.string()),
  backupId: z.string(),
  error: z.string().optional()
});

export type ActivationResult = z.infer<typeof ActivationResultSchema>;

export const RollbackResultSchema = z.object({
  success: z.boolean(),
  activationId: z.string(),
  restoredFiles: z.array(z.string()),
  error: z.string().optional()
});

export type RollbackResult = z.infer<typeof RollbackResultSchema>;
