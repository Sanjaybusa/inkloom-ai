import { passportQuerySchema, createErrorResponse, errorCodes } from "@/lib/schemas";
import { getLatestRun, getRun } from "@/lib/governance-store";
import { signPassport } from "@/lib/signing";

export async function GET(_request: Request, context: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await context.params;
  const { searchParams } = new URL(_request.url);

  // Parse with base schema first
  const { format } = passportQuerySchema.parse({
    format: searchParams.get("format"),
  });

  // Handle signed parameter separately
  const signed = searchParams.get("signed") === "true";

  const run = await getRun(contentId) ?? await getLatestRun(contentId);
  if (!run) return createErrorResponse(errorCodes.NOT_FOUND, "Trust Passport not found.");

  const supported = run.findings.filter((finding) => finding.status === "Supported").length;
  const outdated = run.findings.filter((finding) => finding.status === "Outdated").length;
  const unverified = run.findings.filter((finding) => ["Unverified", "Brand violation", "Needs correction"].includes(finding.status)).length;
  const accessibility = run.findings.filter((finding) => finding.category === "Accessibility");
  const resolvedAccessibility = accessibility.filter((finding) => finding.action === "accept" || finding.action === "edit").length;

  const passport = {
    schemaVersion: "1.0",
    campaignTitle: run.campaignTitle,
    contentId: run.contentId,
    runId: run.id,
    status: run.status,
    claimsChecked: run.claimsChecked,
    supported,
    outdated,
    unverified,
    accessibilityIssues: accessibility.length,
    resolvedAccessibility,
    findingsCount: run.findings.length,
    highPriorityFindings: run.findings.filter((finding) => finding.severity === "High").length,
    reviewer: run.review.reviewer,
    decision: run.review.decision,
    reason: run.review.reason,
    approvedAt: run.review.decidedAt,
    aiAssistance: run.aiAssistance ? "Declared and recorded" : "No AI assistance used",
    rulesVersion: run.rulesVersion,
    evidenceVersion: run.evidenceVersion,
    auditTrailComplete: run.audit.length > 0,
    auditEvents: run.audit.length,
    generatedAt: run.updatedAt,
  };

  // If signed=true and run is approved, return signed passport
  if (signed && run.status === "approved") {
    try {
      const signedPassport = signPassport(passport);
      return Response.json(signedPassport);
    } catch (error) {
      console.error("Failed to sign passport", error);
      // Fall through to return unsigned passport
    }
  }

  if (format === "json") {
    return Response.json(passport);
  }

  return Response.json(passport);
}