import { z } from "zod";

export const ExpertPackActivationSchema = z.object({
  any: z
    .array(
      z.object({
        dependency: z.string().optional(),
        path: z.string().optional(),
        capability: z.string().optional()
      })
    )
    .optional(),
  all: z
    .array(
      z.object({
        dependency: z.string().optional(),
        path: z.string().optional(),
        capability: z.string().optional()
      })
    )
    .optional()
});

export const ExpertPackProvidesSchema = z.object({
  agents: z.array(z.string()).optional(),
  workflows: z.array(z.string()).optional(),
  validators: z.array(z.string()).optional()
});

export const ExpertPackSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string().optional(),
  activation: ExpertPackActivationSchema,
  provides: ExpertPackProvidesSchema.optional(),
  requires: z
    .object({
      permissions: z.record(z.string(), z.any()).optional()
    })
    .optional(),
  context: z
    .object({
      preload: z.array(z.string()).optional(),
      retrieveOnDemand: z.array(z.string()).optional()
    })
    .optional()
});

export type ExpertPack = z.infer<typeof ExpertPackSchema>;
