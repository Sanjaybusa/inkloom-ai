---
title: "Add custom campaign analysis input"
type: feature
ticket: "story-add-custom-campaign-analysis-input"
created: "2026-11-05"
status: built
baseline_revision: "823891e1824145eb7ae87a38bd7490d4e9ada4e3"
route: full
route_source: auto
risk: medium
review: "quick"
review_source: "pinned"
lenses_ran: ["quick"]
review_loop_iteration: 0
context:
  - "_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/tickets/story-add-custom-campaign-analysis-input.md"
  - "_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md"
  - "_bmad-output/initiative-inkloom-hackathon-demo/architecture-judge-ready-demo/architecture-judge-ready-demo.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The dashboard analyzes only seeded copy, so judges cannot test the product with their own campaign text.

**Approach:** Add a browser-local campaign text editor to the existing page and run the same deterministic governance rules against submitted text while preserving the sample as the default.

## Boundaries & Constraints

**Always:**
- Keep the implementation in the existing Next.js client page.
- Default the editor to the current seeded campaign copy.
- Treat campaign text as plain React text; do not interpret HTML.
- Limit input to 2,000 characters and show clear inline validation.
- Reset stale approval and passport state after every new analysis.
- Render the submitted campaign copy in the review context.
- Maintain one client-side campaign snapshot containing `schemaVersion`, `runId`, `campaignTitle`, `campaignText`, `analyzedAt`, `status`, findings, selected finding ID, and approval state.
- Keep custom campaign metrics and Passport Preview derived from the current submitted snapshot rather than stale seeded constants.
- For a successful analysis with no findings, keep approval disabled and show the valid no-findings state.

**Never:**
- Add authentication, API calls, persistence, analytics, or external services.
- Add passport download in this story.
- Replace the existing dashboard layout or add backend AI analysis.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| CUSTOM_TEXT | Non-empty text with one or more governance phrases | Text is submitted as the campaign snapshot, findings update deterministically, first finding is selected | None |
| SAFE_TEXT | Non-empty text without matching risky phrases | Submitted text appears in review context and no stale seeded findings remain | Valid no-findings state; approval stays unavailable |
| EMPTY_TEXT | Whitespace-only or empty textarea | Inline campaign-content error appears and analysis does not run or change status | Preserve previous analyzed result without claiming the empty submission succeeded |
| OVERSIZED | More than 2,000 characters | Input is constrained or rejected with a clear limit message | Do not analyze oversized content |
| MARKUP_TEXT | Text containing HTML-like markup | It appears as text and produces no executable markup | Render through React text only |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- Main client component. Reuse its Finding model, `analyzeSample` rules, review metrics, approval guard, finding list, and passport preview. Add campaign editor state and a text-driven analysis function beside the existing sample rules.
- `src/app/page.tsx` -- `runAnalysis()` is the state transition entry point; update it to validate and derive findings, campaign title, submitted text, selection, approval, and preview in one browser-local run.
- `src/app/page.tsx` -- Hero and content review surfaces should show the editor plus submitted campaign context; no separate route or component is required.
- `src/app/globals.css` -- Use only if the existing Tailwind utilities cannot express the needed validation styling.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/page.tsx` -- Add a controlled campaign textarea initialized with the seeded campaign text and a 2,000-character limit with an accessible label and inline limit/error copy.
- [ ] `src/app/page.tsx` -- Generalize the seeded text analysis into deterministic text analysis that uses the submitted copy, while keeping sample accessibility behavior tied to the demo.
- [ ] `src/app/page.tsx` -- Update `runAnalysis()` so whitespace is rejected without changing analyzed state, successful custom runs reset approval and selection, and submitted text is shown in the review context.
- [ ] `src/app/page.tsx` -- Keep campaign metrics and Passport Preview fields synchronized with the current snapshot; do not leave claim counts or sample evidence tied to the previous seeded run.
- [ ] `src/app/page.tsx` -- Render a clear no-findings state and submitted campaign text as plain React content after custom analysis.

**Acceptance Criteria:**
- Given a judge replaces the seeded copy, when the judge runs analysis, then the submitted text and findings based on that text appear in the browser-local review workspace.
- Given the campaign text contains `80%`, `5 data sources`, or `clients`, then deterministic findings correspond to those submitted phrases.
- Given the textarea is empty or whitespace-only, when analysis starts, then inline content-required validation appears and existing reviewed state is not falsely marked as a successful new analysis.
- Given text exceeds 2,000 characters, then it is not analyzed and a visible limit message appears.
- Given campaign text contains HTML-like markup, then it is rendered as text and no markup or script executes.

## Implementation Notes

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Custom 80%, data-source, and clients matches showed hard-coded sample claim text. | medium | patch | Verified in `src/app/page.tsx`: `analyzeText()` returned fixed claim strings despite the submitted text; the smallest fix extracts the matching submitted sentence with a sample fallback. |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors or warnings.
- `npm run build` -- expected: successful Next.js production build.

**Manual checks:**
- Enter custom text and run analysis; confirm submitted text and generated findings appear.
- Run an empty submission; confirm validation appears and no analysis completes.
- Enter HTML-like text; confirm it renders only as plain text.
- Repeat analysis; confirm stale approval state resets and the first custom finding is selected.
