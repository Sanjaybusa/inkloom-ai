import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GovernanceRun, AuditEntry } from "./governance";

const runs = new Map<string, GovernanceRun>();

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function assertSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
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
  if (!supabase) return [];
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

