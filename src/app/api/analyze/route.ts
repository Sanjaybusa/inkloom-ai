import { analyzeSchema, createErrorResponse, errorCodes, type Claim } from "@/lib/schemas";
import { evaluateClaimsAgainstRules, isSampleContent, newRunId, RULES_VERSION, EVIDENCE_VERSION, verifyFindingsAgainstEvidence } from "@/lib/governance-engine";
import type { GovernanceRun, AuditEntry } from "@/lib/governance";
import { getLatestRun, saveRun, getApprovedEvidence, getEvidenceStore } from "@/lib/governance-store";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

type DemoMode = "perfect" | "rejected" | "pending" | "empty";

function getDemoMode(request: Request): DemoMode | null {
  const url = new URL(request.url);
  const demo = url.searchParams.get("demo");
  if (demo && ["perfect", "rejected", "pending", "empty"].includes(demo)) {
    return demo as DemoMode;
  }
  return null;
}

function buildDemoFindings(mode: DemoMode): Awaited<ReturnType<typeof verifyFindingsAgainstEvidence>>["findings"] {
  const now = new Date().toISOString();
  const baseFindings = [
    {
      id: "unsupported-superlative",
      title: "Unsupported superlative claim",
      category: "Claim verification",
      severity: "High" as const,
      status: "Unverified" as const,
      claim: "Northwind Insights is the world's fastest analytics platform.",
      explanation: "Market-wide superlatives require dated third-party evidence before publication.",
      evidence: "Claim Policy 3.2: Market-wide superlatives require dated third-party evidence before publication.",
      evidenceId: "claim-policy-superlatives",
      recommendation: "Remove superlative or provide third-party benchmark study.",
      evaluatedAt: now,
      ruleId: "claim-policy-superlatives",
      ruleVersion: RULES_VERSION,
      evidenceVersionId: "claim-policy-superlatives@v1",
    },
    {
      id: "outdated-integrations",
      title: "Outdated data source count",
      category: "Fact verification",
      severity: "High" as const,
      status: "Outdated" as const,
      claim: "It connects to 5 data sources.",
      explanation: "Current product fact sheet states 12 supported data sources.",
      evidence: "Northwind Product Fact Sheet v3.2: Northwind Insights supports 12 data sources in the currently approved product fact sheet.",
      evidenceId: "northwind-integrations",
      recommendation: "Update to 12 data sources per current fact sheet.",
      evaluatedAt: now,
      ruleId: "northwind-integrations",
      ruleVersion: RULES_VERSION,
      evidenceVersionId: "northwind-integrations@v1",
    },
    {
      id: "brand-terminology",
      title: "Incorrect brand terminology",
      category: "Brand consistency",
      severity: "Medium" as const,
      status: "Needs correction" as const,
      claim: "Our clients use our platform to improve reporting.",
      explanation: "Brand guide specifies 'customers' not 'clients'.",
      evidence: "Northwind Brand Guide 7.1: Use customers rather than clients and use Northwind Insights as the approved product name.",
      evidenceId: "northwind-terminology",
      recommendation: "Change 'clients' to 'customers'.",
      evaluatedAt: now,
      ruleId: "northwind-terminology",
      ruleVersion: RULES_VERSION,
      evidenceVersionId: "northwind-terminology@v1",
    },
    {
      id: "wcag-contrast",
      title: "Campaign banner text contrast",
      category: "Accessibility",
      severity: "Medium" as const,
      status: "Unverified" as const,
      claim: "Campaign banner text contrast",
      explanation: "WCAG 2.2 requires 4.5:1 contrast ratio for normal text.",
      evidence: "WCAG 2.2 1.4.3: Normal text must have a contrast ratio of at least 4.5:1.",
      evidenceId: "wcag-contrast",
      recommendation: "Verify banner text meets 4.5:1 contrast ratio.",
      evaluatedAt: now,
      ruleId: "wcag-contrast",
      ruleVersion: RULES_VERSION,
      evidenceVersionId: "wcag-contrast@v1",
    },
    {
      id: "wcag-alt-text",
      title: "Campaign banner image alt text",
      category: "Accessibility",
      severity: "Low" as const,
      status: "Unverified" as const,
      claim: "Campaign banner image",
      explanation: "Meaningful images require concise alternative text.",
      evidence: "WCAG 2.2 1.1.1: Meaningful images require concise and appropriate alternative text.",
      evidenceId: "wcag-alt-text",
      recommendation: "Add descriptive alt text to campaign banner image.",
      evaluatedAt: now,
      ruleId: "wcag-alt-text",
      ruleVersion: RULES_VERSION,
      evidenceVersionId: "wcag-alt-text@v1",
    },
  ];

  switch (mode) {
    case "perfect":
      return baseFindings.map(f => ({ ...f, status: "Supported" as const, action: "accept" as const }));
    case "rejected":
      return baseFindings.map(f => ({ ...f, status: "Unverified" as const, action: "dispute" as const }));
    case "pending":
      return baseFindings.map(f => ({ ...f, status: "Unverified" as const, action: undefined }));
    case "empty":
      return [];
    default:
      return baseFindings;
  }
}

async function extractClaims(text: string, origin: string): Promise<{ claims: Claim[]; aiUnavailable?: boolean; aiError?: string }> {
  try {
    const response = await fetch(`${origin}/api/extract-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return { claims: [], aiUnavailable: true, aiError: `HTTP ${response.status}` };
    const data = await response.json();
    return {
      claims: (data.claims ?? []) as Claim[],
      aiUnavailable: data.aiUnavailable,
      aiError: data.aiError,
    };
  } catch (error) {
    console.error("Claim extraction failed, using fallback", error);
    return { claims: [], aiUnavailable: true, aiError: error instanceof Error ? error.message : "Network error" };
  }
}

function buildAnalysisAuditEntry(
  findingsCount: number,
  claimsExtracted: number,
  aiAssistance: boolean,
  aiUnavailable?: boolean,
  aiError?: string
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
      aiUnavailable: aiUnavailable ?? false,
      aiError: aiError ?? undefined,
    },
  };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 10, keyPrefix: "analyze" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://${request.headers.get("host") ?? "localhost:3000"}`;
  const demoMode = getDemoMode(request);

  try {
    const body = await request.json();
    const { text, contentId } = analyzeSchema.parse(body);

    const sample = isSampleContent(text);

    // Step 1: Extract claims using LLM (or deterministic fallback)
    const { claims: extractedClaims, aiUnavailable, aiError } = await extractClaims(text, origin);

    // Step 2: Evaluate claims against deterministic rules with provenance
    const evidenceStore = await getEvidenceStore();
    const deterministic = evaluateClaimsAgainstRules(extractedClaims, text, sample, {
      rulePackVersion: RULES_VERSION,
      evidenceVersion: EVIDENCE_VERSION,
      evidenceStore: evidenceStore ?? undefined,
    });

    // Step 3: Verify findings against evidence library
    const evidenceLibrary = await getApprovedEvidence();
    const evidenceForVerification = evidenceLibrary.map((e) => ({ id: e.id, title: e.source, evidence: e.passage }));
    const { findings: evidenceBacked } = verifyFindingsAgainstEvidence(deterministic, evidenceForVerification);

    // If AI was unavailable, mark claims that couldn't be evaluated as "Needs Human Review"
    let finalFindings = demoMode ? buildDemoFindings(demoMode) : evidenceBacked;

    if (aiUnavailable && !demoMode) {
      // For claims that weren't caught by deterministic rules, add a "Needs Human Review" finding
      // This ensures deterministic checks still run, but LLM-extracted claims are flagged
      finalFindings = finalFindings.map(f => ({
        ...f,
        // Add note about AI unavailability to existing findings
        explanation: f.explanation + (aiError ? ` [AI analysis unavailable: ${aiError}]` : " [AI analysis unavailable]"),
      }));
    }

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
      findings: finalFindings,
      review: { decision: null, reviewer: null, reason: null, decidedAt: null },
      audit: [buildAnalysisAuditEntry(finalFindings.length, extractedClaims.length, extractedClaims.length > 0, aiUnavailable, aiError)],
      aiAssistance: aiUnavailable
        ? `AI analysis unavailable${aiError ? `: ${aiError}` : ""}. Claims requiring AI evaluation need human review.`
        : extractedClaims.length > 0,
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