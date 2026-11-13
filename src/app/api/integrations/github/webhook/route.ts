import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { evaluateContent } from "@/lib/rules-engine";
import { getApprovedEvidence } from "@/lib/governance-store";
import { saveRun } from "@/lib/governance-store";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";
    const event = request.headers.get("x-github-event") || "";

    // Verify webhook signature (skip in demo mode)
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && !verifySignature(payload, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(payload);

    // Handle pull_request events
    if (event === "pull_request") {
      const { action, pull_request, repository } = body;

      if (["opened", "synchronize", "reopened", "edited"].includes(action)) {
        // Extract changed files content (in production, fetch from GitHub API)
        const prTitle = pull_request.title;
        const prBody = pull_request.body || "";
        const prNumber = pull_request.number;
        const repoFullName = repository.full_name;

        // Combine PR title + body + changed files for governance check
        const content = `# ${prTitle}\n\n${prBody}\n\n---\n*Analyzing PR #${prNumber} in ${repoFullName}*`;
        const contentId = `github-pr-${repoFullName.replace("/", "-")}-${prNumber}`;

        // Get approved evidence
        const rawEvidence = await getApprovedEvidence();

        // Transform to format expected by evaluateContent
        const evidence = rawEvidence.map((e) => ({
          id: e.id,
          title: e.source,
          evidence: e.passage,
        }));

        // Evaluate
        const result = await evaluateContent(content, evidence);

        // Save governance run
        const run = await saveRun({
          id: `inkloom-github-${contentId}-${Date.now()}`,
          contentId,
          campaignTitle: `GitHub PR #${prNumber}: ${prTitle}`,
          campaignText: content,
          version: 1,
          status: "analyzed",
          analyzedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rulesVersion: "1.0",
          evidenceVersion: "northwind-demo-v2",
          claimsChecked: result.claimsChecked,
          findings: result.findings,
          review: { decision: null, reviewer: null, reason: null, decidedAt: null },
          audit: [
            {
              id: crypto.randomUUID?.() ?? `audit-${Date.now()}`,
              event: "integration_analyzed",
              actor: "github-integration",
              timestamp: new Date().toISOString(),
              details: { integration: "github", external_id: `${repoFullName}#${prNumber}`, action: "pr_analyzed" },
            },
          ],
          aiAssistance: false,
        });

        // Determine check conclusion
        const hasHigh = result.findings.some((f) => f.severity === "High");
        const conclusion = hasHigh ? "failure" : "success";

        // In production, post this as a check run via GitHub API
        return NextResponse.json({
          runId: run.id,
          conclusion,
          findings: result.findings.map((f) => ({
            id: f.id,
            severity: f.severity,
            title: f.title,
            explanation: f.explanation,
            recommendation: f.recommendation,
            claim: f.claim,
          })),
          summary: {
            total: result.findings.length,
            high: result.findings.filter((f) => f.severity === "High").length,
            medium: result.findings.filter((f) => f.severity === "Medium").length,
            low: result.findings.filter((f) => f.severity === "Low").length,
          },
          checkUrl: `/verify/${run.id}`,
        });
      }
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "GitHub webhook endpoint",
    events: ["pull_request"],
    demo: "Configure in GitHub repo settings > Webhooks",
  });
}