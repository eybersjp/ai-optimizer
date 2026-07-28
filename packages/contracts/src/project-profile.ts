import { z } from "zod";

export const ProjectProfileSchema = z.object({
  schemaVersion: z.string().default("1.0.0"),
  project: z.object({
    id: z.string(),
    name: z.string(),
    root: z.string(),
    archetype: z.string(),
    maturity: z.string()
  }),
  stack: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    packageManager: z.string().optional(),
    database: z.string().optional(),
    databaseProvider: z.string().optional(),
    deployment: z.string().optional()
  }),
  architecture: z.object({
    style: z.string(),
    tenancy: z.string().optional(),
    confidence: z.number().min(0).max(1)
  }),
  experts: z.object({
    enabled: z.array(z.string())
  }),
  agents: z.object({
    primary: z.string(),
    implementation: z.string(),
    review: z.string(),
    verification: z.string()
  }),
  context: z.object({
    strategy: z.string(),
    maximumPreloadTokens: z.number(),
    dynamicRetrieval: z.boolean()
  }),
  qualityGates: z.object({
    typecheck: z.boolean(),
    lint: z.boolean(),
    unitTests: z.boolean(),
    browserVerification: z.boolean(),
    securityReview: z.boolean()
  })
});

export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;
