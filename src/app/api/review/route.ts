import { reviewSchema, createErrorResponse, errorCodes } from "@/lib/schemas";
import { getRun, saveRun, writeCampaignAudit } from "@/lib/governance-store";
import { signPassport } from "@/lib/signing";
import type { Finding } from "@/lib/governance";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

function buildCorrectedText(source: string, allFindings: Finding[]): string {
  let corrected = source;
  for (const item of allFindings) {
    if (item.action === "edit" && item.editedFix && item.claim) {
      corrected = corrected.split(item.claim).join(item.editedFix);
    }
    if (item.action !== "accept" && item.action !== "edit") continue;
    if (item.id === "outdated-integrations" || item.id === "spec-0" || item.id?.startsWith("spec-")) {
      corrected = corrected.replace(/5 data sources/gi, "12 data sources");
      corrected = corrected.replace(/\b\d+\s*data sources?/gi, "12 data sources");
    }
    if (item.id === "brand-terminology" || item.id === "terminology-0" || item.id?.startsWith("terminology-")) {
      corrected = corrected.replace(/\bclients\b/gi, "customers");
    }
    if (item.id === "unsupported-superlative" || item.id === "superlative-0" || item.id?.startsWith("superlative-") || item.id === "metric-0" || item.id?.startsWith("metric-")) {
      corrected = corrected.replace(/^.*world(?:'s|'s) fastest analytics platform.*(?:\n|$)/gim, "");
      corrected = corrected.replace(/^.*#1 platform.*(?:\n|$)/gim, "");
      corrected = corrected.replace(/^.*best in class.*(?:\n|$)/gim, "");
      corrected = corrected.replace(/^.*reduces costs by \d+%.*(?:\n|$)/gim, "");
    }
  }
  return corrected.trim();
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "review" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const body = await request.json();
    const { runId, decision, reviewer, reason, version } = reviewSchema.parse(body);

    const run = await getRun(runId);
    if (!run) return createErrorResponse(errorCodes.NOT_FOUND, "Analysis run not found.");

    if (decision === "approved") {
      const unresolved = run.findings.filter((finding) =>
        finding.action !== "accept" && finding.action !== "edit"
      );
      if (unresolved.length > 0) {
        return createErrorResponse(errorCodes.CONFLICT, `${unresolved.length} finding${unresolved.length === 1 ? "" : "s"} must be accepted or edited before approval.`, { unresolvedFindingIds: unresolved.map((finding) => finding.id) }, 409);
      }
    }

    const now = new Date().toISOString();
    run.status = decision;
    run.review = { decision, reviewer, reason: reason ?? null, decidedAt: now };
    run.updatedAt = now;

    // Build corrected campaign text when approved
    if (decision === "approved") {
      run.correctedCampaignText = buildCorrectedText(run.campaignText, run.findings);
    }

    run.audit.push({
      id: crypto.randomUUID(),
      event: `review_${decision}` as "review_approved" | "review_rejected" | "review_changes_requested",
      actor: reviewer,
      timestamp: now,
      details: { reason: reason ?? null, version: run.version },
    });

    await saveRun(run, version);

    // Write campaign audit event
    if (run.campaignId) {
      await writeCampaignAudit(run.campaignId, "campaign_reviewed", reviewer, {
        runId: run.id,
        decision,
        reason: reason ?? null,
        version: run.version,
      });
    }

    // If approved, also return signed passport in response for immediate verification
    let signedPassport = null;
    if (decision === "approved") {
      try {
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

        signedPassport = signPassport(passport);
      } catch (signError) {
        console.error("Failed to sign passport on approval", signError);
      }
    }

    return Response.json({ ...run, signedPassport });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: error.message });
    }
    if (error instanceof Error && error.message.includes("Version conflict")) {
      return createErrorResponse(errorCodes.CONFLICT, "Run was modified by another request. Please refresh.", {}, 409);
    }
    console.error("Review route failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Review decision could not be recorded.");
  }
}