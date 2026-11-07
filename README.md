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
  -> API Routes: analyze, extract-claims, findings/action, review, passport
  -> Supabase PostgreSQL + pgvector (evidence library)
  -> Anthropic Claude (structured claim extraction via tool use)
  -> @noble/ed25519 (Ed25519 signatures on canonical JSON)
  -> Vercel deployment
```

## Local setup

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

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or `PASSPORT_SIGNING_KEY` with a `NEXT_PUBLIC_` prefix.

## Supabase

Run the migration in `supabase/migrations/20261105_governance_runs.sql`. It creates governance run storage and an approved evidence library with pgvector support.

## API routes

- `POST /api/analyze` — Full pipeline: extract claims → evaluate rules → verify evidence
- `POST /api/extract-claims` — LLM-powered claim extraction (works on arbitrary marketing text)
- `POST /api/findings/[id]/action` — Accept/edit/dispute with optimistic locking
- `POST /api/review` — Approve/reject/changes_requested → returns signed passport on approval
- `GET /api/passport/[contentId]` — Unsigned passport; `?signed=true&format=json` for signed
- `GET /api/audit/[contentId]` — Full audit trail
- `GET /verify/[runId]` — Public verification page (client-side signature check)

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/governance-engine.ts` | Deterministic rule evaluation (6 categories) |
| `src/app/api/extract-claims/route.ts` | LLM claim extraction with tool use |
| `src/lib/signing.ts` | Ed25519 sign/verify, canonical JSON |
| `src/app/verify/[runId]/page.tsx` | Public verification page |
| `src/app/api/review/route.ts` | Review decision + passport signing |
| `src/lib/governance-store.ts` | In-memory + Supabase persistence |

## Round 3 Roadmap (3 Features)

1. **Evidence Library UI** — CRUD for approved evidence records with versioning
2. **Multi-campaign Workspace** — Dashboard to manage multiple content IDs
3. **Policy-as-Code DSL** — Write governance rules in YAML/JSON, not TypeScript
