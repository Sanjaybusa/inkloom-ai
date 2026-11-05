---
id: ""
type: initiative
title: "Deliver a judge-ready public Inkloom demo"
parent: ""
sources: ["src/app/page.tsx", "src/app/layout.tsx", "package.json"]
companions: []
covers: []
after: []
risk: medium
refined: false
---

# Deliver a judge-ready public Inkloom demo

## Description

Inkloom becomes a public, no-login hackathon demo that lets judges evaluate a campaign through governance analysis, evidence review, approval, and an evidence passport without setup.

## Outcome

A judge can open the deployed demo and complete the full value path in one sitting without creating an account.

## Requirements

1. **Public access** (source: src/app/page.tsx): The deployed product opens and completes its core flow without signup, login, or backend setup.
2. **Custom campaign analysis** (source: src/app/page.tsx): A judge can enter campaign content, run analysis, and see the seeded governance workspace update from that input.
3. **Evidence review** (source: src/app/page.tsx): The product shows findings, supporting evidence, suggested corrections, and a clear approval decision.
4. **Evidence Passport** (source: src/app/page.tsx): The approved review produces a downloadable passport containing the campaign, findings, evidence, and approval outcome.
5. **Judge readiness** (source: src/app/layout.tsx): The public page uses Inkloom-specific metadata and does not expose demo-only limitations or "coming soon" language.

## Constraints

- Preserve the existing Inkloom dashboard as the implementation baseline.
- Keep the demo deployable without authentication or a required external database.
- Limit changes to a judge-completable path and focused polish.

## Done when

- A judge reaches every major screen from the public URL without setup.
- A submitted campaign produces visible analysis results.
- A reviewer can approve and generate an Evidence Passport export.
- The production build, lint, and browser smoke test pass.
- The demo is publicly accessible and pitch-ready.

## Boundaries

- Out of scope: account creation, team administration, billing, persistent multi-user records, and a general-purpose CMS.
- The website is public and read/write only for the demo session.
- Tracer path: analysis input -> findings -> evidence review -> approval -> passport export -> public deployment.

## References

- parent source — src/app/page.tsx, page implementation
- parent source — src/app/layout.tsx, metadata
- parent source — package.json, scripts and dependencies

## Notes

- Assumption: Browser-local state is sufficient for hackathon judging; it need not persist across devices.
- Assumption: Public deployment can be static or serverless with no login provider.
- Open question: Which hosting target the judging environment will use for the final public URL.
- Decision: One epic is sufficient because all requested outcomes share the same Next.js page and deployment boundary. Recorded 2026-11-05.
