import { findingActionSchema, createErrorResponse, errorCodes } from "@/lib/schemas";
import { getRun, saveRun } from "@/lib/governance-store";
import type { GovernanceRun, Finding, FindingAction } from "@/lib/governance";

function applyFindingAction(run: GovernanceRun, id: string, action: FindingAction, reason?: string, editedFix?: string) {
  const now = new Date().toISOString();
  const finding = run.findings.find((item) => item.id === id);
  if (!finding) return null;

  finding.action = action;
  finding.actionReason = reason || undefined;
  if (editedFix) finding.editedFix = editedFix;

  const buildCorrectedText = (source: string, allFindings: typeof run.findings) => {
    let corrected = source;
    for (const item of allFindings as Finding[]) {
      if (item.action === "edit" && item.editedFix && item.claim !== "Campaign banner text contrast" && item.claim !== "Campaign banner image") {
        corrected = corrected.split(item.claim).join(item.editedFix);
      }
      if (item.action !== "accept" && item.action !== "edit") continue;
      if (item.id === "outdated-integrations") corrected = corrected.replace(/5 data sources/gi, "12 data sources");
      if (item.id === "brand-terminology") corrected = corrected.replace(/\bclients\b/gi, "customers");
      if (item.id === "unsupported-superlative") {
        corrected = corrected.replace(/^.*world(?:'s|'s) fastest analytics platform.*(?:\n|$)/gim, "");
      }
    }
    return corrected.trim();
  };
  run.correctedCampaignText = buildCorrectedText(run.campaignText, run.findings);
  run.status = "analyzed";
  run.review = { decision: null, reviewer: null, reason: null, decidedAt: null };
  run.updatedAt = now;
  run.audit.push({
    id: crypto.randomUUID(),
    event: `finding_${action}` as "finding_accept" | "finding_edit" | "finding_dispute",
    actor: "Demo Reviewer",
    timestamp: now,
    details: { findingId: id, reason: reason || null, editedFix: editedFix ?? undefined, version: run.version + 1 },
  });
  return run;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { runId, action, reason, editedFix, version } = findingActionSchema.parse(body);

    let run = await getRun(runId);
    if (!run) return createErrorResponse(errorCodes.NOT_FOUND, "Analysis run not found.");
    const finding = run.findings.find((item) => item.id === id);
    if (!finding) return createErrorResponse(errorCodes.NOT_FOUND, "Finding not found.");

    // Try to save with expected version, retry once on conflict by re-reading
    let retried = false;
    while (true) {
      const updatedRun = applyFindingAction(run, id, action, reason, editedFix);
      if (!updatedRun) return createErrorResponse(errorCodes.NOT_FOUND, "Finding not found.");

      // updatedRun is guaranteed non-null here after the check above
      const runToSave = updatedRun as GovernanceRun;
      const expectedVersion = version as number;
      try {
        await saveRun(runToSave, expectedVersion);
        return Response.json(updatedRun);
      } catch (saveError) {
        if (saveError instanceof Error && saveError.message.includes("Version conflict") && !retried) {
          // Re-read the latest run and retry once
          retried = true;
          const freshRun = await getRun(runId);
          if (freshRun) {
            run = freshRun;
            continue;
          }
          return createErrorResponse(errorCodes.CONFLICT, "Run was modified by another request. Please refresh.", {}, 409);
        }
        throw saveError;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return createErrorResponse(errorCodes.VALIDATION_ERROR, "Invalid request", { issues: error.message });
    }
    if (error instanceof Error && error.message.includes("Version conflict")) {
      return createErrorResponse(errorCodes.CONFLICT, "Run was modified by another request. Please refresh.", {}, 409);
    }
    console.error("Finding action route failed", error);
    return createErrorResponse(errorCodes.INTERNAL_ERROR, "Finding action could not be recorded.");
  }
}