import { z } from "zod";

export const analyzeSchema = z.object({
  text: z.string().min(1, "Campaign content is required").max(2000, "Campaign text must be 2,000 characters or fewer"),
  contentId: z.string().min(1).max(100).optional().default("northwind-q4"),
});

export const claimSchema = z.object({
  text: z.string().max(300).describe("The exact claim text as it appears in the content"),
  category: z.enum(["Claim verification", "Fact verification", "Brand consistency", "Accessibility"]).describe("Governance category"),
  severity: z.enum(["High", "Medium", "Low"]).describe("Risk level if claim is unverified"),
  suggestedEvidenceId: z.string().optional().describe("Match to known evidence library ID if obvious"),
});

export const extractClaimsInputSchema = z.object({
  text: z.string().min(1, "Text is required for claim extraction").max(10000),
});

export const extractClaimsOutputSchema = z.object({
  claims: z.array(claimSchema).max(20).describe("Extracted verifiable claims from the content"),
});

export type ExtractClaimsInput = z.infer<typeof extractClaimsInputSchema>;
export type ExtractClaimsOutput = z.infer<typeof extractClaimsOutputSchema>;
export type Claim = z.infer<typeof claimSchema>;

export const findingActionSchema = z.object({
  runId: z.string().min(1, "Run ID is required"),
  action: z.enum(["accept", "edit", "dispute"], { errorMap: () => ({ message: "Action must be accept, edit, or dispute" }) }),
  reason: z.string().optional(),
  editedFix: z.string().optional(),
  version: z.number().int().positive("Version is required for optimistic locking"),
});

export const reviewSchema = z.object({
  runId: z.string().min(1, "Run ID is required"),
  decision: z.enum(["approved", "rejected", "changes_requested"], { errorMap: () => ({ message: "Decision must be approved, rejected, or changes_requested" }) }),
  reviewer: z.string().min(1, "Reviewer name is required").max(100),
  reason: z.string().optional(),
  version: z.number().int().positive("Version is required for optimistic locking"),
});

export const passportQuerySchema = z.object({
  format: z.enum(["json", "html"]).nullable().transform((val) => val ?? "json").default("json"),
});

export type AnalyzeInput = z.infer<typeof analyzeSchema>;
export type FindingActionInput = z.infer<typeof findingActionSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type PassportQuery = z.infer<typeof passportQuerySchema>;

export const errorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export function createErrorResponse(code: ErrorCode, message: string, details: Record<string, unknown> = {}, status: number = 400, headers?: Record<string, string>) {
  return Response.json({ error: code, message, details }, { status, headers });
}