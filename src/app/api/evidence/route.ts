import { getApprovedEvidence } from "@/lib/governance-store";
import { createErrorResponse, errorCodes } from "@/lib/schemas";

export async function GET() {
  try {
    const evidence = await getApprovedEvidence();
    return Response.json(evidence);
  } catch (error) {
    console.error("Evidence fetch failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Could not fetch evidence records.");
  }
}