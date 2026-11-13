import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GovernanceRun, AuditEntry, Campaign, CampaignWithStats, CampaignStatus, ReviewDecision } from "./governance";
import type { Finding } from "./governance";

const runs = new Map<string, GovernanceRun>();
const campaigns = new Map<string, Campaign>();

// In-memory evidence store for demo mode (when Supabase not configured)
const evidenceStore = new Map<string, EvidenceRecord>();
const evidenceVersionsStore = new Map<string, EvidenceVersion[]>();

// In-memory evidence audit store for demo mode
const evidenceAuditStore = new Map<string, EvidenceAuditEntry[]>();

// Campaign audit store for demo mode
const campaignAuditStore = new Map<string, CampaignAuditEntry[]>();

// Evidence audit types
export type EvidenceAuditEventType =
  | "evidence_created"
  | "evidence_updated"
  | "evidence_deprecated";

export type EvidenceAuditEntry = {
  id: string;
  event: EvidenceAuditEventType;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
};

function getSupabase(): SupabaseClient | null {
  // Demo mode takes precedence when explicitly enabled
  if (process.env.DEMO_MODE === "true") {
    return null; // Use in-memory fallback
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If Supabase is configured, use it (production mode)
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false } });
  }

  // No Supabase configured and no demo mode - fail fast with clear message
  return null;
}

function assertSupabaseOrDemo(): { supabase: SupabaseClient | null; isDemo: boolean } {
  const supabase = getSupabase();
  return { supabase, isDemo: !supabase };
}

function assertSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

function isDemoMode(): boolean {
  const { isDemo } = assertSupabaseOrDemo();
  return isDemo;
}

function seedDemoEvidence() {
  if (evidenceStore.size > 0) return;
  const demoEvidence: EvidenceRecord[] = [
    { id: "claim-policy-superlatives", category: "Claim verification", source: "Claim Policy 3.2", version: "1.0", passage: "Market-wide superlatives require dated third-party evidence before publication.", approved: true, created_at: new Date().toISOString() },
    { id: "northwind-integrations", category: "Fact verification", source: "Northwind Product Fact Sheet", version: "v3.2", passage: "Northwind Insights supports 12 data sources in the currently approved product fact sheet.", approved: true, created_at: new Date().toISOString() },
    { id: "northwind-terminology", category: "Brand consistency", source: "Northwind Brand Guide", version: "7.1", passage: "Use customers rather than clients and use Northwind Insights as the approved product name.", approved: true, created_at: new Date().toISOString() },
    { id: "wcag-contrast", category: "Accessibility", source: "WCAG 2.2", version: "1.4.3", passage: "Normal text must have a contrast ratio of at least 4.5:1.", approved: true, created_at: new Date().toISOString() },
    { id: "wcag-alt-text", category: "Accessibility", source: "WCAG 2.2", version: "1.1.1", passage: "Meaningful images require concise and appropriate alternative text.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-metrics", category: "Claim verification", source: "Claim Policy 4.1", version: "1.0", passage: "Specific metric claims (percentages, dollar amounts, time savings) require approved supporting evidence with dated source.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-compliance", category: "Fact verification", source: "Claim Policy 5.3", version: "1.0", passage: "Compliance and certification claims require current audit reports or certificates from accredited bodies.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-testimonials", category: "Claim verification", source: "Claim Policy 6.2", version: "1.0", passage: "Customer testimonials and quotes require written release approval and dated evidence.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-forward-looking", category: "Claim verification", source: "Claim Policy 7.1", version: "1.0", passage: "Forward-looking statements require safe harbor language or reference to approved projection documents.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-comparisons", category: "Fact verification", source: "Claim Policy 8.4", version: "1.0", passage: "Competitor comparisons require dated third-party benchmark studies.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-security", category: "Fact verification", source: "Claim Policy 9.2", version: "1.0", passage: "Security claims require current penetration test reports, certifications, or audit attestations.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-ai", category: "Fact verification", source: "Claim Policy 10.1", version: "1.0", passage: "AI/ML capability claims require technical architecture documentation or third-party validation.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-pricing", category: "Fact verification", source: "Claim Policy 11.3", version: "1.0", passage: "Pricing and cost claims require reference to current approved price list or pricing page.", approved: true, created_at: new Date().toISOString() },
    { id: "claim-policy-uptime", category: "Fact verification", source: "Claim Policy 12.1", version: "1.0", passage: "Uptime and availability claims require SLA documentation or status page historical data.", approved: true, created_at: new Date().toISOString() },
  ];
  demoEvidence.forEach(e => {
    evidenceStore.set(e.id, e);
    evidenceVersionsStore.set(e.id, [{
      id: crypto.randomUUID?.() ?? `v1-${Date.now()}`,
      evidence_id: e.id,
      version: e.version,
      category: e.category,
      source: e.source,
      passage: e.passage,
      approved: e.approved,
      deprecated: false,
      created_by: "migration-backfill",
      created_at: e.created_at,
    }]);
  });
}

function getNextVersion(evidenceId: string): string {
  const versions = evidenceVersionsStore.get(evidenceId) ?? [];
  const maxVersion = Math.max(0, ...versions.map(v => parseInt(v.version) || 0));
  return String(maxVersion + 1);
}

function toDbAudit(audit: AuditEntry[]) {
  return audit.map((entry) => ({
    id: entry.id,
    event: entry.event,
    actor: entry.actor,
    timestamp: entry.timestamp,
    details: entry.details,
  }));
}

function fromDbAudit(data: Array<{ id: string; event: string; actor: string; timestamp: string; details: Record<string, unknown> }>): AuditEntry[] {
  return data.map((entry) => ({
    id: entry.id,
    event: entry.event as AuditEntry["event"],
    actor: entry.actor,
    timestamp: entry.timestamp,
    details: entry.details as AuditEntry["details"],
  }));
}

// --- Campaign Audit Events ---
type CampaignAuditEventType =
  | "campaign_created"
  | "campaign_updated"
  | "campaign_status_changed"
  | "campaign_analyzed"
  | "campaign_reviewed";

type CampaignAuditEntry = {
  id: string;
  event: CampaignAuditEventType;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
};

async function writeCampaignAudit(
  campaignId: string,
  event: CampaignAuditEventType,
  actor: string,
  details: Record<string, unknown>
): Promise<void> {
  const entry: CampaignAuditEntry = {
    id: crypto.randomUUID?.() ?? `audit-${Date.now()}`,
    event,
    actor,
    timestamp: new Date().toISOString(),
    details,
  };

  const supabase = getSupabase();
  if (!supabase) {
    const existing = campaignAuditStore.get(campaignId) ?? [];
    existing.unshift(entry);
    campaignAuditStore.set(campaignId, existing);
    return;
  }

  // Try to store in campaigns table as audit_events JSONB column
  // First, check if column exists by trying to read
  try {
    const { data: existing } = await supabase
      .from("campaigns")
      .select("audit_events")
      .eq("id", campaignId)
      .maybeSingle();

    const auditEvents = existing?.audit_events ?? [];
    const updated = [entry, ...auditEvents].slice(0, 100); // Keep last 100

    await supabase
      .from("campaigns")
      .update({ audit_events: updated, updated_at: new Date().toISOString() })
      .eq("id", campaignId);
  } catch {
    // Column might not exist yet - store in memory as fallback
    const existing = campaignAuditStore.get(campaignId) ?? [];
    existing.unshift(entry);
    campaignAuditStore.set(campaignId, existing);
  }
}

export async function getCampaignAudit(campaignId: string): Promise<CampaignAuditEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return campaignAuditStore.get(campaignId) ?? [];
  }

  try {
    const { data } = await supabase
      .from("campaigns")
      .select("audit_events")
      .eq("id", campaignId)
      .maybeSingle();

    return data?.audit_events ?? [];
  } catch {
    return campaignAuditStore.get(campaignId) ?? [];
  }
}

// --- Evidence Audit Events ---
async function writeEvidenceAudit(
  evidenceId: string,
  event: EvidenceAuditEventType,
  actor: string,
  details: Record<string, unknown>
): Promise<void> {
  const entry: EvidenceAuditEntry = {
    id: crypto.randomUUID?.() ?? `audit-${Date.now()}`,
    event,
    actor,
    timestamp: new Date().toISOString(),
    details,
  };

  const supabase = getSupabase();
  if (!supabase) {
    const existing = evidenceAuditStore.get(evidenceId) ?? [];
    existing.unshift(entry);
    evidenceAuditStore.set(evidenceId, existing);
    return;
  }

  // Try to store in evidence_records table as audit_events JSONB column
  try {
    const { data: existing } = await supabase
      .from("evidence_records")
      .select("audit_events")
      .eq("id", evidenceId)
      .maybeSingle();

    const auditEvents = existing?.audit_events ?? [];
    const updated = [entry, ...auditEvents].slice(0, 100); // Keep last 100

    await supabase
      .from("evidence_records")
      .update({ audit_events: updated, updated_at: new Date().toISOString() })
      .eq("id", evidenceId);
  } catch {
    // Column might not exist yet - store in memory as fallback
    const existing = evidenceAuditStore.get(evidenceId) ?? [];
    existing.unshift(entry);
    evidenceAuditStore.set(evidenceId, existing);
  }
}

export async function getEvidenceAudit(evidenceId: string): Promise<EvidenceAuditEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return evidenceAuditStore.get(evidenceId) ?? [];
  }

  try {
    const { data } = await supabase
      .from("evidence_records")
      .select("audit_events")
      .eq("id", evidenceId)
      .maybeSingle();

    return data?.audit_events ?? [];
  } catch {
    return evidenceAuditStore.get(evidenceId) ?? [];
  }
}

export async function saveRun(run: GovernanceRun, expectedVersion?: number): Promise<GovernanceRun> {
  const storedRun = runs.get(run.id);
  if (expectedVersion !== undefined && storedRun && storedRun.version !== expectedVersion) {
    throw new Error(`Version conflict: expected ${expectedVersion}, got ${storedRun.version}`);
  }
  // Increment version on successful save
  run.version = (storedRun?.version ?? 0) + 1;
  runs.set(run.id, run);
  const supabase = getSupabase();
  if (!supabase) return run;

  const { error } = await supabase.from("governance_runs").upsert({
    id: run.id,
    content_id: run.contentId,
    campaign_title: run.campaignTitle,
    campaign_text: run.campaignText,
    corrected_campaign_text: run.correctedCampaignText ?? null,
    version: run.version,
    status: run.status,
    analyzed_at: run.analyzedAt,
    updated_at: run.updatedAt,
    rules_version: run.rulesVersion,
    evidence_version: run.evidenceVersion,
    claims_checked: run.claimsChecked,
    findings: run.findings,
    review: run.review,
    audit_events: toDbAudit(run.audit),
    ai_assistance: run.aiAssistance,
  });
  if (error) throw new Error(`Supabase save failed: ${error.message}`);
  return run;
}

export async function getRun(id: string): Promise<GovernanceRun | null> {
  const cached = runs.get(id);
  if (cached) return cached;

  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("governance_runs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (!data) return null;

  const run: GovernanceRun = {
    id: data.id,
    contentId: data.content_id,
    campaignTitle: data.campaign_title,
    campaignText: data.campaign_text,
    correctedCampaignText: data.corrected_campaign_text ?? undefined,
    version: data.version,
    status: data.status,
    analyzedAt: data.analyzed_at,
    updatedAt: data.updated_at,
    rulesVersion: data.rules_version,
    evidenceVersion: data.evidence_version,
    claimsChecked: data.claims_checked,
    findings: data.findings ?? [],
    review: data.review ?? { decision: null, reviewer: null, reason: null, decidedAt: null },
    audit: fromDbAudit(data.audit_events ?? []),
    aiAssistance: data.ai_assistance ?? false,
  };
  runs.set(run.id, run);
  return run;
}

export async function getLatestRun(contentId: string): Promise<GovernanceRun | null> {
  const cached = [...runs.values()]
    .filter((run) => run.contentId === contentId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (cached) return cached;

  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("governance_runs")
    .select("*")
    .eq("content_id", contentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (!data) return null;
  return getRun(data.id);
}

export async function getApprovedEvidence(category?: string): Promise<Array<{
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
}>> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    const evidence = Array.from(evidenceStore.values())
      .filter(e => e.approved && !e.deprecated && (!category || e.category === category));
    return evidence.map(({ id, category, source, version, passage }) => ({ id, category, source, version, passage }));
  }
  let query = supabase
    .from("evidence_records")
    .select("id, category, source, version, passage")
    .eq("approved", true);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw new Error(`Supabase evidence read failed: ${error.message}`);
  return data ?? [];
}

export async function searchApprovedEvidence(
  query: string,
  category?: string,
  limit = 5,
): Promise<Array<{
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  similarity?: number;
}>> {
  // Deterministic category-based search - no embeddings
  return getApprovedEvidence(category).then((evidence) => evidence.slice(0, limit));
}

// --- Evidence CRUD with Versioning ---

export type EvidenceRecord = {
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  approved: boolean;
  deprecated?: boolean;
  deprecated_at?: string;
  deprecated_reason?: string;
  org_id?: string;
  created_at: string;
  versions?: EvidenceVersion[];
};

export type EvidenceVersion = {
  id: string;
  evidence_id: string;
  version: string;
  category: string;
  source: string;
  passage: string;
  approved: boolean;
  deprecated: boolean;
  deprecated_at?: string;
  deprecated_reason?: string;
  created_by: string;
  created_at: string;
};

export async function getEvidenceRecord(id: string): Promise<EvidenceRecord | null> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    const record = evidenceStore.get(id);
    if (!record) return null;
    return {
      ...record,
      versions: evidenceVersionsStore.get(id) ?? [],
    };
  }

  const { data: record, error } = await supabase
    .from("evidence_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (!record) return null;

  const { data: versions } = await supabase
    .from("evidence_versions")
    .select("*")
    .eq("evidence_id", id)
    .order("created_at", { ascending: false });

  return {
    ...record,
    versions: versions ?? [],
  };
}

export async function createEvidenceRecord(input: {
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  approved?: boolean;
}): Promise<EvidenceRecord> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    if (evidenceStore.has(input.id)) {
      throw new Error(`Evidence record with id "${input.id}" already exists.`);
    }
    const now = new Date().toISOString();
    const record: EvidenceRecord = {
      id: input.id,
      category: input.category,
      source: input.source,
      version: input.version,
      passage: input.passage,
      approved: input.approved ?? true,
      deprecated: false,
      org_id: "northwind-demo",
      created_at: now,
    };
    evidenceStore.set(input.id, record);
    evidenceVersionsStore.set(input.id, [{
      id: crypto.randomUUID?.() ?? `v1-${Date.now()}`,
      evidence_id: input.id,
      version: "1",
      category: input.category,
      source: input.source,
      passage: input.passage,
      approved: input.approved ?? true,
      deprecated: false,
      created_by: "api-create",
      created_at: now,
    }]);
    return getEvidenceRecord(input.id) as Promise<EvidenceRecord>;
  }

  const orgId = process.env.DEMO_ORG_ID ?? "northwind-demo";

  const { data: created, error } = await supabase
    .from("evidence_records")
    .insert({
      id: input.id,
      category: input.category,
      source: input.source,
      version: input.version,
      passage: input.passage,
      approved: input.approved ?? true,
      org_id: orgId,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  if (!created) throw new Error("Failed to create evidence record");

  // Create initial version
  await supabase.from("evidence_versions").insert({
    evidence_id: input.id,
    version: "1",
    category: input.category,
    source: input.source,
    passage: input.passage,
    approved: input.approved ?? true,
    created_by: "api-create",
  });

  return getEvidenceRecord(input.id) as Promise<EvidenceRecord>;
}

export async function updateEvidenceRecord(id: string, updates: {
  category?: string;
  source?: string;
  passage?: string;
}): Promise<EvidenceRecord | null> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    const record = evidenceStore.get(id);
    if (!record) return null;

    const updated = { ...record, ...updates, version: getNextVersion(id) };
    evidenceStore.set(id, updated);

    // Create new version
    const versions = evidenceVersionsStore.get(id) ?? [];
    const newVersion: EvidenceVersion = {
      id: crypto.randomUUID?.() ?? `v${Date.now()}`,
      evidence_id: id,
      version: updated.version,
      category: updated.category,
      source: updated.source,
      passage: updated.passage,
      approved: updated.approved,
      deprecated: false,
      created_by: "api-update",
      created_at: new Date().toISOString(),
    };
    evidenceVersionsStore.set(id, [newVersion, ...versions]);

    return getEvidenceRecord(id);
  }

  const { data: updated, error } = await supabase
    .from("evidence_records")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  if (!updated) return null;

  return getEvidenceRecord(id);
}

export async function deprecateEvidenceRecord(id: string, reason?: string): Promise<EvidenceRecord | null> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    const record = evidenceStore.get(id);
    if (!record) return null;

    const deprecated = { ...record, deprecated: true, deprecated_at: new Date().toISOString(), deprecated_reason: reason ?? "Deprecated via API", approved: false };
    evidenceStore.set(id, deprecated);

    // Mark latest version as deprecated
    const versions = evidenceVersionsStore.get(id) ?? [];
    const updatedVersions = versions.map(v => v.deprecated ? v : { ...v, deprecated: true, deprecated_at: new Date().toISOString(), deprecated_reason: reason ?? "Deprecated via API" });
    evidenceVersionsStore.set(id, updatedVersions);

    return getEvidenceRecord(id);
  }

  const { data: deprecated, error } = await supabase
    .from("evidence_records")
    .update({
      deprecated: true,
      deprecated_at: new Date().toISOString(),
      deprecated_reason: reason ?? "Deprecated via API",
      approved: false,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  if (!deprecated) return null;

  // Also mark latest version as deprecated
  await supabase
    .from("evidence_versions")
    .update({ deprecated: true, deprecated_at: new Date().toISOString(), deprecated_reason: reason ?? "Deprecated via API" })
    .eq("evidence_id", id)
    .eq("deprecated", false)
    .order("created_at", { ascending: false })
    .limit(1);

  return getEvidenceRecord(id);
}

export async function getEvidenceVersions(evidenceId: string): Promise<EvidenceVersion[]> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    return evidenceVersionsStore.get(evidenceId) ?? [];
  }

  const { data, error } = await supabase
    .from("evidence_versions")
    .select("*")
    .eq("evidence_id", evidenceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data ?? [];
}

export async function getEvidenceVersion(evidenceId: string, versionId: string): Promise<EvidenceVersion | null> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    const versions = evidenceVersionsStore.get(evidenceId) ?? [];
    return versions.find(v => v.id === versionId) ?? null;
  }

  const { data, error } = await supabase
    .from("evidence_versions")
    .select("*")
    .eq("evidence_id", evidenceId)
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data;
}

export async function getEvidenceStore(): Promise<Map<string, EvidenceRecord> | null> {
  const supabase = getSupabase();
  if (!supabase) {
    seedDemoEvidence();
    // Return a new Map with versions populated from evidenceVersionsStore
    const storeWithVersions = new Map<string, EvidenceRecord>();
    for (const [id, record] of evidenceStore) {
      storeWithVersions.set(id, {
        ...record,
        versions: evidenceVersionsStore.get(id) ?? [],
      });
    }
    return storeWithVersions;
  }
  return null; // Supabase mode - store not available
}

export async function getEvidenceUsage(evidenceId: string, options?: {
  versionId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  findings: Array<{
    runId: string;
    campaignId?: string;
    findingId: string;
    claim: string;
    ruleId: string;
    ruleVersion: string;
    evaluatedAt: string;
    status: string;
    evidenceVersionId?: string;
  }>;
  total: number;
}> {
  const supabase = getSupabase();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const versionId = options?.versionId;

  if (!supabase) {
    // Demo mode: search in-memory runs
    const allRuns = Array.from(runs.values());
    const matchedFindings: Array<{
      runId: string;
      campaignId?: string;
      findingId: string;
      claim: string;
      ruleId: string;
      ruleVersion: string;
      evaluatedAt: string;
      status: string;
      evidenceVersionId?: string;
    }> = [];

    for (const run of allRuns) {
      for (const finding of run.findings) {
        if (finding.evidenceId === evidenceId) {
          if (!versionId || finding.evidenceVersionId === versionId) {
            matchedFindings.push({
              runId: run.id,
              campaignId: run.contentId,
              findingId: finding.id,
              claim: finding.claim,
              ruleId: finding.ruleId ?? "unknown",
              ruleVersion: finding.ruleVersion ?? "unknown",
              evaluatedAt: finding.evaluatedAt ?? run.analyzedAt,
              status: finding.status,
              evidenceVersionId: finding.evidenceVersionId,
            });
          }
        }
      }
    }

    // Sort by evaluatedAt descending
    matchedFindings.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));

    const paginated = matchedFindings.slice(offset, offset + limit);

    return {
      findings: paginated,
      total: matchedFindings.length,
    };
  }

  // Supabase mode: query governance_runs with JSONB search
  const { data, error } = await supabase
    .from("governance_runs")
    .select("id, content_id, findings, analyzed_at")
    .contains("findings", [{ evidenceId }]);

  if (error) throw new Error(`Supabase usage query failed: ${error.message}`);

  const matchedFindings: Array<{
    runId: string;
    campaignId?: string;
    findingId: string;
    claim: string;
    ruleId: string;
    ruleVersion: string;
    evaluatedAt: string;
    status: string;
    evidenceVersionId?: string;
  }> = [];

  for (const run of data ?? []) {
    for (const finding of run.findings ?? []) {
      if (finding.evidenceId === evidenceId) {
        if (!versionId || finding.evidenceVersionId === versionId) {
          matchedFindings.push({
            runId: run.id,
            campaignId: run.content_id,
            findingId: finding.id,
            claim: finding.claim,
            ruleId: finding.ruleId ?? "unknown",
            ruleVersion: finding.ruleVersion ?? "unknown",
            evaluatedAt: finding.evaluatedAt ?? run.analyzed_at,
            status: finding.status,
            evidenceVersionId: finding.evidenceVersionId,
          });
        }
      }
    }
  }

  matchedFindings.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));
  const paginated = matchedFindings.slice(offset, offset + limit);

  return {
    findings: paginated,
    total: matchedFindings.length,
  };
}

// --- Campaign CRUD ---

export async function createCampaign(input: {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  brandId?: string;
  channel?: string;
  market?: string;
  status?: CampaignStatus;
  createdBy: string;
}): Promise<Campaign> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: input.id,
    organizationId: input.organizationId,
    title: input.title,
    description: input.description,
    brandId: input.brandId,
    channel: input.channel,
    market: input.market,
    status: input.status ?? "draft",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  if (!supabase) {
    campaigns.set(input.id, campaign);
    await writeCampaignAudit(input.id, "campaign_created", input.createdBy, {
      title: input.title,
      status: input.status ?? "draft",
    });
    return campaign;
  }

  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({
      id: input.id,
      organization_id: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      brand_id: input.brandId ?? null,
      channel: input.channel ?? null,
      market: input.market ?? null,
      status: input.status ?? "draft",
      created_by: input.createdBy,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  if (!created) throw new Error("Failed to create campaign");

  await writeCampaignAudit(input.id, "campaign_created", input.createdBy, {
    title: input.title,
    status: input.status ?? "draft",
  });

  return getCampaign(input.id) as Promise<Campaign>;
}

export async function getCampaigns(organizationId: string): Promise<Campaign[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return Array.from(campaigns.values())
      .filter(c => c.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data ?? []).map(mapCampaignFromDb);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return campaigns.get(id) ?? null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (!data) return null;
  return mapCampaignFromDb(data);
}

export async function updateCampaign(id: string, updates: {
  title?: string;
  description?: string;
  brandId?: string;
  channel?: string;
  market?: string;
  status?: CampaignStatus;
  currentRunId?: string;
}, actor?: string): Promise<Campaign | null> {
  const supabase = getSupabase();
  const effectiveActor = actor ?? "system";

  if (!supabase) {
    const campaign = campaigns.get(id);
    if (!campaign) return null;
    const previousStatus = campaign.status;
    const updated = { ...campaign, ...updates, updatedAt: new Date().toISOString() };
    campaigns.set(id, updated);

    // Write audit event for status change
    if (updates.status !== undefined && updates.status !== previousStatus) {
      await writeCampaignAudit(id, "campaign_status_changed", effectiveActor, {
        previousStatus,
        newStatus: updates.status,
      });
    }
    // Write general update audit
    await writeCampaignAudit(id, "campaign_updated", effectiveActor, {
      fields: Object.keys(updates),
    });

    return updated;
  }

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId;
  if (updates.channel !== undefined) dbUpdates.channel = updates.channel;
  if (updates.market !== undefined) dbUpdates.market = updates.market;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.currentRunId !== undefined) dbUpdates.current_run_id = updates.currentRunId;

  // Get current campaign for status change detection
  const currentCampaign = await getCampaign(id);
  const previousStatus = currentCampaign?.status;

  const { data, error } = await supabase
    .from("campaigns")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  if (!data) return null;

  // Write audit events
  if (updates.status !== undefined && updates.status !== previousStatus) {
    await writeCampaignAudit(id, "campaign_status_changed", effectiveActor, {
      previousStatus,
      newStatus: updates.status,
    });
  }
  await writeCampaignAudit(id, "campaign_updated", effectiveActor, {
    fields: Object.keys(updates),
  });

  return mapCampaignFromDb(data);
}

export async function getCampaignsWithStats(organizationId: string): Promise<CampaignWithStats[]> {
  const supabase = getSupabase();
  const campaignList = await getCampaigns(organizationId);

  const runsList = supabase
    ? await getRunsForOrganization(organizationId)
    : Array.from(runs.values()).filter(r => {
        const c = campaigns.get(r.contentId);
        return c?.organizationId === organizationId;
      });

  return campaignList.map(campaign => {
    const campaignRuns = runsList.filter(r => r.contentId === campaign.id || r.campaignId === campaign.id);
    const latestRun = campaignRuns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    let findingsCount = 0;
    let highFindings = 0;
    let lastAnalyzedAt: string | undefined;
    let reviewer: string | null = null;
    let decision: ReviewDecision | null = null;
    let runId: string | undefined;
    let version: number | undefined;

    if (latestRun) {
      findingsCount = latestRun.findings.length;
      highFindings = latestRun.findings.filter(f => f.severity === "High").length;
      lastAnalyzedAt = latestRun.analyzedAt;
      reviewer = latestRun.review.reviewer;
      decision = latestRun.review.decision;
      runId = latestRun.id;
      version = latestRun.version;
    }

    return {
      ...campaign,
      findingsCount,
      highFindings,
      lastAnalyzedAt,
      reviewer,
      decision,
      runId,
      version,
    };
  });
}

async function getRunsForOrganization(organizationId: string): Promise<GovernanceRun[]> {
  const { supabase } = assertSupabaseOrDemo();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("governance_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data ?? []).map(mapRunFromDb);
}

function mapCampaignFromDb(data: Record<string, unknown>): Campaign {
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    title: data.title as string,
    description: data.description as string | undefined,
    brandId: data.brand_id as string | undefined,
    channel: data.channel as string | undefined,
    market: data.market as string | undefined,
    status: data.status as CampaignStatus,
    currentRunId: data.current_run_id as string | undefined,
    createdBy: data.created_by as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapRunFromDb(data: Record<string, unknown>): GovernanceRun {
  const auditEvents = (data.audit_events as Array<Record<string, unknown>>) ?? [];
  return {
    id: data.id as string,
    contentId: data.content_id as string,
    campaignTitle: data.campaign_title as string,
    campaignText: data.campaign_text as string,
    correctedCampaignText: data.corrected_campaign_text as string | undefined,
    version: data.version as number,
    status: data.status as GovernanceRun["status"],
    analyzedAt: data.analyzed_at as string,
    updatedAt: data.updated_at as string,
    rulesVersion: data.rules_version as string,
    evidenceVersion: data.evidence_version as string,
    claimsChecked: data.claims_checked as number,
    findings: (data.findings ?? []) as GovernanceRun["findings"],
    review: data.review as GovernanceRun["review"],
    audit: auditEvents.map((entry: Record<string, unknown>) => ({
      id: entry.id as string,
      event: entry.event as AuditEntry["event"],
      actor: entry.actor as string,
      timestamp: entry.timestamp as string,
      details: entry.details as AuditEntry["details"],
    })),
    aiAssistance: data.ai_assistance as boolean,
    campaignId: data.campaign_id as string | undefined,
  };
}

// Seed demo campaign for northwind-q4
function seedDemoCampaign() {
  if (campaigns.size > 0) return;
  const demoCampaign: Campaign = {
    id: "northwind-q4",
    organizationId: "northwind-demo",
    title: "Northwind Q4 Campaign",
    description: "Q4 2024 product launch campaign for Northwind Insights",
    brandId: "northwind-insights",
    channel: "web",
    market: "global",
    status: "active",
    createdBy: "demo-user",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  campaigns.set(demoCampaign.id, demoCampaign);
}

// Ensure demo campaign exists
seedDemoCampaign();

export async function getRunsForCampaign(campaignId: string): Promise<GovernanceRun[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return Array.from(runs.values())
      .filter(r => r.contentId === campaignId || r.campaignId === campaignId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const { data, error } = await supabase
    .from("governance_runs")
    .select("*")
    .or(`content_id.eq.${campaignId},campaign_id.eq.${campaignId}`)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data ?? []).map(mapRunFromDb);
}

// Export campaign audit functions
export { writeCampaignAudit, writeEvidenceAudit, type CampaignAuditEntry, type CampaignAuditEventType };

