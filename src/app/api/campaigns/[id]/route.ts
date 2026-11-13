import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, errorCodes } from "@/lib/schemas";
import { getCampaign, updateCampaign } from "@/lib/governance-store";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await getCampaign(id);

    if (!campaign) {
      return createErrorResponse(errorCodes.NOT_FOUND, "Campaign not found", {}, 404);
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Campaign GET failed", error);
    if (error instanceof Error) {
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        return createErrorResponse(errorCodes.FORBIDDEN, "Authentication required", {}, 401);
      }
      if (error.message.includes("not found") || error.message.includes("PGRST116")) {
        return createErrorResponse(errorCodes.NOT_FOUND, "Campaign not found", {}, 404);
      }
    }
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Failed to fetch campaign");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "campaigns-update" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, brandId, channel, market, status, currentRunId } = body;

    // Validation
    if (title !== undefined) {
      if (!title.trim()) {
        return createErrorResponse(errorCodes.VALIDATION_ERROR, "Title cannot be empty");
      }
      if (title.length > 200) {
        return createErrorResponse(errorCodes.VALIDATION_ERROR, "Title must be 200 characters or fewer");
      }
    }
    if (description !== undefined && description.length > 10000) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Description must be 10,000 characters or fewer");
    }
    if (status !== undefined && !["draft", "active", "archived"].includes(status)) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid status. Must be: draft, active, or archived");
    }

    const campaign = await updateCampaign(id, {
      title: title?.trim(),
      description: description?.trim(),
      brandId,
      channel,
      market,
      status,
      currentRunId,
    }, "demo-user"); // In production, get from auth

    if (!campaign) {
      return createErrorResponse(errorCodes.NOT_FOUND, "Campaign not found", {}, 404);
    }

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: error.message });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return createErrorResponse(errorCodes.NOT_FOUND, "Campaign not found", {}, 404);
    }
    console.error("Campaign PATCH failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Failed to update campaign");
  }
}