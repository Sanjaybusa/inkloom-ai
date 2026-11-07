# Inkloom AI

Inkloom is a public evidence-backed content governance demo. It analyzes the Northwind Q4 campaign, records finding dispositions and reviewer decisions, and generates a **cryptographically signed Trust Passport** with an immutable audit trail.

## 🎯 Judge in 2 Minutes (Hackathon Demo)

**Live:** https://inkloom-ai-three.vercel.app

### Quick Start
1. **Open** the live demo → Click **"Run Governance Check"** (uses Northwind sample)
2. **Watch** 7 findings appear instantly — superlative claims, outdated specs, brand terminology, accessibility issues
3. **Click** "Accept" on all 7 findings (top-right of each card)
4. **Click** "Approve" in the Review tab → Enter reviewer name & reason
5. **See** the **signed Trust Passport** appear with Ed25519 signature
6. **Click** "Verify" button → Opens public `/verify/[runId]` page
7. **Click** "Verify Signature" → Cryptographic proof the passport hasn't been tampered with

### Demo Modes (add to URL)
- `?demo=perfect` — Pre-approved campaign, ready to verify
- `?demo=rejected` — Campaign with violations, shows rejection flow  
- `?demo=pending` — Campaign awaiting review
- `?demo=empty` — Clean slate, no analysis run

### Differentiator Features (Round 2)
| Feature | Why It Matters |
|---------|----------------|
| **Hybrid AI: LLM claim extraction + deterministic rules** | No hallucination — claims extracted by Claude, evaluated by code |
| **Evidence-backed verification** | 5 pre-seeded approved records (policies, fact sheets, brand guides, WCAG) |
| **Ed25519 signed Trust Passports** | Cryptographic integrity — anyone can verify without server trust |
| **Public verification page** | QR-free, stateless, runs entirely in browser with embedded public key |
| **Optimistic locking** | Concurrent reviewer actions handled safely with version conflicts |
| **Corrected campaign text** | Auto-generates compliant copy from accepted/edited findings |

## Architecture

```text
Public Next.js 16 (App Router, Turbopack)
  -> API Routes: analyze, extract-claims, findings/action, review, passport, audit, verify
  -> Supabase PostgreSQL + pgvector (evidence library)
  -> Anthropic Claude (structured claim extraction via tool use)
  -> @noble/ed25519 (Ed25519 signatures on canonical JSON)
  -> Vercel deployment
```

### Pipeline Flow
```
POST /api/analyze
  1. LLM extracts verifiable claims (metrics, superlatives, specs, terminology, a11y, compliance)
  2. Deterministic rule engine evaluates 6 categories (zero hallucination)
  3. Findings verified against approved evidence library (5 records)
  4. Run persisted with audit trail → returns runId
POST /api/findings/[id]/action  → accept/edit/dispute (optimistic locking)
POST /api/review                → approve/reject/changes_requested → returns signed passport
GET /verify/[runId]             → client-side Ed25519 verification (no server trust)
```

## Local Setup

```bash
npm install
npm run dev
```

The application works without credentials by using a server-side memory fallback. Supabase and Claude credentials enable durable persistence and AI-assisted verification.

Copy `.env.example` to `.env.local` and configure:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
PASSPORT_SIGNING_KEY=<64-char hex Ed25519 private key>
```

> ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or `PASSPORT_SIGNING_KEY` with a `NEXT_PUBLIC_` prefix.

### Generate Signing Key
```bash
node -e "
const {ed25519} = require('@noble/ed25519');
const {sha512} = require('@noble/hashes/sha512');
ed25519.etc.sha512 = sha512;
const pk = ed25519.utils.randomSecretKey();
console.log('Private key (PASSPORT_SIGNING_KEY):', Buffer.from(pk).toString('hex'));
console.log('Public key (embed in verify page):', Buffer.from(ed25519.getPublicKey(pk)).toString('hex'));
"
```

## Supabase

Run the migration in `supabase/migrations/20261105_governance_runs.sql`. It creates:
- `governance_runs` — campaign runs with JSONB findings, audit trail, review decisions
- `evidence_records` — approved evidence library with pgvector embeddings column
- `match_evidence()` — vector similarity search function (scaffolded for future semantic search)

### Pre-seeded Evidence Records
| ID | Category | Source | Version |
|----|----------|--------|---------|
| `claim-policy-superlatives` | Claim verification | Claim Policy 3.2 | 1.0 |
| `northwind-integrations` | Fact verification | Northwind Product Fact Sheet | v3.2 |
| `northwind-terminology` | Brand consistency | Northwind Brand Guide | 7.1 |
| `wcag-contrast` | Accessibility | WCAG 2.2 | 1.4.3 |
| `wcag-alt-text` | Accessibility | WCAG 2.2 | 1.1.1 |

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Full pipeline: extract claims → evaluate rules → verify evidence → persist run |
| `POST` | `/api/extract-claims` | Standalone LLM claim extraction (arbitrary marketing text) |
| `POST` | `/api/findings/[id]/action` | Accept/edit/dispute with optimistic locking (version field, auto-retry on 409) |
| `POST` | `/api/review` | Approve/reject/changes_requested → returns signed passport on approval |
| `GET` | `/api/passport/[contentId]` | Unsigned passport; `?signed=true&format=json` for signed |
| `GET` | `/api/audit/[contentId]` | Full audit trail |
| `GET` | `/verify/[runId]` | Public verification page (client-side Ed25519 check) |

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/governance-engine.ts` | Deterministic rule evaluation (6 categories), evidence verification, runId generation |
| `src/app/api/extract-claims/route.ts` | LLM claim extraction with structured tool use + Zod validation, deterministic fallback |
| `src/lib/signing.ts` | Ed25519 sign/verify, canonical JSON (sorted keys), key management |
| `src/app/verify/[runId]/page.tsx` | Public verification page — embedded public key, client-side crypto |
| `src/app/api/review/route.ts` | Review decision, corrected text generation, passport signing on approval |
| `src/lib/governance-store.ts` | In-memory + Supabase persistence, optimistic locking, evidence queries |
| `src/lib/schemas.ts` | Zod schemas for all API inputs/outputs, error codes |
| `src/lib/governance.ts` | TypeScript types: Finding, AuditEntry, GovernanceRun, ReviewDecision |
| `src/app/api/evidence/route.ts` | Evidence library read API |
| `src/app/api/findings/[id]/action/route.ts` | Finding actions with optimistic locking retry logic |
| `src/app/page.tsx` | Main workspace UI (campaign input, findings, review, passport tabs) |
| `src/app/evidence/page.tsx` | Evidence Library UI (search, filter, expand, cross-refs) |
| `src/components/ui/diff-view.tsx` | Side-by-side original vs corrected campaign diff |
| `src/components/ui/judge-scorecard.tsx` | Visual metrics summary for judges |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Database | Supabase PostgreSQL + pgvector |
| AI | Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| Crypto | `@noble/ed25519` + `@noble/hashes/sha512` |
| Validation | Zod |
| Deployment | Vercel |

## Hard Technical Challenges Solved

| Challenge | Solution |
|-----------|----------|
| **Hallucination in governance** | Hybrid architecture: LLM only extracts claims; all evaluation is pure TypeScript deterministic rules |
| **Cross-environment signature consistency** | Canonical JSON with sorted keys — identical payloads produce identical signatures everywhere |
| **Browser-native crypto verification** | `@noble/ed25519` works in browser without Node polyfills; public key embedded in verify page |
| **Concurrent reviewer conflicts** | Optimistic locking with version field + automatic retry (re-read → re-apply → save) |
| **Zero-config demo** | In-memory fallback for all Supabase operations — works instantly without credentials |

## What Doesn't Work Yet (Known Gaps)

- **Evidence CRUD/versioning** — read-only UI; no create/edit/deprecate API
- **Multi-campaign workspace** — single `contentId` (`northwind-q4`); no dashboard
- **Policy-as-Code DSL** — rules hardcoded in `governance-engine.ts`; no YAML/JSON authoring
- **Supabase persistence** — requires credentials; in-memory fallback only
- **pgvector semantic search** — `match_evidence()` function exists but not wired; embeddings not generated
- **Authentication/authorization** — public demo; anyone can modify findings, submit reviews

## Round 3 Roadmap (3 Features)

### 1. Evidence Library CRUD with Versioning
Full create/read/update/deprecate UI and API for approved evidence records. Each edit creates a new immutable version; findings reference specific evidence versions; deprecated records show warnings in findings. Adds `evidence_versions` table and `POST/PATCH/DELETE /api/evidence/[id]`.

**User impact:** Governance teams maintain a living, auditable evidence library — trace exactly which version supported each finding.

### 2. Multi-Campaign Workspace Dashboard
New `/dashboard` route with campaign cards (title, status, last analyzed, findings count, reviewer), create new campaign flow, run history per `contentId` with version timeline, bulk actions (re-analyze, export all passports), team settings. Backed by Supabase RLS for multi-tenant isolation.

**User impact:** Marketing teams govern dozens of campaigns simultaneously; portfolio view; onboard without code changes.

### 3. Policy-as-Code DSL (YAML/JSON)
Replace hardcoded TypeScript rules with declarative rule packs: each rule defines `pattern` (regex/glob), `category`, `severity`, `evidenceIds[]`, `explanationTemplate`, `recommendationTemplate`. Rules loaded from `rules/v1/*.yaml` at startup, hot-reloadable in dev, versioned per `rulesVersion` in passport. Includes CLI: `npx inkloom rules validate` and `npx inkloom rules test --text "..."` for CI integration.

**User impact:** Compliance/brand/legal author rules without engineering; rules become reviewable, diffable, testable artifacts in git.

---

## License

MIT — Built for the Northwind hackathon submission.