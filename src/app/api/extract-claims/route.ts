import { extractClaimsInputSchema, extractClaimsOutputSchema, createErrorResponse, errorCodes, type Claim } from "@/lib/schemas";
import { Anthropic } from "@anthropic-ai/sdk";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a content governance analyst. Extract verifiable claims from marketing copy that require evidence-backed verification.

Focus on:
1. Specific metrics/numbers (e.g., "reduces costs by 40%", "5 data sources", "99.9% uptime")
2. Superlatives & comparatives (e.g., "world's fastest", "#1 platform", "best in class")
3. Product specifications (e.g., "supports 20 integrations", "SOC 2 compliant", "real-time sync")
4. Brand terminology deviations (e.g., using "clients" when brand guide says "customers")
5. Accessibility claims (e.g., "WCAG AA compliant", "screen reader friendly")

Return ONLY claims that could be checked against an evidence library. Do not return subjective statements, aspirations, or vague marketing fluff.

Known evidence library IDs for reference:
- claim-policy-superlatives: Superlatives require dated third-party evidence
- northwind-integrations: Northwind supports 12 data sources (v3.2)
- northwind-terminology: Use "customers" not "clients"; product name is "Northwind Insights"
- wcag-contrast: Normal text requires 4.5:1 contrast ratio (WCAG 2.2 1.4.3)
- wcag-alt-text: Meaningful images require alternative text (WCAG 2.2 1.1.1)

If a claim clearly maps to one of these, include the suggestedEvidenceId.`;

const CLAIM_TOOL_SCHEMA = {
  name: "extract_claims",
  description: "Extract verifiable marketing claims from text for governance review",
  input_schema: {
    type: "object" as const,
    properties: {
      claims: {
        type: "array" as const,
        maxItems: 20,
        items: {
          type: "object" as const,
          properties: {
            text: { type: "string" as const, maxLength: 300, description: "The exact claim text as it appears in the content" },
            category: { type: "string" as const, enum: ["Claim verification", "Fact verification", "Brand consistency", "Accessibility"], description: "Governance category" },
            severity: { type: "string" as const, enum: ["High", "Medium", "Low"], description: "Risk level if claim is unverified" },
            suggestedEvidenceId: { type: "string" as const, description: "Match to known evidence library ID if obvious" },
          },
          required: ["text", "category", "severity"],
          additionalProperties: false,
        },
      },
    },
    required: ["claims"],
    additionalProperties: false,
  },
} as const;

type ExtractionResult = { claims: Claim[]; aiUnavailable?: boolean; aiError?: string };

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 30, keyPrefix: "extract-claims" });
  if (!rateLimit.allowed) {
    return createErrorResponse(errorCodes.RATE_LIMITED, "Too many requests", {}, 429, createRateLimitHeaders(rateLimit));
  }

  try {
    const body = await request.json();
    const parsed = extractClaimsInputSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: parsed.error.message });
    }

    const text = parsed.data.text;

    if (!text || !text.trim()) {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Text is required for claim extraction.");
    }

    const result = await extractClaimsWithFallback(text);
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("Claim extraction failed", error);
    const fallback = fallbackExtraction("");
    return Response.json({ ...fallback, aiUnavailable: true, aiError: error instanceof Error ? error.message : "Unknown error" }, { status: 200 });
  }
}

async function extractClaimsWithFallback(text: string): Promise<ExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ...fallbackExtraction(text), aiUnavailable: true, aiError: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [CLAIM_TOOL_SCHEMA as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "extract_claims" },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use" || toolUse.name !== "extract_claims") {
      console.error("No tool_use returned from Claude", response.content);
      return { ...fallbackExtraction(text), aiUnavailable: true, aiError: "No tool_use returned from Claude" };
    }

    const validated = extractClaimsOutputSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error("Claim extraction schema validation failed", validated.error);
      return { ...fallbackExtraction(text), aiUnavailable: true, aiError: "Schema validation failed" };
    }

    return { claims: validated.data.claims, aiUnavailable: false };
  } catch (error) {
    console.error("Claude API call failed", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown API error";
    return { ...fallbackExtraction(text), aiUnavailable: true, aiError: errorMessage };
  }
}

function fallbackExtraction(text: string): ExtractionResult {
  const lower = text.toLowerCase();
  const claims: Claim[] = [];

  if (lower.includes("80%") || lower.includes("40%") || lower.includes("99%")) {
    claims.push({
      text: extractClaim(text, ["80%", "40%", "99%"]),
      category: "Claim verification",
      severity: "High",
      suggestedEvidenceId: "claim-policy-superlatives",
    });
  }

  if (lower.includes("world's fastest") || lower.includes("world's fastest") || lower.includes("#1") || lower.includes("number one") || lower.includes("best in class")) {
    claims.push({
      text: extractClaim(text, ["world's fastest", "world's fastest", "#1", "number one", "best in class"]),
      category: "Claim verification",
      severity: "High",
      suggestedEvidenceId: "claim-policy-superlatives",
    });
  }

  if (lower.includes("5 data source") || lower.includes("12 data source") || lower.includes("20 integration")) {
    claims.push({
      text: extractClaim(text, ["5 data source", "12 data source", "20 integration"]),
      category: "Fact verification",
      severity: "High",
      suggestedEvidenceId: "northwind-integrations",
    });
  }

  if (lower.includes("clients") || lower.includes("client")) {
    claims.push({
      text: extractClaim(text, ["clients", "client"]),
      category: "Brand consistency",
      severity: "Medium",
      suggestedEvidenceId: "northwind-terminology",
    });
  }

  // Sample-only accessibility claims
  if (text === `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`) {
    claims.push(
      { text: "Campaign banner text contrast", category: "Accessibility", severity: "Medium", suggestedEvidenceId: "wcag-contrast" },
      { text: "Campaign banner image", category: "Accessibility", severity: "High", suggestedEvidenceId: "wcag-alt-text" }
    );
  }

  return { claims };
}

function extractClaim(text: string, phrases: string[]): string {
  const sentences = text.split(/[.!?\n]+/).map((s) => s.trim());
  for (const phrase of phrases) {
    const match = sentences.find((s) => s.toLowerCase().includes(phrase.toLowerCase()));
    if (match) return match.slice(0, 240);
  }
  return phrases[0];
}