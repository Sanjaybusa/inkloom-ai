create extension if not exists vector;

create table if not exists public.governance_runs (
  id text primary key,
  content_id text not null,
  campaign_title text not null,
  campaign_text text not null,
  corrected_campaign_text text,
  version integer not null default 1,
  status text not null,
  analyzed_at timestamptz not null,
  updated_at timestamptz not null,
  rules_version text not null,
  evidence_version text not null,
  claims_checked integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  review jsonb not null default '{}'::jsonb,
  audit_events jsonb not null default '[]'::jsonb,
  ai_assistance boolean not null default false
);

alter table public.governance_runs
  add column if not exists corrected_campaign_text text;

create index if not exists governance_runs_content_id_idx
  on public.governance_runs (content_id, updated_at desc);

create table if not exists public.evidence_records (
  id text primary key,
  category text not null,
  source text not null,
  version text not null,
  passage text not null,
  approved boolean not null default true,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

insert into public.evidence_records (id, category, source, version, passage, approved)
values
  ('claim-policy-superlatives', 'Claim verification', 'Claim Policy 3.2', '1.0', 'Market-wide superlatives require dated third-party evidence before publication.', true),
  ('northwind-integrations', 'Fact verification', 'Northwind Product Fact Sheet', 'v3.2', 'Northwind Insights supports 12 data sources in the currently approved product fact sheet.', true),
  ('northwind-terminology', 'Brand consistency', 'Northwind Brand Guide', '7.1', 'Use customers rather than clients and use Northwind Insights as the approved product name.', true),
  ('wcag-contrast', 'Accessibility', 'WCAG 2.2', '1.4.3', 'Normal text must have a contrast ratio of at least 4.5:1.', true),
  ('wcag-alt-text', 'Accessibility', 'WCAG 2.2', '1.1.1', 'Meaningful images require concise and appropriate alternative text.', true)
on conflict (id) do update set
  category = excluded.category,
  source = excluded.source,
  version = excluded.version,
  passage = excluded.passage,
  approved = excluded.approved;

create or replace function public.match_evidence(
  query_embedding vector(1536),
  match_count integer default 5,
  match_category text default null
)
returns table (
  id text,
  category text,
  source text,
  version text,
  passage text,
  similarity float
)
language sql
stable
as $$
  select
    evidence_records.id,
    evidence_records.category,
    evidence_records.source,
    evidence_records.version,
    evidence_records.passage,
    1 - (evidence_records.embedding <=> query_embedding) as similarity
  from public.evidence_records
  where evidence_records.approved = true
    and evidence_records.embedding is not null
    and (match_category is null or evidence_records.category = match_category)
  order by evidence_records.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
