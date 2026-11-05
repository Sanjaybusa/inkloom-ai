---
id: 1
type: epic
title: "Judge-ready public demo"
parent: "initiative-inkloom-hackathon-demo"
sources: ["src/app/page.tsx", "src/app/layout.tsx", "package.json"]
companions:
  - "_bmad-output/initiative-inkloom-hackathon-demo/architecture-judge-ready-demo/architecture-judge-ready-demo.md"
  - "_bmad-output/initiative-inkloom-hackathon-demo/architecture-judge-ready-demo/INKLOOM-ARCHITECTURE-BRIEF.md"
covers: ["R1", "R2", "R3", "R4", "R5"]
after: []
risk: medium
refined: true
---

# Judge-ready public demo

## Description

Deliver the complete public Inkloom campaign governance experience on the existing Next.js dashboard, from content input through evidence export.

## Outcome

Judges can see and exercise the product's strongest differentiators in one uninterrupted public demo.

## Requirements

1. **Public access** (parent R1): The deployed page loads and accepts interaction without authentication.
2. **Custom campaign analysis** (parent R2): User-entered content updates the analysis workspace instead of requiring seeded data only.
3. **Evidence review** (parent R3): Findings connect to evidence, corrections, and an approval action.
4. **Evidence Passport** (parent R4): Approval creates a real downloadable artifact with campaign and review data.
5. **Judge readiness** (parent R5): Copy and metadata present the product as finished and deployment-ready.

## Constraints

- Preserve the existing UI.
- No account, database, or external service is required to complete the demo.
- Browser-local state is acceptable for the evaluation session.

## Done when

- The public URL completes the full route from content entry to downloaded passport.
- The mobile and desktop dashboard remain usable.
- Lint, build, and smoke validation pass.

## Boundaries

- Implementation stays within the existing Next.js application path and client-side browser behavior.
- Multi-user collaboration, persistence, and production moderation are out of scope.

## References

- parent — _bmad-output/initiative-inkloom-hackathon-demo/initiative-inkloom-hackathon-demo.md, Requirements
- source — src/app/page.tsx
- source — src/app/layout.tsx
- source — package.json

## Notes

- Decision: The current dashboard is the opening epic baseline. Recorded 2026-11-05.
- Decision: The first story is the tracer bullet; browser-local interactions are the demo implementation. Recorded 2026-11-05.
