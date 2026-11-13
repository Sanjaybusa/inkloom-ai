import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, errorCodes } from "@/lib/schemas";
import { getCampaign, getRunsForCampaign } from "@/lib/governance-store";

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

    const runs = await getRunsForCampaign(id);
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Campaign runs GET failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Failed to fetch campaign runs");
  }
}