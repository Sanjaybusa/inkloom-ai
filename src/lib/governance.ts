export type FindingAction = "accept" | "edit" | "dispute";
export type ReviewDecision = "approved" | "rejected" | "changes_requested";

export type FindingStatus =
  | "Unverified"
  | "Outdated"
  | "Brand violation"
  | "Needs correction"
  | "Supported"
  | "Disputed";

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
};

export type AuditEvent =
  | { type: "analysis_completed"; details: { findings: number; claimsExtracted: number; aiAssistance: boolean; rulesVersion: string; evidenceVersion: string } }
  | { type: "finding_accept"; details: { findingId: string; version: number } }
  | { type: "finding_edit"; details: { findingId: string; editedFix: string; version: number } }
  | { type: "finding_dispute"; details: { findingId: string; reason: string | null; version: number } }
  | { type: "review_approved"; details: { reason: string | null; version: number } }
  | { type: "review_rejected"; details: { reason: string; version: number } }
  | { type: "review_changes_requested"; details: { reason: string; version: number } };

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
  aiAssistance: boolean;
};
