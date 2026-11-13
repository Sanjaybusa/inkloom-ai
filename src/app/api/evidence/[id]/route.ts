import { getEvidenceRecord, updateEvidenceRecord, deprecateEvidenceRecord } from "@/lib/governance-store";
import { createErrorResponse, errorCodes } from "@/lib/schemas";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";
import { writeEvidenceAudit } from "@/lib/governance-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await getEvidenceRecord(id);

    if (!record) return createErrorResponse(errorCodes.NOT_FOUND, "Evidence record not found.");

    return Response.json({
      ...record,
      versions: record.versions ?? [],
      isDeprecated: record.deprecated ?? false,
    });
  } catch (error) {
    console.error("Evidence GET failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Could not fetch evidence record.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "evidence-update" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { category, source, passage } = body;

    // Validate required fields
    if (!category || !source || !passage) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "category, source, and passage are required.");
    }

    const updated = await updateEvidenceRecord(id, { category, source, passage });

    if (!updated) return createErrorResponse(errorCodes.NOT_FOUND, "Evidence record not found.");

    // Write audit event
    await writeEvidenceAudit(id, "evidence_updated", "api-user", {
      category,
      source,
      passage,
      newVersion: updated.version,
    });

    return Response.json({
      ...updated,
      versions: updated.versions ?? [],
      message: "Evidence updated. New version created.",
    });
  } catch (error) {
    console.error("Evidence PATCH failed", error);
    const message = error instanceof Error ? error.message : "Could not update evidence record.";
    return createErrorResponse(errorCodes.INTERNAL_ERROR, message);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 10, keyPrefix: "evidence-delete" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const { id } = await params;
    const deprecated = await deprecateEvidenceRecord(id);

    if (!deprecated) return createErrorResponse(errorCodes.NOT_FOUND, "Evidence record not found.");

    // Write audit event
    await writeEvidenceAudit(id, "evidence_deprecated", "api-user", {
      reason: deprecated.deprecated_reason,
      deprecatedAt: deprecated.deprecated_at,
    });

    return Response.json({
      ...deprecated,
      versions: deprecated.versions ?? [],
      message: "Evidence record deprecated. History preserved.",
    });
  } catch (error) {
    console.error("Evidence DELETE failed", error);
    const message = error instanceof Error ? error.message : "Could not deprecate evidence record.";
    return createErrorResponse(errorCodes.INTERNAL_ERROR, message);
  }
}