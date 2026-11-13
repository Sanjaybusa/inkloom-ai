import { NextRequest, NextResponse } from "next/server";
import { getEvidenceUsage, getEvidenceRecord } from "@/lib/governance-store";
import { createErrorResponse, errorCodes } from "@/lib/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const versionId = searchParams.get("versionId") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Verify evidence exists
    const evidence = await getEvidenceRecord(id);
    if (!evidence) {
      return createErrorResponse(errorCodes.NOT_FOUND, "Evidence record not found.");
    }

    const usage = await getEvidenceUsage(id, { versionId, limit, offset });

    return NextResponse.json({
      evidence: {
        id: evidence.id,
        title: evidence.source,
        version: evidence.version,
        category: evidence.category,
      },
      findings: usage.findings,
      pagination: {
        limit,
        offset,
        total: usage.total,
      },
    });
  } catch (error) {
    console.error("Evidence usage GET failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Could not fetch evidence usage.");
  }
}