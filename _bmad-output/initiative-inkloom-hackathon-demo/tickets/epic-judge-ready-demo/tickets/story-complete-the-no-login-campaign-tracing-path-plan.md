---
title: "Complete the no-login campaign tracing path"
type: feature
ticket: "story-complete-the-no-login-campaign-tracing-path"
created: "2026-11-05"
status: built
baseline_revision: "8d1761d4128e18915444bac1dcf6dea93322e818"
route: full
route_source: auto
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - "_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/tickets/story-complete-the-no-login-campaign-tracing-path.md"
  - "_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The public dashboard has sample analysis controls, but the judge-facing tracer path needs to be clearly runnable from seeded content through finding details, approval, and a visible passport preview without account setup.

**Approach:** Harden the existing client-side workflow in the main Next.js page so the sample analysis, finding review, approval state, and passport preview form one complete public interaction.

## Boundaries & Constraints

**Always:**
- Preserve the current Inkloom dashboard layout and seeded Northwind content.
- Keep all state browser-local; no login, database, or external service.
- Preserve evidence and recommendation details while making the workflow unambiguous.
- Keep the implementation within the existing Next.js page unless a single small helper is needed.

**Never:**
- Add custom campaign input; that belongs to story 2.
- Implement passport download; that belongs to story 3.
- Add authentication, persistent reviewer records, or backend setup.
- Replace the dashboard's visual design or unrelated navigation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|---------------|
| HAPPY_PATH | Public page opens and user starts the sample analysis | Findings appear, the first finding is selected, and review metrics update | No error |
| APPROVE | User opens a finding and chooses approve | Status becomes Approved and the passport preview becomes available | Approval stays disabled after approval |
| PASSPORT_PREVIEW | Approved review opens Passport Preview | Preview identifies the campaign, findings, evidence, and approved decision without requiring login | Show "complete the review first" until approved |
| EMPTY_FINDINGS | Analysis returns no findings | A valid empty state appears rather than showing stale details | Clear selection and keep the workflow consistent |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- Owns the dashboard, seeded analysis, finding selection, approval state, and Passport Preview alert. Reuse existing state and finding types.
- `src/app/layout.tsx` -- Provides public Inkloom metadata; no implementation change is expected in this story.
- `src/app/globals.css` -- Existing Tailwind-compatible global styles; no change unless the tracer needs a visible empty state.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/page.tsx` -- Make the seeded run clear and deterministic: ensure analysis resets stale approval state, selects a finding, and updates review metrics.
- [ ] `src/app/page.tsx` -- Make finding selection and approval reinforce the public tracer path with consistent copy and disabled approved state.
- [ ] `src/app/page.tsx` -- Replace the passport alert with a visible preview that contains campaign, finding count, evidence summary, and approval outcome; do not add download behavior.
- [ ] `src/app/page.tsx` -- Add a safe empty-findings state for the sample rules if a seeded analysis produces no findings.

**Acceptance Criteria:**
- Given a judge opens the public dashboard, when sample analysis runs, then findings, the selected finding, and review metrics update without account setup.
- Given a finding is selected, when the judge approves it, then the review status becomes approved and approval cannot be repeated.
- Given approval is complete, when Passport Preview opens, then campaign context, finding/evidence summaries, and the approved outcome are visible.
- Given approval is incomplete, when Passport Preview opens, then the judge is prompted to complete the review.
- Given sample analysis yields no findings, then the UI shows a valid empty state without stale finding details.

## Implementation Notes

- Existing implementation has the complete sample flow in one client component; avoid adding a server action or persistence layer.
- The first story should harden and clarify this path, not implement custom input or export/download.

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
|---|---|---|
| Approval could occur before sample analysis because approval only checked selected findings and seeded findings existed on initial render. | high / patch | `src/app/page.tsx` now starts with no findings, no selection, and an `analyzed` guard; the approval button is disabled until analysis succeeds and a finding is selected. |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors or warnings.
- `npm run build` -- expected: successful Next.js production build.

**Manual checks:**
- Start the app and run the sample analysis; confirm findings and evidence details update.
- Approve the review and open Passport Preview; confirm it names the campaign and approval outcome.
- Open Passport Preview before approval; confirm it requests completion of the review.
