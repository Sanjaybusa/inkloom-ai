---
title: 'Polish the public hackathon demo'
type: 'feature'
ticket: '4'
created: '2026-11-05'
status: 'built'
baseline_revision: '51d086555dc376aee4833e8236966bb85616942a'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md'
  - '{project-root}/_bmad-output/initiative-inkloom-hackathon-demo/architecture-judge-ready-demo/architecture-judge-ready-demo.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The completed campaign tracing path still exposes internal demo language and has limited responsive navigation, which weakens the judge-facing presentation.

**Approach:** Preserve the existing browser-local workflow and evidence contracts while removing demo/setup labels, improving concise product copy, invalidating stale approvals after campaign edits, and making desktop and mobile presentation clear and usable.

## Boundaries & Constraints

**Always:** Preserve the public no-login workflow, one-snapshot review state, approval gate, and downloadable Markdown passport. Keep all campaign text browser-local. Maintain keyboard and screen-reader access for analysis, finding selection, approval, preview, and download actions.

**Never:** Add authentication, accounts, persistence, external APIs, analytics, telemetry, or new governance rules. Do not redesign the workflow, add backend-dependent functionality, change the passport data contract, or present this as a finished-account workspace.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop judge flow | Existing sample or custom campaign | Clear public product presentation, responsive sidebar and review content | Preserve existing validation and approval behavior |
| Mobile judge flow | Phone viewport and campaign text | Main actions and cards remain usable in a single column | Long text wraps; controls stay touch reachable |
| Before analysis | Empty or sample editor state | Copy explains the starting action without demo-only limitations | Existing input-required and sample behavior remain |
| No findings | Safe custom text producing no findings | Polished empty state explains that approval is unavailable | No stale approval or passport exposure |
| Approved snapshot after editor edit | Previously approved campaign, editor value then changed | Passport actions disappear until the text is analyzed and the new review is approved | Clear stale-state copy without exposing stale approval or export data |
| Approved snapshot | Approved campaign with findings | Primary product copy and passport actions remain consistent | Existing download and preview guards remain unchanged |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- Main public workspace, campaign editor, review workflow, approval gate, Passport Preview, and visible judge-facing copy. Reuse the existing snapshot and deterministic analysis behavior; change copy and presentation only unless responsive structure requires a tightly coupled adjustment.
- `src/app/layout.tsx` -- Next.js metadata and public page shell. Keep public, accurate metadata that describes the content-governance product.
- `src/app/globals.css` -- Global interaction and selection defaults. Add only broadly reusable polish if Tailwind utilities are insufficient.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/page.tsx` -- Replace visible "demo", setup, fictional-data, reviewer-demo, round, and browser-session language with concise public-product copy while preserving the underlying product behavior.
- [ ] `src/app/page.tsx` -- When campaign editor text changes or a new analysis run replaces its snapshot, invalidate approval and close Passport Preview so no actions expose a stale approved campaign.
- [ ] `src/app/page.tsx` -- Improve the compact/mobile header or navigation presentation so the workflow remains discoverable when the desktop sidebar is hidden.
- [ ] `src/app/page.tsx` -- Replace account-like and internal demo affordances in the sidebar/header/footer with a public review workspace, and convert pseudo-navigation into meaningful in-page section navigation or remove it.
- [ ] `src/app/page.tsx` -- Strengthen the campaign-to-evidence-to-approval progression and keep approval/passport copy consistent across pending, approved, preview, and export states.
- [ ] `src/app/page.tsx` -- Make finding selection and long custom-text content usable at narrow widths with clear touch targets, wrapping, and selected-detail focus behavior.
- [ ] `src/app/page.tsx` -- Tighten visual hierarchy, spacing, overflow, button states, status copy, and long-text behavior across the campaign editor, metrics, finding list, review panel, and passport panel.
- [ ] `src/app/layout.tsx` -- Ensure public metadata describes Inkloom as a content-governance workflow rather than an internal or sample application.
- [ ] Verification -- Run lint and production build, then perform the judge path in desktop and mobile browser viewports.

**Acceptance Criteria:**
- Given a desktop public viewport, when the page loads, then the user sees no login, setup, coming-soon, Supabase, persistence, fictional-Northwind, round-demo, or browser-demo requirement language.
- Given any visible or hidden text containing campaign copy, when Story 4 presentation is applied, then sidebar, header, approval, footer, empty states, and preview copy use public-product language rather than implementation limitations.
- Given a mobile viewport, when the judge opens and scrolls the campaign workspace, then campaign copy, analysis actions, findings, evidence, approval, preview, and passport controls remain reachable without horizontal overflow.
- Given an unchanged campaign snapshot, when Story 4 presentation changes are applied, then analysis, finding selection, approval, preview, and download behavior remain the same.
- Given unapproved state, when the user inspects the Evidence Passport area, then preview and download guards still prevent an exported or approved result.
- Given approved state, when the judge clicks Preview Passport and Download Passport, then the preview and markdown download continue to derive only from the approved snapshot.
- Given an approved campaign, when the campaign editor text is changed but not analyzed, then Preview and Download Passport actions are hidden and the review status cannot show an active approved result.

## Implementation Notes

- Implemented Story 4 in `src/app/page.tsx` and `src/app/layout.tsx`. Added public copy cleanup, in-page section navigation, stale-approval invalidation on campaign edits, responsive mobile navigation, and consistent approval/passport states. Lint and production build passed. Desktop and mobile browser smoke checks passed; automated download capture timed out and remains a manual judge-browser check.

## Plan Change Log

- Reviewer finding: visible UI still exposed multiple demo/implementation labels and stale approved state after editor changes. Amendments added public-copy acceptance, editor-change invalidation, and close-preview behavior. Kept existing snapshot contract and downloadable passport format unchanged.

## Review Triage Log

- Rubber-duck review: 1 high and several medium findings. Accepted copy-scan coverage, stale-approval invalidation, mobile navigation/access, and verification expansion; deferred reviewed-finding ID expansion as an architecture-level snapshot-contract change outside Story 4, and retained the existing export contract.
- UX review: accepted public-product header/sidebar copy, meaningful mobile section navigation, stale-state messaging, consistent approval/passport language, narrow-text wrapping, and finding-selection usability. Findings were kept within the existing campaign-review workflow.
- Quick review / Preview Passport stale action: verified as real; patched the preview button to disappear while editor text differs from the campaign snapshot.
- Quick review / long submitted campaign text: verified as real at narrow widths; patched the read-only text to use long-token wrapping.
- Quick review / evidence-library version contract: verified as a direct contract regression; reverted it to `northwind-demo-v2` to preserve the existing passport metadata.

## Verification

**Commands:**
- `npm run lint` -- expected: no ESLint errors
- `npm run build` -- expected: production build succeeds

**Manual checks:**
- Complete the sample flow in a desktop viewport, including analysis, finding review, approval, Passport Preview, and download where browser automation permits.
- Complete the custom-input flow in a mobile viewport, verify empty and no-findings states, and confirm there is no horizontal overflow.
- Search visible UI copy for judge-facing limitation words such as "demo", "browser-local", "fictional", "Supabase", "login", and "coming soon"; explanatory copy must not expose implementation limitations.
