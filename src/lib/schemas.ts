import { z } from "zod";

export const analyzeSchema = z.object({
  text: z.string().min(1, "Campaign content is required").max(2000, "Campaign text must be 2,000 characters or fewer"),
  contentId: z.string().min(1).max(100).optional().default("northwind-q4"),
});

export const claimSchema = z.object({
  id: z.string().optional().describe("Optional unique identifier for the claim"),
  text: z.string().max(300).describe("The exact claim text as it appears in the content"),
  category: z.enum(["Claim verification", "Fact verification", "Brand consistency", "Accessibility"]).describe("Governance category"),
  severity: z.enum(["High", "Medium", "Low"]).describe("Risk level if claim is unverified"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score for the extracted claim"),
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
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export function createErrorResponse(code: ErrorCode, message: string, details: Record<string, unknown> = {}, status: number = 400, headers?: Record<string, string>) {
  return Response.json({ error: code, message, details }, { status, headers });
}

// Evidence CRUD schemas
export const evidenceCreateSchema = z.object({
  id: z.string().min(1).max(100),
  category: z.enum(["Claim verification", "Fact verification", "Brand consistency", "Accessibility"]),
  source: z.string().min(1).max(200),
  version: z.string().min(1).max(50),
  passage: z.string().min(1).max(5000),
  approved: z.boolean().default(true),
});

export const evidenceUpdateSchema = z.object({
  category: z.enum(["Claim verification", "Fact verification", "Brand consistency", "Accessibility"]).optional(),
  source: z.string().min(1).max(200).optional(),
  passage: z.string().min(1).max(5000).optional(),
});

export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;
export type EvidenceUpdateInput = z.infer<typeof evidenceUpdateSchema>;

// Evidence Record type (for API responses)
export type EvidenceRecord = {
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  approved: boolean;
  deprecated?: boolean;
  deprecated_at?: string;
  deprecated_reason?: string;
  org_id?: string;
  created_at: string;
  versions?: Array<{
    id: string;
    evidence_id: string;
    version: string;
    category: string;
    source: string;
    passage: string;
    approved: boolean;
    deprecated: boolean;
    deprecated_at?: string;
    deprecated_reason?: string;
    created_by: string;
    created_at: string;
  }>;
};