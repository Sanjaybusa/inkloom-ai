import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, errorCodes } from "@/lib/schemas";
import { createCampaign, getCampaigns, getCampaignsWithStats } from "@/lib/governance-store";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

const DEMO_ORG_ID = process.env.DEMO_ORG_ID ?? "northwind-demo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get("withStats") === "true";

    const campaigns = withStats
      ? await getCampaignsWithStats(DEMO_ORG_ID)
      : await getCampaigns(DEMO_ORG_ID);

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Campaigns GET failed", error);
    if (error instanceof Error) {
      // Handle specific Supabase errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        return createErrorResponse(errorCodes.FORBIDDEN, "Authentication required", {}, 401);
      }
      if (error.message.includes("not found") || error.message.includes("PGRST116")) {
        return createErrorResponse(errorCodes.NOT_FOUND, "Campaigns not found", {}, 404);
      }
    }
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Failed to fetch campaigns");
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "campaigns-create" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const body = await request.json();
    const { title, description, brandId, channel, market, status } = body;

    if (!title?.trim()) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Title is required");
    }
    if (title.length > 200) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Title must be 200 characters or fewer");
    }
    if (description && description.length > 10000) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Description must be 10,000 characters or fewer");
    }

    const id = `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const campaign = await createCampaign({
      id,
      organizationId: DEMO_ORG_ID,
      title: title.trim(),
      description: description?.trim(),
      brandId,
      channel,
      market,
      status: status ?? "draft",
      createdBy: "demo-user", // In production, get from auth
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: error.message });
    }
    if (error instanceof Error && error.message.includes("duplicate")) {
      return createErrorResponse(errorCodes.CONFLICT, "Campaign with this ID already exists", {}, 409);
    }
    console.error("Campaigns POST failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Failed to create campaign");
  }
}