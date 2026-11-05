---
title: "Deliver a downloadable Evidence Passport"
type: feature
ticket: "story-deliver-a-downloadable-evidence-passport"
created: "2026-11-05"
status: "built"
baseline_revision: "97f5af16805eb490836bcc3dbd7111e15fa9bb26"
route: "full"
route_source: "auto"
risk: "high"
review: "quick"
review_source: "pinned"
lenses_ran: ["quick"]
review_loop_iteration: 0
context:
  - "_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/tickets/story-deliver-a-downloadable-evidence-passport.md"
  - "_bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md"
  - "_bmad-output/initiative-inkloom-hackathon-demo/architecture-judge-ready-demo/architecture-judge-ready-demo.md"
  - "src/app/page.tsx"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Approved campaign reviews have an Evidence Passport preview, but judges cannot leave with a portable record of the campaign, findings, evidence, corrections, and decision.

**Approach:** Add a browser-local download action that is visible only for an approved snapshot and serializes the same campaign and review data shown in the passport preview into one portable artifact.

## Boundaries & Constraints

**Always:**
- Keep the implementation in the existing Next.js client page.
- Generate the artifact only from `snapshot.status === "approved"` and never invent approval data at export time.
- Include campaign title/text, run ID, analysis timestamp, every finding ID/title/severity/claim/evidence/recommendation, approval outcome and timestamp, schema version, rules version, and evidence-library version.
- Use stable exported metadata values `rulesVersion: "1.0"` and `evidenceLibraryVersion: "northwind-demo-v2"`.
- Gate export at the handler and UI: `status === "approved"`, `approval.approved === true`, and `approvedAt` must all be present immediately before serialization.
- Escape Markdown control characters, backslashes, angle brackets, line-prefix characters, and content fences in every exported text field.
- Use plain React text for campaign content; never execute campaign markup.
- Use a deterministic safe filename: lowercase campaign title, ASCII alphanumerics only, spaces to hyphens, collapse repeated hyphens, truncate to 48 characters, use `campaign` as fallback, and append `-passport-v1.0.md`.
- Serialize the artifact as human-readable Markdown (`.md`) derived from the same approved snapshot used by the preview.
- Preserve existing preview behavior and ensure a re-run analysis invalidates stale export availability.
- Keep export browser-local with no API, login, database, analytics, or external service.

**Never:**
- Enable download for pending or analyzed but unapproved snapshots.
- Add server-generated files, persistence, reviewer identities, real AI analysis, or third-party evidence integrations.
- Change the existing dashboard layout or approval flow beyond the export action.
- Let preview and download read separate campaign data sources.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| APPROVED_SAMPLE_DOWNLOAD | Approved snapshot with sample findings | A passport artifact downloads and contains the campaign summary, every finding, evidence, correction, and approved decision | No error expected |
| APPROVED_CUSTOM_DOWNLOAD | Approved custom snapshot | Artifact contains submitted campaign text and current custom findings, not stale sample values | No stale approval or evidence values included |
| UNAPPROVED_DOWNLOAD | Pending or analyzed snapshot | Download action is absent or disabled and cannot create a passport | UI remains gated by approval state |
| SAFE_FILENAME | Campaign title or text contains spaces, slashes, markup, or punctuation | Browser download uses a short safe filename derived from campaign title plus schema version | No path traversal or executable markup filename |
| MARKUP_CONTENT | Campaign text containing HTML-like markup | Markup remains literal content inside the artifact and executes nowhere | Preserve React text and plain serialization safety |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- Reuse the existing `CampaignSnapshot` and finding model, approval gate, preview, and browser-local state. Add one export function beside the approval/passport logic.
- `src/app/page.tsx` -- Update the passport preview/export area to expose the download action only after approval.
- `src/app/page.tsx` -- Keep both preview and export derived from the same approved snapshot fields and timestamps.
- `src/app/page.tsx` -- Use browser Blob/URL APIs and a temporary anchor for client-only download behavior.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/page.tsx` -- Add approved-snapshot Markdown serialization, deterministic filename generation, Blob creation, temporary-anchor download, and object-URL cleanup.
- [ ] `src/app/page.tsx` -- Add a working download action inside the approved Passport section.
- [ ] `src/app/page.tsx` -- Derive artifact contents and preview from the identical current snapshot; keep stale export state unavailable after analysis.
- [ ] `src/app/page.tsx` -- Verify approved and unapproved browser states, custom copy, markup text, and filename safety.

**Acceptance Criteria:**
- Given a campaign review is approved, when the judge opens the passport and selects Download, then a browser artifact is generated.
- Given the artifact is opened, then it contains campaign title/text, run ID, analysis timestamp, every finding's ID/title/severity/claim/evidence/recommendation, approval outcome and timestamp, schema version, rules version, and evidence-library version.
- Given the review is pending, analyzed, or re-analyzed, then the download cannot expose or generate an old approved passport.
- Given campaign content contains HTML-like text, then the downloaded record contains it as plain text and no markup executes.

## Implementation Notes

- Export serialization now escapes control characters, Markdown control characters, angle brackets, and line-prefix heading/content syntax.
- Object URLs are revoked after a short browser download grace period.

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Markdown export left embedded control characters and `=` setext heading prefixes unneutralized. | high | patch | Verified `escapeMarkdownText()` did not escape CR, tabs, or leading `=`; patched it to neutralize these fields before Markdown serialization. |
| Object URL could be revoked too early after the anchor click. | medium | patch | Verified the original zero-delay timeout could race browser download initiation; changed cleanup to a one-second grace period. |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors or warnings.
- `npm run build` -- expected: successful Next.js production build.

**Manual checks:**
- Approve the sample review and download; open the artifact and confirm campaign, findings, evidence, corrections, approval decision, and timestamps.
- Repeat with custom text; confirm only current snapshot values are exported.
- Assert exact Markdown sections and field values against one approved snapshot, including filename and `text/markdown;charset=utf-8`.
- Verify `URL.revokeObjectURL()` is called after the click and HTML-like text remains literal.
- Before approval, confirm the export action is unavailable.
- Re-run analysis after approval and confirm old export availability is invalidated.
- Open HTML-like campaign content in the artifact and confirm it remains plain text.
