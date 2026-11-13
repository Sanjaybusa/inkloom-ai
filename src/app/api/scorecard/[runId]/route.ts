import { NextRequest, NextResponse } from "next/server";
import { getRun } from "@/lib/governance-store";
import type { Finding } from "@/lib/governance";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

interface RegulationMapping {
  id: string;
  name: string;
  framework: "GDPR" | "SOC2" | "ISO27001" | "CCPA" | "HIPAA" | "Custom";
  article: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
}

interface ScorecardData {
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  trend: "improving" | "stable" | "declining";
  regulations: Array<{
    regulation: RegulationMapping;
    status: "compliant" | "non-compliant" | "partial" | "not-applicable";
    findingsCount: number;
    highFindings: number;
    evidenceCount: number;
    lastChecked: string;
    trend: "improving" | "stable" | "declining";
  }>;
  riskHeatmap: Array<{
    framework: string;
    article: string;
    riskLevel: "Critical" | "High" | "Medium" | "Low";
    count: number;
  }>;
  evidencePackage: {
    totalEvidence: number;
    approvedEvidence: number;
    deprecatedEvidence: number;
    coverageByCategory: Record<string, number>;
  };
  auditReadiness: {
    score: number;
    missingArtifacts: string[];
    lastAudit: string | null;
    nextAuditDue: string | null;
  };
}

const REGULATIONS: RegulationMapping[] = [
  { id: "gdpr-art5", name: "GDPR Article 5", framework: "GDPR", article: "Art. 5", description: "Lawfulness, fairness, and transparency", severity: "Critical" },
  { id: "gdpr-art6", name: "GDPR Article 6", framework: "GDPR", article: "Art. 6", description: "Lawful basis for processing", severity: "Critical" },
  { id: "gdpr-art7", name: "GDPR Article 7", framework: "GDPR", article: "Art. 7", description: "Conditions for consent", severity: "High" },
  { id: "gdpr-art12", name: "GDPR Article 12", framework: "GDPR", article: "Art. 12", description: "Transparent information", severity: "High" },
  { id: "gdpr-art25", name: "GDPR Article 25", framework: "GDPR", article: "Art. 25", description: "Data protection by design and default", severity: "High" },
  { id: "gdpr-art32", name: "GDPR Article 32", framework: "GDPR", article: "Art. 32", description: "Security of processing", severity: "Critical" },
  { id: "soc2-cc6", name: "SOC 2 CC6.1", framework: "SOC2", article: "CC6.1", description: "Logical access security measures", severity: "Critical" },
  { id: "soc2-cc7", name: "SOC 2 CC7.2", framework: "SOC2", article: "CC7.2", description: "System monitoring", severity: "High" },
  { id: "iso-a8", name: "ISO 27001 A.8", framework: "ISO27001", article: "A.8", description: "Asset management", severity: "High" },
  { id: "iso-a12", name: "ISO 27001 A.12", framework: "ISO27001", article: "A.12", description: "Operations security", severity: "High" },
  { id: "ccpa-1798", name: "CCPA §1798.100", framework: "CCPA", article: "§1798.100", description: "Right to know", severity: "High" },
  { id: "custom-claims", name: "Claim Verification Policy", framework: "Custom", article: "CP-3.2", description: "Superlatives require third-party evidence", severity: "High" },
  { id: "custom-brand", name: "Brand Consistency Policy", framework: "Custom", article: "BP-7.1", description: "Approved terminology usage", severity: "Medium" },
  { id: "custom-a11y", name: "Accessibility Policy", framework: "Custom", article: "AP-1.4.3", description: "WCAG 2.2 contrast requirements", severity: "High" },
];

function calculateScore(findings: Finding[], regulations: RegulationMapping[] = []): number {
  if (findings.length === 0) return 100;

  let score = 100;
  const criticalFindings = findings.filter(f => f.severity === "High").length;
  const highFindings = findings.filter(f => f.severity === "Medium").length;
  const mediumFindings = findings.filter(f => f.severity === "Low").length;
  const regulationPenalty = Math.max(0, regulations.length - 10) * 0.5;

  score -= criticalFindings * 15;
  score -= highFindings * 8;
  score -= mediumFindings * 3;
  score -= regulationPenalty;

  return Math.max(0, Math.min(100, score));
}

function getGrade(score: number): "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F" {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "B+";
  if (score >= 87) return "B";
  if (score >= 83) return "C+";
  if (score >= 80) return "C";
  if (score >= 70) return "D";
  return "F";
}

interface RegulationWithStatus {
  regulation: RegulationMapping;
  status: "compliant" | "non-compliant" | "partial" | "not-applicable";
  findingsCount: number;
  highFindings: number;
  evidenceCount: number;
  lastChecked: string;
  trend: "improving" | "stable" | "declining";
}

function mapFindingsToRegulations(findings: Finding[], regulations: RegulationMapping[]): RegulationWithStatus[] {
  return regulations.map((reg) => {
    // Map findings to regulations based on category/keywords
    const relevantFindings = findings.filter((f) => {
      const text = `${f.title} ${f.category} ${f.explanation}`.toLowerCase();
      const keywords = reg.description.toLowerCase().split(" ");
      return keywords.some((k) => k.length > 3 && text.includes(k));
    });

    const highFindings = relevantFindings.filter((f) => f.severity === "High").length;
    const totalFindings = relevantFindings.length;

    let status: "compliant" | "non-compliant" | "partial" | "not-applicable" = "compliant";
    if (totalFindings === 0) status = "compliant";
    else if (highFindings > 0) status = "non-compliant";
    else if (totalFindings > 0) status = "partial";

    return {
      regulation: reg,
      status,
      findingsCount: totalFindings,
      highFindings,
      evidenceCount: relevantFindings.filter((f) => f.evidenceId).length,
      lastChecked: new Date().toISOString(),
      trend: "stable" as const,
    };
  });
}

function buildRiskHeatmap(regulationsWithStatus: RegulationWithStatus[]) {
  return regulationsWithStatus
    .filter((r) => r.status !== "compliant")
    .map((r) => ({
      framework: r.regulation.framework,
      article: r.regulation.article,
      riskLevel: (r.highFindings > 0 ? "Critical" : r.status === "non-compliant" ? "High" : "Medium") as "Critical" | "High" | "Medium" | "Low",
      count: r.findingsCount,
    }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const run = await getRun(runId);

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const findings = run.findings || [];
    const regulationsWithStatus = mapFindingsToRegulations(findings, REGULATIONS);
    const overallScore = calculateScore(findings, REGULATIONS);
    const grade = getGrade(overallScore);
    const riskHeatmap = buildRiskHeatmap(regulationsWithStatus);

    // Evidence coverage
    const categories = [...new Set(findings.map((f) => f.category))];
    const coverageByCategory: Record<string, number> = {};
    categories.forEach((cat) => {
      coverageByCategory[cat] = findings.filter((f) => f.category === cat && f.evidenceId).length;
    });

    const scorecard: ScorecardData = {
      overallScore,
      grade,
      trend: "stable",
      regulations: regulationsWithStatus,
      riskHeatmap,
      evidencePackage: {
        totalEvidence: 15, // From demo data
        approvedEvidence: 15,
        deprecatedEvidence: 0,
        coverageByCategory,
      },
      auditReadiness: {
        score: overallScore,
        missingArtifacts: findings.filter((f) => f.severity === "High" && !f.evidenceId).map((f) => f.title),
        lastAudit: run.analyzedAt,
        nextAuditDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error("Scorecard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "scorecard" });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: createRateLimitHeaders(rateLimit) });
  }

  try {
    const body = await request.json();
    const { contentId, format = "json" } = body;

    // Generate compliance evidence package
    const run = await getRun(contentId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const scorecardUrl = `${request.nextUrl.origin}/api/scorecard/${run.id}`;
    const scorecardResponse = await fetch(scorecardUrl);
    const scorecard = (await scorecardResponse.json()) as ScorecardData;

    if (format === "markdown") {
      const lines = [
        "# Compliance Evidence Package",
        "",
        `Campaign: ${run.campaignTitle}`,
        `Run: ${run.id}`,
        `Generated: ${new Date().toISOString()}`,
        `Overall Score: ${scorecard.overallScore}/100 (Grade: ${scorecard.grade})`,
        "",
        "## Regulation Compliance Status",
        "",
        ...scorecard.regulations.map((r) => [
          `### ${r.regulation.name} (${r.regulation.framework} ${r.regulation.article})`,
          `Status: ${r.status}`,
          `Findings: ${r.findingsCount} (High: ${r.highFindings})`,
          `Evidence: ${r.evidenceCount}`,
          "",
        ]).flat(),
        "## Risk Heatmap",
        "",
        ...scorecard.riskHeatmap.map((r) => `- **${r.framework} ${r.article}**: ${r.riskLevel} (${r.count} findings)`),
        "",
        "## Evidence Inventory",
        "",
        `Total Evidence Records: ${scorecard.evidencePackage.totalEvidence}`,
        `Approved: ${scorecard.evidencePackage.approvedEvidence}`,
        `Deprecated: ${scorecard.evidencePackage.deprecatedEvidence}`,
        "",
        "### Coverage by Category",
        ...Object.entries(scorecard.evidencePackage.coverageByCategory).map(([cat, count]) => `- ${cat}: ${count} evidence-backed findings`),
        "",
        "## Audit Readiness",
        "",
        `Score: ${scorecard.auditReadiness.score}/100`,
        `Last Audit: ${scorecard.auditReadiness.lastAudit}`,
        `Next Audit Due: ${scorecard.auditReadiness.nextAuditDue}`,
        scorecard.auditReadiness.missingArtifacts.length > 0
          ? ["Missing Artifacts:", ...scorecard.auditReadiness.missingArtifacts.map((a: string) => `- ${a}`)]
          : "All high-priority findings have supporting evidence.",
        "",
      ];

      const markdown = lines.join("\n");
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${run.campaignTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-compliance-package.md"`,
        },
      });
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error("Evidence package error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}