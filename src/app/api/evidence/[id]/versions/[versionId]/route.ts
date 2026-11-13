import { getEvidenceVersion } from "@/lib/governance-store";
import { createErrorResponse, errorCodes } from "@/lib/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const version = await getEvidenceVersion(id, versionId);

    if (!version) return createErrorResponse(errorCodes.NOT_FOUND, "Version not found.");

    return Response.json(version);
  } catch (error) {
    console.error("Evidence version GET failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Could not fetch evidence version.");
  }
}