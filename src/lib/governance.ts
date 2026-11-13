export type FindingAction = "accept" | "edit" | "dispute";
export type ReviewDecision = "approved" | "rejected" | "changes_requested";

export type FindingStatus =
  | "Unverified"
  | "Outdated"
  | "Brand violation"
  | "Needs correction"
  | "Supported"
  | "Disputed"
  | "Needs Human Review";

export type Finding = {
  id: string;
  title: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  status: FindingStatus;
  claim: string;
  explanation: string;
  evidence: string;
  evidenceId?: string;
  aiConfidence?: number;
  recommendation: string;
  action?: FindingAction;
  editedFix?: string;
  actionReason?: string;

  // Provenance fields (optional for backward compatibility)
  ruleId?: string;                    // Rule that triggered (e.g., "superlative-claim")
  ruleVersion?: string;               // Rule version within pack (e.g., "1.0")
  rulePackVersion?: string;           // Policy pack version at evaluation (RULES_VERSION)
  evidenceVersionId?: string;         // Exact evidence version UUID used
  matchedText?: string;               // Text that matched the rule pattern
  evaluatedAt?: string;               // ISO timestamp when finding was created
  evidenceStatusAtEvaluation?: "active" | "deprecated" | "expired" | "draft" | "unknown";
  evidenceEffectiveAt?: string;       // Evidence effective_from at evaluation time
  evidenceExpiresAt?: string;         // Evidence effective_until at evaluation time
};

export type AuditEvent =
  | { type: "analysis_completed"; details: { findings: number; claimsExtracted: number; aiAssistance: boolean; rulesVersion: string; evidenceVersion: string; aiUnavailable?: boolean; aiError?: string } }
  | { type: "finding_accept"; details: { findingId: string; version: number } }
  | { type: "finding_edit"; details: { findingId: string; editedFix: string; version: number } }
  | { type: "finding_dispute"; details: { findingId: string; reason: string | null; version: number } }
  | { type: "review_approved"; details: { reason: string | null; version: number } }
  | { type: "review_rejected"; details: { reason: string; version: number } }
  | { type: "review_changes_requested"; details: { reason: string; version: number } }
  | { type: "integration_analyzed"; details: { integration: string; external_id: string; action: string } };

export type AuditEntry = {
  id: string;
  event: AuditEvent["type"];
  actor: string;
  timestamp: string;
  details: AuditEvent["details"];
};

export type GovernanceRun = {
  id: string;
  contentId: string;
  campaignTitle: string;
  campaignText: string;
  correctedCampaignText?: string;
  version: number;
  status: "analyzed" | "approved" | "rejected" | "changes_requested";
  analyzedAt: string;
  updatedAt: string;
  rulesVersion: string;
  evidenceVersion: string;
  claimsChecked: number;
  findings: Finding[];
  review: {
    decision: ReviewDecision | null;
    reviewer: string | null;
    reason: string | null;
    decidedAt: string | null;
  };
  audit: AuditEntry[];
  aiAssistance: boolean | string; // string when AI unavailable with error message
  campaignId?: string; // Link to campaign
};

export type CampaignStatus = "draft" | "active" | "archived";

export type Campaign = {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  brandId?: string;
  channel?: string;
  market?: string;
  status: CampaignStatus;
  currentRunId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignWithStats = Campaign & {
  findingsCount: number;
  highFindings: number;
  lastAnalyzedAt?: string;
  reviewer?: string | null;
  decision?: ReviewDecision | null;
  runId?: string;
  version?: number;
};
