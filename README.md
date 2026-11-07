# Inkloom AI

<div align="center">

**Evidence-backed content governance with cryptographic proof.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-inkloom--ai--three.vercel.app-0070f3?style=for-the-badge&logo=vercel)](https://inkloom-ai-three.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Ed25519](https://img.shields.io/badge/Ed25519-Signed-green?style=for-the-badge&logo=gnupg)](https://ed25519.cr.yp.to/)

**👉 [Try it now — 2 minute demo](https://inkloom-ai-three.vercel.app)**

</div>

---

## The Problem

Marketing teams ship claims daily: *"40% faster,"* *"#1 platform,"* *"zero downtime."*  
Legal/Compliance reviews are manual, slow, and leave no auditable trail.  
**No one can prove what was reviewed, by whom, or whether it changed after approval.**

---

## The Solution: Inkloom

Inkloom turns **content governance into a verifiable, cryptographically signed process**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INKLOOM GOVERNANCE PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐  │
│   │  CAMPAIGN   │───▶│  HYBRID ANALYSIS │───▶│  FINDINGS & EVIDENCE    │  │
│   │   TEXT      │    │                  │    │                         │  │
│   └─────────────┘    │  ▸ LLM extracts  │    │  ▸ 6 categories        │  │
│                      │    claims only   │    │    (metrics, specs,     │  │
│                      │  ▸ Deterministic │    │     terminology, a11y,  │  │
│                      │    rules evaluate│    │     brand, compliance)  │  │
│                      │  ▸ Evidence lib  │    │  ▸ Each finding linked  │  │
│                      │    verification  │    │    to approved source   │  │
│                      └──────────────────┘    └───────────┬─────────────┘  │
│                                                           │               │
│                      ┌──────────────────┐                 │               │
│                      │   HUMAN REVIEW   │◀────────────────┘               │
│                      │                  │                                 │
│                      │  ▸ Accept/Edit/  │                                 │
│                      │    Dispute       │                                 │
│                      │  ▸ Optimistic    │                                 │
│                      │    locking       │                                 │
│                      └────────┬─────────┘                                 │
│                               │                                           │
│                      ┌────────▼─────────┐                                 │
│                      │  TRUST PASSPORT  │                                 │
│                      │                  │                                 │
│                      │  ▸ Ed25519 sig   │                                 │
│                      │  ▸ Canonical JSON│                                 │
│                      │  ▸ Immutable     │                                 │
│                      │    audit trail   │                                 │
│                      └────────┬─────────┘                                 │
│                               │                                           │
│                      ┌────────▼─────────┐                                 │
│                      │ PUBLIC VERIFY    │                                 │
│                      │                  │                                 │
│                      │  ▸ Client-side   │                                 │
│                      │    Ed25519 check │                                 │
│                      │  ▸ Embedded pub  │                                 │
│                      │    key           │                                 │
│                      │  ▸ Zero trust    │                                 │
│                      └──────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Judge in 2 Minutes

| Step | Action | What You'll See |
|------|--------|-----------------|
| 1 | [Open Demo](https://inkloom-ai-three.vercel.app) | Campaign workspace with Northwind Q4 sample |
| 2 | Click **"Run Governance Check"** | 7 findings appear instantly (superlatives, outdated specs, brand violations, a11y issues) |
| 3 | Click **"Accept"** on each finding | Cards flip to green, corrected text builds in background |
| 4 | Click **"Approve"** → enter name/reason | **Signed Trust Passport** appears with Ed25519 signature |
| 5 | Click **"Verify"** → **"Verify Signature"** | **Cryptographic proof** — passport untampered, verified in browser |

### Demo Modes (add to URL)

| Mode | URL | Use Case |
|------|-----|----------|
| **Perfect** | `?demo=perfect` | Pre-approved, ready to verify |
| **Rejected** | `?demo=rejected` | Shows rejection flow with violations |
| **Pending** | `?demo=pending` | Awaiting review |
| **Empty** | `?demo=empty` | Clean slate for custom input |

---

## 🏆 Why This Is Different

| Traditional Governance | Inkloom |
|------------------------|---------|
| Manual checklist in Google Docs | **Automated pipeline with evidence links** |
| "Trust me, I reviewed it" | **Cryptographic proof anyone can verify** |
| No audit trail | **Immutable audit trail (analysis → findings → review)** |
| Hallucination risk with AI | **Hybrid: LLM extracts, code evaluates** |
| Single reviewer, no concurrency | **Optimistic locking for team reviews** |
| Approved copy drifts | **Auto-generated corrected text from findings** |

### Core Differentiators

| Feature | Technical Implementation | Why It Matters |
|---------|--------------------------|----------------|
| **Hybrid AI + Deterministic Rules** | Claude extracts claims via tool use → TypeScript engine evaluates 6 categories | Zero hallucination; rules are auditable code |
| **Evidence-Backed Verification** | 5 pre-seeded approved records (policies, fact sheets, brand guides, WCAG) | Every finding traces to a citable source |
| **Ed25519 Signed Trust Passports** | Canonical JSON (sorted keys) → `@noble/ed25519` signature | Tamper-evident; verifiable without server |
| **Public Verification Page** | Client-side crypto, embedded public key, zero server trust | QR-free, stateless, works offline |
| **Optimistic Locking** | Version field + auto-retry on 409 (re-read → re-apply → save) | Safe concurrent reviews, no lost updates |
| **Corrected Campaign Text** | Reconstructs compliant copy from accepted/edited findings | Ready-to-publish output from governance process |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                          │
├──────────────────────┬───────────────────────────────────────────┤
│ Framework            │ Next.js 16 (App Router, Turbopack)        │
│ Language             │ TypeScript (strict mode)                   │
│ Styling              │ Tailwind CSS + Framer Motion               │
│ Database             │ Supabase PostgreSQL + pgvector             │
│ AI                   │ Anthropic Claude Sonnet 4.5                │
│ Cryptography         │ @noble/ed25519 + @noble/hashes/sha512      │
│ Validation           │ Zod (runtime + compile-time)               │
│ Deployment           │ Vercel (edge-ready)                        │
└──────────────────────┴───────────────────────────────────────────┘
```

### API Surface

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/analyze` | Full pipeline: extract → evaluate → verify → persist |
| `POST` | `/api/extract-claims` | Standalone LLM claim extraction (any text) |
| `POST` | `/api/findings/[id]/action` | Accept/Edit/Dispute with optimistic locking |
| `POST` | `/api/review` | Approve/Reject/Changes → returns **signed passport** |
| `GET` | `/api/passport/[contentId]` | Unsigned passport; `?signed=true` for signed |
| `GET` | `/api/audit/[contentId]` | Full audit trail |
| `GET` | `/verify/[runId]` | **Public verification page (client-side Ed25519)** |

### Pipeline Flow

```
POST /api/analyze
  ├─ 1. LLM extracts verifiable claims (metrics, superlatives, specs, terminology, a11y, compliance)
  ├─ 2. Deterministic rule engine evaluates 6 categories (zero hallucination)
  ├─ 3. Findings verified against approved evidence library (5 records)
  └─ 4. Run persisted with audit trail → returns runId

POST /api/findings/[id]/action  → accept/edit/dispute (optimistic locking)
POST /api/review                → approve/reject/changes_requested → returns signed passport
GET /verify/[runId]             → client-side Ed25519 verification (no server trust)
```

---

## 🚀 Quick Start

```bash
# Clone & install
git clone https://github.com/Sanjaybusa/inkloom-ai.git
cd inkloom-ai
npm install

# Run locally (works without any credentials — in-memory fallback)
npm run dev
# → http://localhost:3000
```

### Environment Variables (for production features)

```bash
cp .env.example .env.local
```

| Variable | Required For | Description |
|----------|--------------|-------------|
| `ANTHROPIC_API_KEY` | AI claim extraction | Get at [console.anthropic.com](https://console.anthropic.com) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Durable persistence | Supabase project URL + service role key |
| `PASSPORT_SIGNING_KEY` | Signed passports | 64-char hex Ed25519 private key (see below) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client Supabase | Same as `SUPABASE_URL` |

> ⚠️ **Never** prefix secrets with `NEXT_PUBLIC_`. The app works fully in demo mode without any credentials.

### Generate Signing Key (for production)

```bash
node --experimental-vm-modules -e "
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
ed25519.hashes.sha512 = sha512;
const pk = ed25519.utils.randomSecretKey();
const pub = ed25519.getPublicKey(pk);
console.log('PASSPORT_SIGNING_KEY:', Buffer.from(pk).toString('hex'));
console.log('PUBLIC_KEY (embed in verify page):', Buffer.from(pub).toString('hex'));
"
```

---

## 📊 Supabase Schema

Run `supabase/migrations/20261105_governance_runs.sql`:

```sql
-- Governance runs with JSONB findings, audit trail, review decisions
CREATE TABLE governance_runs (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  campaign_title TEXT,
  campaign_text TEXT,
  version INT DEFAULT 1,
  status TEXT CHECK (status IN ('analyzed','approved','rejected','changes_requested')),
  findings JSONB NOT NULL DEFAULT '[]',
  review JSONB,
  audit JSONB NOT NULL DEFAULT '[]',
  rules_version TEXT,
  evidence_version TEXT,
  claims_checked INT,
  ai_assistance BOOLEAN,
  corrected_campaign_text TEXT,
  analyzed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Approved evidence library with pgvector embeddings
CREATE TABLE evidence_records (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  version TEXT NOT NULL,
  passage TEXT NOT NULL,
  embedding VECTOR(1536),  -- for future semantic search
  created_at TIMESTAMPTZ DEFAULT now(),
  deprecated_at TIMESTAMPTZ
);

-- Vector similarity search (scaffolded)
CREATE FUNCTION match_evidence(query_embedding VECTOR(1536), match_count INT DEFAULT 5)
RETURNS SETOF evidence_records LANGUAGE sql AS $$
  SELECT * FROM evidence_records
  WHERE deprecated_at IS NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Pre-seeded Evidence Records

| ID | Category | Source | Version |
|----|----------|--------|---------|
| `claim-policy-superlatives` | Claim verification | Claim Policy 3.2 | 1.0 |
| `northwind-integrations` | Fact verification | Northwind Product Fact Sheet | v3.2 |
| `northwind-terminology` | Brand consistency | Northwind Brand Guide | 7.1 |
| `wcag-contrast` | Accessibility | WCAG 2.2 | 1.4.3 |
| `wcag-alt-text` | Accessibility | WCAG 2.2 | 1.1.1 |

---

## 🗂 Key Files

| Path | Responsibility |
|------|----------------|
| `src/lib/governance-engine.ts` | Deterministic rules (6 categories), evidence verification, runId generation |
| `src/app/api/extract-claims/route.ts` | LLM extraction with structured tool use + Zod validation, deterministic fallback |
| `src/lib/signing.ts` | Ed25519 sign/verify, canonical JSON (sorted keys), key management |
| `src/app/verify/[runId]/page.tsx` | **Public verification — embedded public key, client-side crypto** |
| `src/app/api/review/route.ts` | Review decision, corrected text generation, passport signing on approval |
| `src/lib/governance-store.ts` | In-memory + Supabase persistence, optimistic locking, evidence queries |
| `src/lib/schemas.ts` | Zod schemas for all API inputs/outputs, error codes |
| `src/lib/governance.ts` | TypeScript types: Finding, AuditEntry, GovernanceRun, ReviewDecision |
| `src/app/page.tsx` | Main workspace (campaign input, findings, review, passport tabs) |
| `src/app/evidence/page.tsx` | Evidence Library (search, filter, expand, cross-refs) |
| `src/components/ui/diff-view.tsx` | Side-by-side original vs corrected campaign diff |
| `src/components/ui/judge-scorecard.tsx` | Visual metrics summary for judges |

---

## 🧠 Hard Technical Challenges — Solved

| Challenge | Solution |
|-----------|----------|
| **Hallucination in governance** | Hybrid architecture: LLM only extracts claims; all evaluation is pure TypeScript deterministic rules |
| **Cross-environment signature consistency** | Canonical JSON with sorted keys — identical payloads produce identical signatures everywhere |
| **Browser-native crypto verification** | `@noble/ed25519` works in browser without Node polyfills; public key embedded in verify page |
| **Concurrent reviewer conflicts** | Optimistic locking with version field + automatic retry (re-read → re-apply → save) |
| **Zero-config demo** | In-memory fallback for all Supabase operations — works instantly without credentials |

---

## 🔮 Round 3 Roadmap

### 1. Evidence Library CRUD with Versioning
Full create/read/update/deprecate UI and API. Each edit creates an immutable version; findings reference specific evidence versions; deprecated records show warnings. Adds `evidence_versions` table and `POST/PATCH/DELETE /api/evidence/[id]`.

**Impact:** Governance teams maintain a living, auditable evidence library — trace exactly which version supported each finding.

### 2. Multi-Campaign Workspace Dashboard
New `/dashboard` with campaign cards (title, status, last analyzed, findings count, reviewer), create campaign flow, run history per `contentId` with version timeline, bulk actions, team settings. Backed by Supabase RLS for multi-tenant isolation.

**Impact:** Marketing teams govern dozens of campaigns simultaneously; portfolio view; onboard without code changes.

### 3. Policy-as-Code DSL (YAML/JSON)
Replace hardcoded rules with declarative rule packs: each rule defines `pattern`, `category`, `severity`, `evidenceIds[]`, `explanationTemplate`, `recommendationTemplate`. Rules loaded from `rules/v1/*.yaml`, hot-reloadable, versioned per `rulesVersion`. CLI: `npx inkloom rules validate` and `npx inkloom rules test --text "..."` for CI.

**Impact:** Compliance/brand/legal author rules without engineering; rules become reviewable, diffable, testable artifacts in git.

---

## 📄 License

MIT — Built for the Northwind hackathon submission.

---

<div align="center">

**Made with ❤️ for content governance that proves itself.**

[**Live Demo**](https://inkloom-ai-three.vercel.app) · [**GitHub**](https://github.com/Sanjaybusa/inkloom-ai) · [**Report Issue**](https://github.com/Sanjaybusa/inkloom-ai/issues)

</div>