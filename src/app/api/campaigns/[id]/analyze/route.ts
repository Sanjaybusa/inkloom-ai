import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, errorCodes } from "@/lib/schemas";
import { getCampaign, updateCampaign } from "@/lib/governance-store";
import { analyzeContent } from "@/lib/governance-engine";
import { writeCampaignAudit } from "@/lib/governance-store";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 10, keyPrefix: "campaigns-analyze" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    const campaign = await getCampaign(id);
    if (!campaign) {
      return createErrorResponse(errorCodes.NOT_FOUND, "Campaign not found", {}, 404);
    }

    if (!text?.trim()) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Campaign content is required for analysis");
    }
    if (text.length > 2000) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Campaign text must be 2,000 characters or fewer");
    }

    // Use campaign ID as contentId for proper linking
    const contentId = campaign.id;

    // Use the governance engine to analyze
    const run = await analyzeContent(text, contentId, {
      campaignTitle: campaign.title,
      campaignId: campaign.id,
    });

    // Update campaign with latest run
    await updateCampaign(id, { currentRunId: run.id }, "system");

    // Write audit event
    await writeCampaignAudit(id, "campaign_analyzed", "system", {
      runId: run.id,
      findingsCount: run.findings.length,
      claimsChecked: run.claimsChecked,
      rulesVersion: run.rulesVersion,
      evidenceVersion: run.evidenceVersion,
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: error.message });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return createErrorResponse(errorCodes.NOT_FOUND, "Campaign not found", {}, 404);
    }
    if (error instanceof Error && error.message.includes("Rate limit")) {
      return createErrorResponse(errorCodes.RATE_LIMITED, "Too many analysis requests", {}, 429);
    }
    console.error("Campaign analyze failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Failed to analyze campaign");
  }
}