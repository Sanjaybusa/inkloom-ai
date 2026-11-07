"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Copy, CheckCircle2, AlertTriangle, Info, Download, ShieldCheck, BarChart2 } from "lucide-react";
import type { GovernanceRun, Finding } from "@/lib/governance";

interface Passport {
  campaignTitle: string;
  status: string;
  runId: string;
  claimsChecked: number;
  supported: number;
  outdated: number;
  unverified: number;
  accessibilityIssues: number;
  resolvedAccessibility: number;
  findingsCount: number;
  highPriorityFindings: number;
  reviewer: string | null;
  decision: string | null;
  reason: string | null;
  approvedAt: string | null;
  aiAssistance: string;
  rulesVersion: string;
  evidenceVersion: string;
  auditTrailComplete: boolean;
  auditEvents: number;
  generatedAt: string;
}

interface ScorecardData {
  name: string;
  value: number;
  fullMark: number;
}

export function JudgeScorecard({ run, passport }: { run: GovernanceRun; passport: Passport | null }) {
  const scoreData = useMemo((): ScorecardData[] => {
    const findings = run.findings;
    const totalFindings = findings.length;
    const highFindings = findings.filter((f) => f.severity === "High").length;
    const mediumFindings = findings.filter((f) => f.severity === "Medium").length;
    const lowFindings = findings.filter((f) => f.severity === "Low").length;
    const acceptedFindings = findings.filter((f) => f.action === "accept" || f.action === "edit").length;
    const disputedFindings = findings.filter((f) => f.action === "dispute").length;
    const unresolvedFindings = findings.filter((f) => !f.action).length;

    // Claim Accuracy: % of findings that are supported or resolved
    const supportedCount = findings.filter((f) => f.status === "Supported").length;
    const resolvedCount = acceptedFindings;
    const claimAccuracy = totalFindings > 0 ? Math.round(((supportedCount + resolvedCount) / (totalFindings * 2)) * 100) : 100;

    // Brand Compliance: based on brand violations
    const brandViolations = findings.filter((f) => f.status === "Brand violation").length;
    const brandCompliance = totalFindings > 0 ? Math.max(0, 100 - brandViolations * 20) : 100;

    // Accessibility: based on accessibility findings resolved
    const accessibilityFindings = findings.filter((f) => f.category === "Accessibility");
    const resolvedAccessibility = accessibilityFindings.length > 0
      ? Math.round((accessibilityFindings.filter((f) => f.action === "accept" || f.action === "edit").length / accessibilityFindings.length) * 100)
      : 100;

    // Evidence Coverage: % of findings with evidence
    const findingsWithEvidence = findings.filter((f) => f.evidenceId).length;
    const evidenceCoverage = totalFindings > 0 ? Math.round((findingsWithEvidence / totalFindings) * 100) : 100;

    // Review Completeness: based on review status
    let reviewCompleteness = 0;
    if (run.review.decision === "approved") reviewCompleteness = 100;
    else if (run.review.decision === "rejected" || run.review.decision === "changes_requested") reviewCompleteness = 75;
    else if (totalFindings > 0) reviewCompleteness = Math.round((resolvedCount / totalFindings) * 50);

    // Overall score
    const overallScore = Math.round(
      (claimAccuracy + brandCompliance + resolvedAccessibility + evidenceCoverage + reviewCompleteness) / 5
    );

    return [
      { name: "Claim Accuracy", value: claimAccuracy, fullMark: 100 },
      { name: "Brand Compliance", value: brandCompliance, fullMark: 100 },
      { name: "Accessibility", value: resolvedAccessibility, fullMark: 100 },
      { name: "Evidence Coverage", value: evidenceCoverage, fullMark: 100 },
      { name: "Review Complete", value: reviewCompleteness, fullMark: 100 },
    ];
  }, [run, passport]);

  const overallScore = useMemo(() => {
    return Math.round(scoreData.reduce((a, b) => a + b.value, 0) / scoreData.length);
  }, [scoreData]);

  const highCount = run.findings.filter((f) => f.severity === "High").length;
  const mediumCount = run.findings.filter((f) => f.severity === "Medium").length;
  const lowCount = run.findings.filter((f) => f.severity === "Low").length;

  const copyScoreJSON = () => {
    const json = {
      campaign: run.campaignTitle,
      runId: run.id,
      version: run.version,
      overallScore,
      breakdown: scoreData,
      findings: {
        total: run.findings.length,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      review: {
        decision: run.review.decision,
        reviewer: run.review.reviewer,
        reason: run.review.reason,
        decidedAt: run.review.decidedAt,
      },
      generatedAt: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
  };

  const downloadScorecard = () => {
    const json = {
      campaign: run.campaignTitle,
      runId: run.id,
      version: run.version,
      overallScore,
      breakdown: scoreData,
      findings: {
        total: run.findings.length,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      review: {
        decision: run.review.decision,
        reviewer: run.review.reviewer,
        reason: run.review.reason,
        decidedAt: run.review.decidedAt,
      },
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.campaignTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-scorecard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-50 border-emerald-200";
    if (score >= 60) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <BarChart2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Judge Scorecard</h3>
            <p className="text-xs text-slate-500">Deterministic scoring — every metric traceable to evidence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={copyScoreJSON}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Copy size={14} /> Copy JSON
          </motion.button>
          <motion.button
            onClick={downloadScorecard}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Download size={14} /> Download
          </motion.button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 rounded-2xl border {getScoreBg(overallScore)}"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Campaign Score</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="relative">
              <svg width={100} height={100}>
                <circle
                  cx={50}
                  cy={50}
                  r={45}
                  stroke="#e2e8f0"
                  strokeWidth={8}
                  fill="none"
                />
                <motion.circle
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * overallScore) / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  cx={50}
                  cy={50}
                  r={45}
                  stroke={getScoreColor(overallScore).replace("text-", "")}
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {overallScore >= 80 ? "✅ Ready for publication" : overallScore >= 60 ? "⚠️ Needs minor fixes" : "🚫 Requires major revision"}
          </p>
        </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-64"
        >
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="80%"
            data={scoreData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <PolarGrid gridType="polygon" radialLines={false} stroke="#e2e8f0" />
            <PolarAngleAxis tick={{ fontSize: 11, fill: "#64748b" }} />
            <PolarRadiusAxis
              angle={90}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              domain={[0, 100]}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={false}
            >
              {scoreData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#3b82f6" />
              ))}
            </Radar>
            <Radar
              name="Benchmark"
              dataKey="fullMark"
              stroke="#e2e8f0"
              fill="none"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </RadarChart>
        </motion.div>

        {/* Metric Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Breakdown</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {scoreData.map((metric, index) => (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className={`rounded-lg border p-4 text-center ${getScoreBg(metric.value)}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.name}</p>
                <p className={`mt-1 text-2xl font-bold ${getScoreColor(metric.value)}`}>{metric.value}%</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.05, ease: "easeOut" }}
                    className={`h-full rounded-full ${getScoreColor(metric.value).replace("text-", "bg-")}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Findings Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Findings Summary</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-100">
              <AlertTriangle className="text-rose-600" size={16} />
              <div>
                <p className="text-xs font-bold text-rose-700">{highCount} High Priority</p>
                <p className="text-[10px] text-rose-600">Require immediate attention</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100">
              <Info className="text-amber-600" size={16} />
              <div>
                <p className="text-xs font-bold text-amber-700">{mediumCount} Medium Priority</p>
                <p className="text-[10px] text-amber-600">Should be addressed</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100">
              <CheckCircle2 className="text-slate-600" size={16} />
              <div>
                <p className="text-xs font-bold text-slate-700">{lowCount} Low Priority</p>
                <p className="text-[10px] text-slate-600">Minor improvements</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="text-emerald-600" size={16} />
              <div>
                <p className="text-xs font-bold text-emerald-700">{run.findings.filter((f) => f.action).length} / {run.findings.length} Resolved</p>
                <p className="text-[10px] text-emerald-600">Findings with disposition</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Review Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Review Status</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decision</p>
              <p className="mt-1 text-lg font-bold capitalize">{run.review.decision ?? "Pending"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reviewer</p>
              <p className="mt-1 text-sm font-semibold">{run.review.reviewer ?? "Not recorded"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decided At</p>
              <p className="mt-1 text-sm font-semibold">{run.review.decidedAt ? new Date(run.review.decidedAt).toLocaleString() : "Not recorded"}</p>
            </div>
          </div>
          {run.review.reason && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p>
              <p className="mt-1 text-sm text-slate-600">{run.review.reason}</p>
            </div>
          )}
        </motion.div>

        {/* Key Differentiator Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <ShieldCheck size={20} />
            <span className="font-bold">Deterministic Governance Engine</span>
          </div>
          <p className="mt-2 text-xs text-blue-600">
            No AI hallucination risk • Every decision traceable to approved evidence • Audit trail cryptographically verifiable
          </p>
        </motion.div>
      </div>
    </div>
  );
}