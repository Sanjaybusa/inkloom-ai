import { getLatestRun, getRun } from "@/lib/governance-store";

export async function GET(_request: Request, context: RouteContext<"/api/content/[id]">) {
  const { id } = await context.params;
  const run = await getRun(id) ?? await getLatestRun(id);
  if (!run) return Response.json({ error: "Content not found." }, { status: 404 });
  return Response.json(run);
}
