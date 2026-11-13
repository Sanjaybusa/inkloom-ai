import { getApprovedEvidence, createEvidenceRecord } from "@/lib/governance-store";
import { createErrorResponse, errorCodes } from "@/lib/schemas";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";
import { writeEvidenceAudit } from "@/lib/governance-store";

export async function GET() {
  try {
    const evidence = await getApprovedEvidence();
    return Response.json(evidence);
  } catch (error) {
    console.error("Evidence fetch failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Could not fetch evidence records.");
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "evidence-create" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const body = await request.json();
    const { id, category, source, version, passage, approved = true } = body;

    // Validate required fields
    if (!id || !category || !source || !version || !passage) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "id, category, source, version, and passage are required.");
    }

    const created = await createEvidenceRecord({ id, category, source, version, passage, approved });

    // Write audit event
    await writeEvidenceAudit(id, "evidence_created", "api-user", {
      category,
      source,
      version,
      approved,
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("Evidence POST failed", error);
    const message = error instanceof Error ? error.message : "Could not create evidence record.";
    return createErrorResponse(errorCodes.INTERNAL_ERROR, message);
  }
}