import { z } from "zod";

export const AssertionStatusSchema = z.enum([
  "observed",
  "inferred",
  "recommended",
  "unresolved"
]);

export type AssertionStatus = z.infer<typeof AssertionStatusSchema>;

export const EvidenceReferenceSchema = z.object({
  file: z.string(),
  lines: z.tuple([z.number(), z.number()]).optional(),
  reason: z.string()
});

export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const ProjectAssertionSchema = z.object({
  id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  value: z.unknown(),
  status: AssertionStatusSchema,
  confidence: z.number().min(0).max(1),
  sources: z.array(EvidenceReferenceSchema),
  explanation: z.string(),
  createdAt: z.string()
});

export type ProjectAssertion = z.infer<typeof ProjectAssertionSchema>;
