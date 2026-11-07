import { analyzeSchema, createErrorResponse, errorCodes, type Claim } from "@/lib/schemas";
import { evaluateClaimsAgainstRules, isSampleContent, newRunId, RULES_VERSION, EVIDENCE_VERSION, verifyFindingsAgainstEvidence } from "@/lib/governance-engine";
import type { GovernanceRun, AuditEntry } from "@/lib/governance";
import { getLatestRun, saveRun, getApprovedEvidence } from "@/lib/governance-store";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count += 1;
  return { allowed: true };
}

async function extractClaims(text: string, origin: string): Promise<Claim[]> {
  try {
    const response = await fetch(`${origin}/api/extract-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.claims ?? []) as Claim[];
  } catch (error) {
    console.error("Claim extraction failed, using fallback", error);
    return [];
  }
}

function buildAnalysisAuditEntry(
  findingsCount: number,
  claimsExtracted: number,
  aiAssistance: boolean
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    event: "analysis_completed",
    actor: "Inkloom system",
    timestamp: new Date().toISOString(),
    details: {
      findings: findingsCount,
      claimsExtracted,
      aiAssistance,
      rulesVersion: RULES_VERSION,
      evidenceVersion: EVIDENCE_VERSION,
    },
  };
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, {
      "Retry-After": String(rateLimit.retryAfter ?? 60),
    });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://${request.headers.get("host") ?? "localhost:3000"}`;

  try {
    const body = await request.json();
    const { text, contentId } = analyzeSchema.parse(body);

    const sample = isSampleContent(text);

    // Step 1: Extract claims using LLM (or deterministic fallback)
    const extractedClaims = await extractClaims(text, origin);

    // Step 2: Evaluate claims against deterministic rules
    const deterministic = evaluateClaimsAgainstRules(extractedClaims, text, sample);

    // Step 3: Verify findings against evidence library
    const evidenceLibrary = await getApprovedEvidence();
    const evidenceForVerification = evidenceLibrary.map((e) => ({ id: e.id, title: e.source, evidence: e.passage }));
    const { findings: evidenceBacked } = verifyFindingsAgainstEvidence(deterministic, evidenceForVerification);

    const now = new Date().toISOString();
    const previous = await getLatestRun(contentId);
    const run: GovernanceRun = {
      id: newRunId(),
      contentId,
      campaignTitle: sample ? "Northwind Q4 Campaign" : "Custom Campaign",
      campaignText: text,
      version: (previous?.version ?? 0) + 1,
      status: "analyzed",
      analyzedAt: now,
      updatedAt: now,
      rulesVersion: RULES_VERSION,
      evidenceVersion: EVIDENCE_VERSION,
      claimsChecked: extractedClaims.length || (sample ? 5 : Math.max(1, text.split(/[.!?\n]+/).filter((part: string) => part.trim()).length)),
      findings: evidenceBacked,
      review: { decision: null, reviewer: null, reason: null, decidedAt: null },
      audit: [buildAnalysisAuditEntry(evidenceBacked.length, extractedClaims.length, extractedClaims.length > 0)],
      aiAssistance: extractedClaims.length > 0,
    };
    await saveRun(run);
    return Response.json(run, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: error.message });
    }
    console.error("Analyze route failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Analysis could not be completed.");
  }
}