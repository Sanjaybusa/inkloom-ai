import { getLatestRun, getRun } from "@/lib/governance-store";

export async function GET(_request: Request, context: RouteContext<"/api/audit/[contentId]">) {
  const { contentId } = await context.params;
  const run = await getRun(contentId) ?? await getLatestRun(contentId);
  if (!run) return Response.json({ error: "Audit trail not found." }, { status: 404 });
  return Response.json({
    contentId: run.contentId,
    runId: run.id,
    version: run.version,
    audit: run.audit,
  });
}
