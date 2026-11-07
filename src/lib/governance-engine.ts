import type { Finding, FindingStatus } from "./governance";
import type { Claim } from "@/lib/schemas";

export const RULES_VERSION = "1.0";
export const EVIDENCE_VERSION = "northwind-demo-v2";

const SAMPLE_TEXT = `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`;

function makeFinding(
  id: string,
  title: string,
  category: string,
  severity: "High" | "Medium" | "Low",
  status: FindingStatus,
  claim: string,
  explanation: string,
  evidence: string,
  recommendation: string,
  evidenceId?: string
): Finding {
  return { id, title, category, severity, status, claim, explanation, evidence, evidenceId, recommendation };
}

export function isSampleContent(text: string): boolean {
  return text.trim() === SAMPLE_TEXT.trim();
}

/**
 * Deterministic rule engine - validates extracted claims against known patterns.
 * This replaces the old hardcoded text scanning with claim-aware validation.
 */
export function evaluateClaimsAgainstRules(
  claims: Claim[],
  fullText: string,
  isSample: boolean
): Finding[] {
  const findings: Finding[] = [];
  let findingIndex = 0;

  for (const claim of claims) {
    const ruleResult = applyDeterministicRules(claim, fullText, isSample, findingIndex);
    if (ruleResult) {
      findings.push(ruleResult);
      findingIndex++;
    } else {
      // No deterministic rule matched - create a generic unverified finding
      findings.push(makeFinding(
        `claim-${findingIndex}`,
        `Unverified claim: ${claim.text.slice(0, 50)}...`,
        claim.category,
        claim.severity,
        "Unverified",
        claim.text,
        "This claim was extracted but no deterministic rule applies. Manual evidence review required.",
        "No approved source was found in the claim library.",
        "Attach approved supporting evidence or remove the claim.",
        claim.suggestedEvidenceId
      ));
      findingIndex++;
    }
  }

  // Sample-only accessibility findings (not claim-based)
  if (isSample) {
    findings.push(
      makeFinding(
        "contrast",
        "Low text contrast",
        "Accessibility",
        "Medium",
        "Needs correction",
        "Campaign banner text contrast",
        "The demo banner has a 2.5:1 contrast ratio. Normal text needs at least 4.5:1 for WCAG AA.",
        "WCAG 2.2 AA 1.4.3 and Northwind Brand Guide 5.1 · Normal text requires 4.5:1 contrast.",
        "Use approved dark grey #374151 on white, approximately 10:1, and recalculate contrast.",
        "wcag-contrast"
      ),
      makeFinding(
        "missing-alt-text",
        "Missing image alternative text",
        "Accessibility",
        "High",
        "Needs correction",
        "Campaign banner image",
        "The campaign banner has no alternative text, so meaningful visual content may be inaccessible.",
        "WCAG 2.2 AA 1.1.1 and Northwind Brand Guide 7.4 · Meaningful images require concise alternative text.",
        'Add: "Dashboard showing monthly revenue trends."',
        "wcag-alt-text"
      )
    );
  }

  return findings;
}

function applyDeterministicRules(
  claim: Claim,
  fullText: string,
  isSample: boolean,
  index: number
): Finding | null {
  const lowerClaim = claim.text.toLowerCase();
  const lowerFull = fullText.toLowerCase();

  // Rule 1: Specific savings/efficiency metrics (percentage claims)
  if (/\d+%/.test(claim.text) && (lowerClaim.includes("reduc") || lowerClaim.includes("sav") || lowerClaim.includes("improv") || lowerClaim.includes("faster") || lowerClaim.includes("efficienc"))) {
    return makeFinding(
      `metric-${index}`,
      "Unsupported metric claim",
      "Claim verification",
      "High",
      "Unverified",
      claim.text,
      "The campaign contains a specific metric/figure with no approved source.",
      "No approved source was found in the claim library.",
      "Remove the figure or attach approved supporting evidence.",
      claim.suggestedEvidenceId ?? "claim-policy-superlatives"
    );
  }

  // Rule 2: Superlatives / market leadership claims
  if (lowerClaim.includes("world's fastest") || lowerClaim.includes("world's fastest") || lowerClaim.includes("#1") || lowerClaim.includes("number one") || lowerClaim.includes("best in class") || lowerClaim.includes("market leader") || lowerClaim.includes("fastest platform")) {
    return makeFinding(
      `superlative-${index}`,
      "Unsupported superlative claim",
      "Claim verification",
      "High",
      "Unverified",
      claim.text,
      "A market-wide superlative requires dated third-party evidence.",
      "Claim Policy 3.2 · Superlatives require dated third-party evidence. No matching approved record was found.",
      "Remove the superlative or replace it with a cited benchmark.",
      claim.suggestedEvidenceId ?? "claim-policy-superlatives"
    );
  }

  // Rule 3: Product specifications (data sources, integrations, compliance)
  if (lowerClaim.includes("data source") || lowerClaim.includes("integration") || lowerClaim.includes("support") || lowerClaim.includes("connector")) {
    const versionMatch = claim.text.match(/\d+/);
    const claimedNumber = versionMatch ? parseInt(versionMatch[0], 10) : null;
    const approvedNumber = 12; // From Northwind Product Fact Sheet v3.2

    if (claimedNumber !== null && claimedNumber !== approvedNumber) {
      return makeFinding(
        `spec-${index}`,
        "Outdated product specification",
        "Fact verification",
        "High",
        "Outdated",
        claim.text,
        `The claim states ${claimedNumber} but the approved fact sheet specifies ${approvedNumber}.`,
        `Northwind Product Fact Sheet · v3.2 · Approved fact: ${approvedNumber} supported data sources.`,
        `Replace ${claimedNumber} with ${approvedNumber} and confirm against the current approved product fact sheet.`,
        claim.suggestedEvidenceId ?? "northwind-integrations"
      );
    }
  }

  // Rule 4: Brand terminology (clients vs customers)
  if (lowerClaim.includes("client") && !lowerClaim.includes("client-side") && !lowerClaim.includes("client server")) {
    return makeFinding(
      `terminology-${index}`,
      "Unapproved brand terminology",
      "Brand consistency",
      "Medium",
      "Brand violation",
      claim.text,
      "Northwind uses 'customers' rather than 'clients' in approved campaign copy.",
      "Northwind Brand Guide · Terminology: use customers, not clients; use Northwind Insights as the approved product name.",
      "Replace 'clients' with 'customers'.",
      claim.suggestedEvidenceId ?? "northwind-terminology"
    );
  }

  // Rule 5: Accessibility claims
  if (lowerClaim.includes("wcag") || lowerClaim.includes("accessib") || lowerClaim.includes("screen reader") || lowerClaim.includes("contrast") || lowerClaim.includes("alt text")) {
    const evidenceId = lowerClaim.includes("contrast") ? "wcag-contrast" : "wcag-alt-text";
    return makeFinding(
      `a11y-${index}`,
      "Accessibility claim requires verification",
      "Accessibility",
      lowerClaim.includes("contrast") ? "Medium" : "High",
      "Needs correction",
      claim.text,
      "Accessibility claims must be verified against WCAG standards and brand guidelines.",
      `${evidenceId === "wcag-contrast" ? "WCAG 2.2 AA 1.4.3" : "WCAG 2.2 AA 1.1.1"} and Northwind Brand Guide · ${evidenceId === "wcag-contrast" ? "Normal text requires 4.5:1 contrast" : "Meaningful images require alternative text"}.`,
      evidenceId === "wcag-contrast"
        ? "Use approved dark grey #374151 on white, approximately 10:1, and recalculate contrast."
        : 'Add descriptive alternative text for meaningful images.',
      claim.suggestedEvidenceId ?? evidenceId
    );
  }

  // Rule 6: Compliance / certification claims
  if (lowerClaim.includes("soc 2") || lowerClaim.includes("iso") || lowerClaim.includes("gdpr") || lowerClaim.includes("hipaa") || lowerClaim.includes("compliant") || lowerClaim.includes("certified")) {
    return makeFinding(
      `compliance-${index}`,
      "Unverified compliance claim",
      "Fact verification",
      "High",
      "Unverified",
      claim.text,
      "Compliance and certification claims require current, dated evidence from accredited auditors.",
      "No approved compliance evidence was found in the library.",
      "Attach current compliance certificate or audit report, or remove the claim.",
      claim.suggestedEvidenceId
    );
  }

  // No deterministic rule matched
  return null;
}

// Deterministic evidence verification - no AI calls
export function verifyFindingsAgainstEvidence(
  findings: Finding[],
  evidenceLibrary: Array<{ id: string; title: string; evidence: string }>
): { findings: Finding[]; usedAi: boolean } {
  const evidenceById = new Map(evidenceLibrary.map((e) => [e.id, e]));
  const verifiedFindings = findings.map((finding) => {
    if (!finding.evidenceId) return finding;
    const evidence = evidenceById.get(finding.evidenceId);
    if (!evidence) return finding;
    return {
      ...finding,
      status: "Supported" as FindingStatus,
      explanation: `Verified against ${evidence.title}: ${evidence.evidence}`,
    };
  });
  return { findings: verifiedFindings, usedAi: false };
}

export function newRunId(): string {
  return `inkloom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}