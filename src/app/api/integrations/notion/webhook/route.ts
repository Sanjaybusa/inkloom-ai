import { NextRequest, NextResponse } from "next/server";
import { evaluateContent } from "@/lib/rules-engine";
import { getApprovedEvidence } from "@/lib/governance-store";
import { saveRun } from "@/lib/governance-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page_id, content, content_id, title } = body;

    if (!content || !content_id) {
      return NextResponse.json(
        { error: "content and content_id are required" },
        { status: 400 }
      );
    }

    // Get approved evidence for evaluation
    const rawEvidence = await getApprovedEvidence();

    // Transform to format expected by evaluateContent
    const evidence = rawEvidence.map((e) => ({
      id: e.id,
      title: e.source,
      evidence: e.passage,
    }));

    // Evaluate content against governance rules
    const result = await evaluateContent(content, evidence);

    // Save governance run
    const run = await saveRun({
      id: `inkloom-notion-${content_id}-${Date.now()}`,
      contentId: content_id,
      campaignTitle: title || `Notion Page: ${page_id}`,
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
          actor: "notion-integration",
          timestamp: new Date().toISOString(),
          details: { integration: "notion", external_id: page_id, action: "page_analyzed" },
        },
      ],
      aiAssistance: false,
    });

    // Return findings for Notion to display as comments
    return NextResponse.json({
      runId: run.id,
      status: run.status,
      findings: result.findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        recommendation: f.recommendation,
        evidence: f.evidence,
        claim: f.claim,
      })),
      summary: {
        total: result.findings.length,
        high: result.findings.filter((f) => f.severity === "High").length,
        medium: result.findings.filter((f) => f.severity === "Medium").length,
        low: result.findings.filter((f) => f.severity === "Low").length,
      },
    });
  } catch (error) {
    console.error("Notion webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Notion webhook endpoint",
    usage: "POST { page_id, content, content_id, title }",
    demo: "Use this endpoint from Notion automation or our demo page",
  });
}