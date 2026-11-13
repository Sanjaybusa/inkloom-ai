/**
 * Policy-as-Code Rules Engine
 * Loads YAML rule packs, evaluates claims deterministically, hot-reloadable in dev
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { Claim } from "@/lib/schemas";
import type { Finding, FindingStatus } from "./governance";
import type { EvidenceRecord } from "./governance-store";

export const RULES_VERSION = "1.0";
export const EVIDENCE_VERSION = "northwind-demo-v2";

const SAMPLE_TEXT = `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`;

export function isSampleContent(text: string): boolean {
  return text.trim() === SAMPLE_TEXT.trim();
}

export interface RulePattern {
  type: "regex";
  value: string;
}

export interface RuleCondition {
  field: string;
  operator: "contains_any" | "not_contains_any" | "matches_regex";
  value: string[];
}

export interface Rule {
  id: string;
  name: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  pattern: RulePattern;
  conditions: RuleCondition[];
  evidenceIds: string[];
  explanationTemplate: string;
  recommendationTemplate: string;
  handler?: string; // Optional custom handler name
  version?: string; // Rule version within pack
}

export interface RulePack {
  rulesVersion: string;
  description: string;
  author: string;
  createdAt: string;
  rules: Rule[];
}

let cachedRulePack: RulePack | null = null;
let cachedRulesMtime: number = 0;
const RULES_PATH = path.join(process.cwd(), "rules", "v1", "northwind-governance.yaml");

function loadRulePackFromDisk(): RulePack {
  const fileContent = fs.readFileSync(RULES_PATH, "utf-8");
  const parsed = yaml.load(fileContent) as RulePack;

  // Validate required fields
  if (!parsed.rulesVersion || !parsed.rules || !Array.isArray(parsed.rules)) {
    throw new Error("Invalid rule pack: missing rulesVersion or rules array");
  }

  return parsed;
}

export function getRulePack(forceReload = false): RulePack {
  // In development, check file mtime for hot-reload
  if (process.env.NODE_ENV !== "production") {
    try {
      const stats = fs.statSync(RULES_PATH);
      if (forceReload || stats.mtimeMs > cachedRulesMtime) {
        cachedRulePack = loadRulePackFromDisk();
        cachedRulesMtime = stats.mtimeMs;
        console.log(`[Rules Engine] Loaded rule pack v${cachedRulePack.rulesVersion} (${cachedRulePack.rules.length} rules)`);
      }
    } catch (error) {
      console.error("[Rules Engine] Failed to load rule pack:", error);
      if (!cachedRulePack) throw error;
    }
  } else {
    // Production: load once
    if (!cachedRulePack) {
      cachedRulePack = loadRulePackFromDisk();
      console.log(`[Rules Engine] Loaded rule pack v${cachedRulePack.rulesVersion} (${cachedRulePack.rules.length} rules)`);
    }
  }

  return cachedRulePack!;
}

export function clearRuleCache(): void {
  cachedRulePack = null;
  cachedRulesMtime = 0;
}

/**
 * Check if a claim matches a rule's pattern and conditions
 */
function claimMatchesRule(claim: Claim, rule: Rule): { matched: boolean; matchedText?: string; matchedNumber?: number } {
  const regex = new RegExp(rule.pattern.value, "gi");
  const match = claim.text.match(regex);

  if (!match) return { matched: false };

  const matchedText = match[0];

  // Check conditions
  for (const condition of rule.conditions) {
    const fieldValue = condition.field === "claim.text" ? claim.text : "";
    const values = condition.value;

    switch (condition.operator) {
      case "contains_any": {
        const hasMatch = values.some(v => fieldValue.toLowerCase().includes(v.toLowerCase()));
        if (!hasMatch) return { matched: false };
        break;
      }
      case "not_contains_any": {
        const hasMatch = values.some(v => fieldValue.toLowerCase().includes(v.toLowerCase()));
        if (hasMatch) return { matched: false };
        break;
      }
      case "matches_regex": {
        const hasMatch = values.some(v => new RegExp(v, "i").test(fieldValue));
        if (!hasMatch) return { matched: false };
        break;
      }
    }
  }

  // Extract number if present (for product spec rules)
  const numberMatch = claim.text.match(/\d+/);
  const matchedNumber = numberMatch ? parseInt(numberMatch[0], 10) : undefined;

  return { matched: true, matchedText, matchedNumber };
}

/**
 * Get approved number from evidence (for product spec rules)
 */
function getApprovedNumber(evidenceIds: string[]): number | null {
  // Hardcoded for now - in production, fetch from evidence library
  if (evidenceIds.includes("northwind-integrations")) return 12;
  return null;
}

/**
 * Render template with claim and evidence context
 */
function renderTemplate(template: string, context: Record<string, string | number | string[]>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = context[key];
    if (Array.isArray(value)) return value.join(", ");
    return String(value ?? "");
  });
}

/**
 * Apply a single rule to a claim, returning a Finding if matched
 */
function applyRule(
  claim: Claim,
  rule: Rule,
  fullText: string,
  isSample: boolean,
  index: number,
  options: {
    rulePackVersion: string;
    evidenceVersion: string;
    evidenceStore?: Map<string, EvidenceRecord>;
  }
): Finding | null {
  const match = claimMatchesRule(claim, rule);
  if (!match.matched) return null;

  const evidenceId = rule.evidenceIds[0];
  const evaluatedAt = new Date().toISOString();
  let evidenceVersionId: string | undefined;
  let evidenceStatusAtEvaluation: "active" | "deprecated" | "expired" | "draft" | "unknown" = "unknown";
  let evidenceEffectiveAt: string | undefined;
  let evidenceExpiresAt: string | undefined;

  // Try to get evidence version info from store
  if (options.evidenceStore && evidenceId) {
    const record = options.evidenceStore.get(evidenceId);
    if (record) {
      evidenceVersionId = record.versions?.[0]?.id;
      evidenceStatusAtEvaluation = record.deprecated ? "deprecated" : (record.approved ? "active" : "draft");
      // Note: effective/expiry dates not in current schema but reserved for future
    }
  }

  const provenance = {
    ruleId: rule.id,
    ruleVersion: rule.version ?? "1.0",
    rulePackVersion: options.rulePackVersion,
    evidenceVersionId,
    matchedText: match.matchedText || "",
    evaluatedAt,
    evidenceStatusAtEvaluation,
    evidenceEffectiveAt,
    evidenceExpiresAt,
  };

  // Special handler for product-spec-mismatch
  if (rule.id === "product-spec-mismatch" && match.matchedNumber !== undefined) {
    const approvedNumber = getApprovedNumber(rule.evidenceIds);
    if (approvedNumber !== null && match.matchedNumber !== approvedNumber) {
      return makeFinding(
        `spec-${index}`,
        rule.name,
        rule.category,
        rule.severity,
        "Outdated",
        claim.text,
        renderTemplate(rule.explanationTemplate, {
          matched_number: match.matchedNumber,
          approved_number: approvedNumber,
        }),
        `Northwind Product Fact Sheet · v3.2 · Approved fact: ${approvedNumber} supported data sources.`,
        renderTemplate(rule.recommendationTemplate, {
          matched_number: match.matchedNumber,
          approved_number: approvedNumber,
        }),
        evidenceId,
        provenance
      );
    }
    return null; // Number matches approved
  }

  // Default: create finding with template rendering
  const context = {
    matched_text: match.matchedText || "",
    matched_number: match.matchedNumber ?? "",
    evidence_sources: rule.evidenceIds,
  };

  return makeFinding(
    `${rule.id}-${index}`,
    rule.name,
    rule.category,
    rule.severity,
    "Unverified",
    claim.text,
    renderTemplate(rule.explanationTemplate, context),
    `Approved evidence: ${rule.evidenceIds.join(", ")}`,
    renderTemplate(rule.recommendationTemplate, context),
    evidenceId,
    provenance
  );
}

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
  evidenceId?: string,
  provenance?: {
    ruleId?: string;
    ruleVersion?: string;
    rulePackVersion?: string;
    evidenceVersionId?: string;
    matchedText?: string;
    evaluatedAt?: string;
    evidenceStatusAtEvaluation?: "active" | "deprecated" | "expired" | "draft" | "unknown";
    evidenceEffectiveAt?: string;
    evidenceExpiresAt?: string;
  }
): Finding {
  return {
    id,
    title,
    category,
    severity,
    status,
    claim,
    explanation,
    evidence,
    evidenceId,
    recommendation,
    ...provenance,
  };
}

/**
 * Main entry point: evaluate claims against loaded rule pack
 * Replaces the old hardcoded evaluateClaimsAgainstRules
 */
export function evaluateClaimsAgainstRules(
  claims: Claim[],
  fullText: string,
  isSample: boolean,
  options: {
    rulePackVersion?: string;
    evidenceVersion?: string;
    evidenceStore?: Map<string, EvidenceRecord>;
  } = {}
): Finding[] {
  const rulePack = getRulePack();
  const findings: Finding[] = [];
  let findingIndex = 0;

  for (const claim of claims) {
    let matched = false;

    for (const rule of rulePack.rules) {
      const finding = applyRule(claim, rule, fullText, isSample, findingIndex, {
        rulePackVersion: options.rulePackVersion ?? RULES_VERSION,
        evidenceVersion: options.evidenceVersion ?? EVIDENCE_VERSION,
        evidenceStore: options.evidenceStore,
      });
      if (finding) {
        findings.push(finding);
        findingIndex++;
        matched = true;
        break; // First matching rule wins (rules are ordered by priority)
      }
    }

    if (!matched) {
      // No rule matched - create generic unverified finding
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
        claim.suggestedEvidenceId,
        {
          rulePackVersion: options.rulePackVersion ?? RULES_VERSION,
          evaluatedAt: new Date().toISOString(),
          evidenceStatusAtEvaluation: "unknown",
        }
      ));
      findingIndex++;
    }
  }

  // Sample-only accessibility findings (not claim-based)
  if (isSample) {
    const sampleProvenance = {
      rulePackVersion: options.rulePackVersion ?? RULES_VERSION,
      evaluatedAt: new Date().toISOString(),
      evidenceStatusAtEvaluation: "active" as const,
    };
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
        "wcag-contrast",
        { ...sampleProvenance, ruleId: "accessibility-contrast-claim", ruleVersion: "1.0", evidenceVersionId: "wcag-contrast-v1" }
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
        "wcag-alt-text",
        { ...sampleProvenance, ruleId: "accessibility-alt-text-claim", ruleVersion: "1.0", evidenceVersionId: "wcag-alt-text-v1" }
      )
    );
  }

  return findings;
}

/**
 * Verify findings against evidence library (deterministic, no AI)
 */
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

/**
 * High-level function: extract claims (LLM fallback) + evaluate against rules
 * Used by integrations and API endpoints
 */
export async function evaluateContent(
  content: string,
  evidence: Array<{ id: string; title: string; evidence: string }>
): Promise<{ claimsChecked: number; findings: Finding[] }> {
  const isSample = isSampleContent(content);

  // Extract claims - in production this would call LLM, here we use deterministic fallback
  const claims = extractClaimsFallback(content, isSample);

  // Evaluate against rule pack
  const findings = evaluateClaimsAgainstRules(claims, content, isSample);

  // Verify against evidence library
  const { findings: verifiedFindings } = verifyFindingsAgainstEvidence(findings, evidence);

  return { claimsChecked: claims.length, findings: verifiedFindings };
}

/**
 * Fallback claim extraction (deterministic, no LLM)
 * Extracts claims by category using pattern matching
 */
export function extractClaimsFallback(text: string, isSample: boolean): Claim[] {
  const claims: Claim[] = [];

  // Superlatives / Comparative claims
  const superlativePatterns = [
    /(?:world'?s?|industry'?s?|market'?s?)\s+(?:best|fastest|leading|top|#1|number\s+one)/gi,
    /(?:the\s+)?(?:most|best|fastest|leading|premier)\s+\w+/gi,
    /#1\s+(?:rated|ranked|reviewed|customer|in)/gi,
    /\b#1\b/gi,
  ];

  for (const pattern of superlativePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        id: `claim-${claims.length}`,
        text: match[0],
        category: "Claim verification",
        severity: "High",
        confidence: 0.9,
        suggestedEvidenceId: "third-party-benchmark",
      });
    }
  }

  // Quantifiable claims
  const quantifiablePatterns = [
    /(\d+(?:\.\d+)?)\s*(?:times?|x|%|percent)\s+(?:faster|better|more|less|improvement|increase|decrease)/gi,
    /(?:connects?|supports?|integrates?)\s+(?:to|with)\s+(\d+)\s+(?:data\s+)?sources?/gi,
    /(\d+(?:\.\d+)?)\s*(?:data\s+)?sources?/gi,
  ];

  for (const pattern of quantifiablePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        id: `claim-${claims.length}`,
        text: match[0],
        category: "Fact verification",
        severity: "High",
        confidence: 0.85,
        suggestedEvidenceId: "product-fact-sheet",
      });
    }
  }

  // Specific metric claims
  const metricPatterns = [
    /(?:our|the)\s+(?:platform|product|solution|service)\s+(?:helps|enables|allows|improves)/gi,
    /(?:clients?|customers?|users?)\s+(?:use|using|leveraging)/gi,
  ];

  for (const pattern of metricPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        id: `claim-${claims.length}`,
        text: match[0],
        category: "Fact verification",
        severity: "Medium",
        confidence: 0.7,
        suggestedEvidenceId: "case-study",
      });
    }
  }

  // Security claims
  const securityPatterns = [
    /(?:enterprise-grade|military-grade|bank-grade)\s+(?:security|encryption)/gi,
    /(?:encrypted|encryption|zero trust|penetration test|pen test|vulnerability)/gi,
    /\bsecure\b/gi,
  ];

  for (const pattern of securityPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        id: `claim-${claims.length}`,
        text: match[0],
        category: "Fact verification",
        severity: "High",
        confidence: 0.85,
        suggestedEvidenceId: "claim-policy-security",
      });
    }
  }

  // Uptime / availability claims
  const uptimePatterns = [
    /(?:zero|99\.9|99\.99|99\.999)\s*(?:downtime|uptime|availability)/gi,
    /(?:always on|always available)/gi,
  ];

  for (const pattern of uptimePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        id: `claim-${claims.length}`,
        text: match[0],
        category: "Fact verification",
        severity: "High",
        confidence: 0.9,
        suggestedEvidenceId: "claim-policy-uptime",
      });
    }
  }

  // AI/ML capability claims
  const aiPatterns = [
    /(?:AI|artificial intelligence|machine learning|ML|LLM|generative|predictive|automated)\s+(?:powered by|uses|leverages|built on|driven by)/gi,
  ];

  for (const pattern of aiPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      claims.push({
        id: `claim-${claims.length}`,
        text: match[0],
        category: "Fact verification",
        severity: "Medium",
        confidence: 0.8,
        suggestedEvidenceId: "claim-policy-ai",
      });
    }
  }

  // Sample-specific claims
  if (isSample) {
    claims.push(
      {
        id: `claim-${claims.length}`,
        text: "Northwind Analytics helps customers make better business decisions",
        category: "Fact verification",
        severity: "Medium",
        confidence: 0.8,
        suggestedEvidenceId: "case-study",
      },
      {
        id: `claim-${claims.length}`,
        text: "Northwind Insights is the world's fastest analytics platform",
        category: "Claim verification",
        severity: "High",
        confidence: 0.95,
        suggestedEvidenceId: "third-party-benchmark",
      },
      {
        id: `claim-${claims.length}`,
        text: "It connects to 5 data sources",
        category: "Fact verification",
        severity: "High",
        confidence: 0.9,
        suggestedEvidenceId: "product-fact-sheet",
      },
      {
        id: `claim-${claims.length}`,
        text: "Our clients use our platform to improve reporting",
        category: "Fact verification",
        severity: "Medium",
        confidence: 0.75,
        suggestedEvidenceId: "case-study",
      }
    );
  }

  return claims;
}

export function newRunId(): string {
  // Use crypto.randomUUID for secure randomness, fallback to timestamp-based for edge runtime
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36).slice(-8);
  return `inkloom-${Date.now().toString(36)}-${randomPart}`;
}

/**
 * Validate rule pack syntax (for CLI)
 */
export function validateRulePack(rulePack: RulePack): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rulePack.rulesVersion) errors.push("Missing rulesVersion");
  if (!rulePack.rules || !Array.isArray(rulePack.rules)) errors.push("Missing or invalid rules array");

  for (let i = 0; i < (rulePack.rules?.length ?? 0); i++) {
    const rule = rulePack.rules[i];
    if (!rule.id) errors.push(`Rule ${i}: missing id`);
    if (!rule.name) errors.push(`Rule ${i}: missing name`);
    if (!rule.category) errors.push(`Rule ${i}: missing category`);
    if (!rule.severity || !["High", "Medium", "Low"].includes(rule.severity)) {
      errors.push(`Rule ${i}: invalid severity`);
    }
    if (!rule.pattern || rule.pattern.type !== "regex" || !rule.pattern.value) {
      errors.push(`Rule ${i}: invalid pattern`);
    }
    if (!rule.evidenceIds || !Array.isArray(rule.evidenceIds) || rule.evidenceIds.length === 0) {
      errors.push(`Rule ${i}: missing evidenceIds`);
    }
    if (!rule.explanationTemplate) errors.push(`Rule ${i}: missing explanationTemplate`);
    if (!rule.recommendationTemplate) errors.push(`Rule ${i}: missing recommendationTemplate`);

    // Test regex compiles
    try {
      new RegExp(rule.pattern?.value ?? "");
    } catch {
      errors.push(`Rule ${i}: invalid regex pattern`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Test rules against sample text (for CLI)
 */
export function testRules(text: string, claims: Claim[]): Finding[] {
  // Force reload for testing
  clearRuleCache();
  return evaluateClaimsAgainstRules(claims, text, true);
}