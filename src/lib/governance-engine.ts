/**
 * Governance Engine - Thin wrapper delegating to Policy-as-Code Rules Engine
 * Maintains backward compatibility for existing imports
 */

export {
  RULES_VERSION,
  EVIDENCE_VERSION,
  evaluateClaimsAgainstRules,
  verifyFindingsAgainstEvidence,
  newRunId,
  isSampleContent,
  evaluateContent,
  extractClaimsFallback,
} from "./rules-engine";

import type { Finding, FindingStatus, AuditEntry } from "./governance";
import type { Claim } from "@/lib/schemas";
import type { GovernanceRun } from "./governance";
import { saveRun, getLatestRun } from "./governance-store";
import { RULES_VERSION, EVIDENCE_VERSION, isSampleContent } from "./rules-engine";

// Re-export makeFinding for any internal use
export function makeFinding(
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

// Re-export applyDeterministicRules for any tests (delegates to rules engine)
// This is kept for backward compatibility
export function applyDeterministicRules(
  _claim: Claim,
  _fullText: string,
  _isSample: boolean,
  _index: number
): Finding | null {
  // Now handled by rules engine - returns null to let generic handler take over
  return null;
}

// Analyze content and save as governance run
export async function analyzeContent(
  text: string,
  contentId: string,
  options: {
    campaignTitle?: string;
    campaignId?: string;
  } = {}
): Promise<GovernanceRun> {
  const { evaluateClaimsAgainstRules, newRunId: newId, verifyFindingsAgainstEvidence, extractClaimsFallback } = await import("./rules-engine");
  const { getEvidenceStore, getApprovedEvidence } = await import("./governance-store");
  const { saveRun: saveRunFn, getLatestRun: getLatestRunFn } = await import("./governance-store");

  const sample = isSampleContent(text);

  // Extract claims using deterministic fallback (no LLM required)
  const extractedClaims = extractClaimsFallback(text, sample);

  // Evaluate with rules engine
  const evidenceStore = await getEvidenceStore();
  const deterministic = evaluateClaimsAgainstRules(extractedClaims, text, sample, {
    rulePackVersion: RULES_VERSION,
    evidenceVersion: EVIDENCE_VERSION,
    evidenceStore: evidenceStore ?? undefined,
  });

  // Verify against evidence library
  const evidenceLibrary = await getApprovedEvidence();
  const evidenceForVerification = evidenceLibrary.map((e) => ({ id: e.id, title: e.source, evidence: e.passage }));
  const verified = verifyFindingsAgainstEvidence(deterministic, evidenceForVerification);

  const now = new Date().toISOString();
  const previous = await getLatestRunFn(contentId);
  const run: GovernanceRun = {
    id: newId(),
    contentId,
    campaignTitle: options.campaignTitle ?? (sample ? "Northwind Q4 Campaign" : "Custom Campaign"),
    campaignText: text,
    version: (previous?.version ?? 0) + 1,
    status: "analyzed",
    analyzedAt: now,
    updatedAt: now,
    rulesVersion: RULES_VERSION,
    evidenceVersion: EVIDENCE_VERSION,
    claimsChecked: extractedClaims.length,
    findings: verified.findings,
    review: { decision: null, reviewer: null, reason: null, decidedAt: null },
    audit: [buildAnalysisAuditEntry(verified.findings.length, extractedClaims.length, extractedClaims.length > 0)],
    aiAssistance: extractedClaims.length > 0,
    campaignId: options.campaignId,
  };

  await saveRunFn(run);
  return run;
}

// Helper to build audit entry
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