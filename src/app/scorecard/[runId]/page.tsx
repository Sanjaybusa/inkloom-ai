"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  BarChart2,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Filter,
  Zap,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  Layers,
  Grid,
  List,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Building2,
  Scale,
  Lock,
  UserCheck,
  Archive,
  BadgeCheck,
  X,
  Code2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DiffView } from "@/components/ui/diff-view";
import { JudgeScorecard } from "@/components/ui/judge-scorecard";

interface Regulation {
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
    regulation: Regulation;
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

const FRAMEWORK_COLORS: Record<string, string> = {
  GDPR: "bg-blue-500",
  SOC2: "bg-emerald-500",
  ISO27001: "bg-violet-500",
  CCPA: "bg-amber-500",
  HIPAA: "bg-rose-500",
  Custom: "bg-slate-500",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  GDPR: "EU GDPR",
  SOC2: "SOC 2",
  ISO27001: "ISO 27001",
  CCPA: "CA CCPA",
  HIPAA: "HIPAA",
  Custom: "Internal Policy",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  compliant: { label: "Compliant", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, bg: "bg-emerald-50" },
  "non-compliant": { label: "Non-Compliant", color: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle, bg: "bg-rose-50" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle, bg: "bg-amber-50" },
  "not-applicable": { label: "N/A", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Minus, bg: "bg-slate-50" },
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-rose-500",
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-slate-500",
};

const RISK_COLORS: Record<string, string> = {
  Critical: "bg-rose-500",
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-blue-500",
};

export default function ScorecardPage({ params }: { params: Promise<{ runId: string }> }) {
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRegulation, setExpandedRegulation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "regulations" | "heatmap" | "evidence" | "audit">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "markdown" | "pdf">("markdown");
  const [runId, setRunId] = useState<string>("");

  useEffect(() => {
    const fetchScorecard = async () => {
      try {
        const { runId: resolvedRunId } = await params;
        setRunId(resolvedRunId);
        const response = await fetch(`/api/scorecard/${resolvedRunId}`);
        if (!response.ok) throw new Error("Failed to fetch scorecard");
        const data = await response.json();
        setScorecard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load scorecard");
      } finally {
        setLoading(false);
      }
    };
    fetchScorecard();
  }, [params]);

  const handleExport = async () => {
    try {
      if (!runId) return;
      const response = await fetch(`/api/scorecard/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: runId, format: exportFormat }),
      });

      if (!response.ok) throw new Error("Export failed");

      if (exportFormat === "markdown") {
        const text = await response.text();
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `compliance-package-${runId}.md`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `compliance-scorecard-${runId}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }

      setShowExportModal(false);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-blue-600"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <p className="text-slate-500">Loading compliance scorecard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-4">
          <AlertTriangle className="mx-auto text-rose-500" size={48} />
          <h2 className="text-xl font-bold">Failed to load scorecard</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!scorecard) return null;

  const frameworks = [...new Set(scorecard.regulations.map((r) => r.regulation.framework))];

  const filteredRegulations = scorecard.regulations.filter((r) => {
    const matchesSearch =
      r.regulation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.regulation.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.regulation.article.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFramework = frameworkFilter === "all" || r.regulation.framework === frameworkFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesFramework && matchesStatus;
  });

  const stats = {
    compliant: scorecard.regulations.filter((r) => r.status === "compliant").length,
    "non-compliant": scorecard.regulations.filter((r) => r.status === "non-compliant").length,
    partial: scorecard.regulations.filter((r) => r.status === "partial").length,
    "not-applicable": scorecard.regulations.filter((r) => r.status === "not-applicable").length,
  };

  const criticalRisks = scorecard.riskHeatmap.filter((r) => r.riskLevel === "Critical").length;
  const highRisks = scorecard.riskHeatmap.filter((r) => r.riskLevel === "High").length;

  const gradeColors: Record<string, string> = {
    "A+": "bg-emerald-500",
    A: "bg-emerald-600",
    "B+": "bg-teal-500",
    B: "bg-blue-500",
    "C+": "bg-amber-500",
    C: "bg-amber-600",
    D: "bg-orange-500",
    F: "bg-rose-500",
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      {/* Demo Banner */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center"
      >
        <div className="max-w-[1500px] mx-auto flex items-center justify-center gap-3 text-xs font-semibold text-amber-800 flex-wrap">
          <Sparkles size={14} />
          <span>🏆 Compliance Scorecard — Regulation-mapped findings, evidence packages, audit readiness</span>
          <span className="font-mono">Overall: {scorecard.overallScore}/100 (Grade {scorecard.grade})</span>
        </div>
      </motion.div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
              <Scale size={22} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
              <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">COMPLIANCE SCORECARD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {runId}
            </span>
            <motion.button
              onClick={() => setShowExportModal(true)}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Download size={14} /> Export Package
            </motion.button>
            <a
              href={`/workspace?run=${runId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ExternalLink size={14} /> Workspace
            </a>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-[76px] z-20 border-b border-slate-200 bg-white px-4 py-2 md:px-8">
        <div className="mx-auto max-w-[1500px] flex items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Target },
            { id: "regulations", label: "Regulations", icon: Scale },
            { id: "heatmap", label: "Risk Heatmap", icon: Layers },
            { id: "evidence", label: "Evidence", icon: BadgeCheck },
            { id: "audit", label: "Audit Readiness", icon: Archive },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setViewMode(tab.id as typeof viewMode)}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  viewMode === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
        {/* Hero Score Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101b35] via-blue-900 to-blue-800 text-white p-6 md:p-8 shadow-xl"
        >
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
                className={`w-24 h-24 rounded-2xl flex items-center justify-center ${gradeColors[scorecard.grade]} shadow-2xl`}
              >
                <span className="text-3xl font-bold tracking-tight">{scorecard.grade}</span>
              </motion.div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">Overall Compliance Score</p>
                <p className="text-4xl md:text-5xl font-bold tracking-tight">{scorecard.overallScore}/100</p>
                <p className="mt-1 text-sm text-slate-300 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scorecard.trend === "improving" ? "bg-emerald-500/20 text-emerald-300" : scorecard.trend === "declining" ? "bg-rose-500/20 text-rose-300" : "bg-slate-500/20 text-slate-300"}`}>
                    {scorecard.trend === "improving" && <TrendingUp size={12} className="inline" />}
                    {scorecard.trend === "declining" && <TrendingDown size={12} className="inline" />}
                    {scorecard.trend === "stable" && <Minus size={12} className="inline" />}
                    {scorecard.trend.charAt(0).toUpperCase() + scorecard.trend.slice(1)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
              <motion.button
                onClick={() => setShowExportModal(true)}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold border border-white/20 hover:bg-white/20 transition"
              >
                <Download size={16} /> Export Evidence Package
              </motion.button>
              <motion.a
                href={`/verify/${runId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-[#101b35] hover:bg-emerald-400 transition"
              >
                <Shield size={16} /> Public Verification
              </motion.a>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                <QRCodeSVG value={`${window.location.origin}/verify/${runId}`} size={64} includeMargin={true} />
                <span className="text-[10px] text-slate-400 hidden sm:block">Scan to verify</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: "Compliant", value: stats.compliant, color: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2 },
              { label: "Non-Compliant", value: stats["non-compliant"], color: "bg-rose-500/20 text-rose-300", icon: XCircle },
              { label: "Partial", value: stats.partial, color: "bg-amber-500/20 text-amber-300", icon: AlertCircle },
              { label: "Critical Risks", value: criticalRisks, color: "bg-red-500/20 text-red-300", icon: AlertTriangle },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={`rounded-xl p-4 border ${stat.color} border-current/20`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
                  <stat.icon className="text-current" size={18} />
                </div>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {viewMode === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Framework Breakdown */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Compliance by Framework</h2>
                    <p className="text-sm text-slate-500">Breakdown of regulation coverage across frameworks</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {frameworks.map((framework, i) => {
                    const regs = scorecard.regulations.filter((r) => r.regulation.framework === framework);
                    const compliant = regs.filter((r) => r.status === "compliant").length;
                    const total = regs.length;
                    const score = total > 0 ? Math.round((compliant / total) * 100) : 100;
                    return (
                      <motion.div
                        key={framework}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl border border-slate-200 p-5 hover:border-blue-300 transition"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${FRAMEWORK_COLORS[framework]} text-white`}>
                            {FRAMEWORK_LABELS[framework]}
                          </span>
                          <span className="text-2xl font-bold text-slate-900">{score}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + i * 0.05, type: "spring" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: FRAMEWORK_COLORS[framework] }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{compliant}/{total} regulations compliant</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>

              {/* Risk Heatmap Preview */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Risk Heatmap</h2>
                    <p className="text-sm text-slate-500">High-priority regulatory gaps requiring attention</p>
                  </div>
                  <motion.button
                    onClick={() => setViewMode("heatmap")}
                    whileTap={{ scale: 0.98 }}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View full heatmap <ChevronRight size={14} />
                  </motion.button>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 p-3">
                    <div>Framework</div>
                    <div>Article</div>
                    <div>Risk Level</div>
                    <div>Findings</div>
                  </div>
                  {scorecard.riskHeatmap.slice(0, 5).map((risk, i) => (
                    <motion.div
                      key={`${risk.framework}-${risk.article}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`grid grid-cols-4 border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${RISK_COLORS[risk.riskLevel]}`} />
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${FRAMEWORK_COLORS[risk.framework]} text-white`}>
                          {FRAMEWORK_LABELS[risk.framework]}
                        </span>
                      </div>
                      <div className="font-mono text-sm text-slate-700">{risk.article}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${RISK_COLORS[risk.riskLevel]} text-white`}>
                          {risk.riskLevel}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-700">{risk.count}</div>
                    </motion.div>
                  ))}
                  {scorecard.riskHeatmap.length > 5 && (
                    <div className="p-3 text-center text-sm text-slate-500 border-t border-slate-100">
                      +{scorecard.riskHeatmap.length - 5} more risks — <motion.button onClick={() => setViewMode("heatmap")} className="text-blue-600 hover:underline font-semibold">View all</motion.button>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Evidence Coverage */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Evidence Coverage</h2>
                    <p className="text-sm text-slate-500">Approved evidence records backing compliance claims</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total Evidence", value: scorecard.evidencePackage.totalEvidence, icon: BadgeCheck, color: "bg-blue-50 text-blue-600" },
                    { label: "Approved", value: scorecard.evidencePackage.approvedEvidence, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
                    { label: "Deprecated", value: scorecard.evidencePackage.deprecatedEvidence, icon: Archive, color: "bg-amber-50 text-amber-600" },
                    { label: "Categories Covered", value: Object.keys(scorecard.evidencePackage.coverageByCategory).length, icon: Grid, color: "bg-violet-50 text-violet-600" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        className="rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-500">{stat.label}</p>
                          <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
                        </div>
                        <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Coverage by Category */}
                <div className="mt-6">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Evidence-Backed Findings by Category</h3>
                  <div className="space-y-3">
                    {Object.entries(scorecard.evidencePackage.coverageByCategory).map(([category, count]) => (
                      <motion.div
                        key={category}
                        className="flex items-center gap-3"
                      >
                        <div className="w-40 text-xs font-medium text-slate-600">{category}</div>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (count / 5) * 100)}%` }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-semibold text-slate-700">{count}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}

          {viewMode === "regulations" && (
            <motion.div
              key="regulations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search regulations by name, article, or description..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={frameworkFilter}
                      onChange={(e) => setFrameworkFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="all">All Frameworks</option>
                      {frameworks.map((f) => (
                        <option key={f} value={f}>{FRAMEWORK_LABELS[f]}</option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="compliant">Compliant</option>
                      <option value="non-compliant">Non-Compliant</option>
                      <option value="partial">Partial</option>
                      <option value="not-applicable">N/A</option>
                    </select>
                  </div>
                </div>
              </motion.section>

              {/* Regulations Table */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-8"></th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Regulation</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Framework</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Severity</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Findings</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Evidence</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Trend</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500 pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence mode="popLayout">
                        {filteredRegulations.map((reg, index) => (
                          <motion.tr
                            key={reg.regulation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className={expandedRegulation === reg.regulation.id ? "bg-blue-50/50" : "hover:bg-slate-50/50"}
                          >
                            <td className="px-5 py-4">
                              <motion.button
                                onClick={() => setExpandedRegulation(expandedRegulation === reg.regulation.id ? null : reg.regulation.id)}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded hover:bg-slate-100"
                              >
                                {expandedRegulation === reg.regulation.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </motion.button>
                            </td>
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-medium text-slate-900">{reg.regulation.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{reg.regulation.article}</p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${FRAMEWORK_COLORS[reg.regulation.framework]} text-white`}>
                                {FRAMEWORK_LABELS[reg.regulation.framework]}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${SEVERITY_COLORS[reg.regulation.severity]} text-white`}>
                                {reg.regulation.severity}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {(() => {
                                const statusConfig = STATUS_CONFIG[reg.status];
                                return (
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${statusConfig.color}`}>
                                    <statusConfig.icon size={10} />
                                    {statusConfig.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">{reg.findingsCount}</span>
                                {reg.highFindings > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700">{reg.highFindings} High</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{reg.evidenceCount}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${
                                reg.trend === "improving" ? "bg-emerald-100 text-emerald-700" :
                                reg.trend === "declining" ? "bg-rose-100 text-rose-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {reg.trend === "improving" && <TrendingUp size={10} className="inline" />}
                                {reg.trend === "declining" && <TrendingDown size={10} className="inline" />}
                                {reg.trend === "stable" && <Minus size={10} className="inline" />}
                                {reg.trend.charAt(0).toUpperCase() + reg.trend.slice(1)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <motion.button
                                  onClick={() => navigator.clipboard.writeText(reg.regulation.id)}
                                  whileTap={{ scale: 0.9 }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                  title="Copy regulation ID"
                                >
                                  <Copy size={12} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Expanded Row Details */}
                <AnimatePresence>
                  {filteredRegulations.map((reg) =>
                    expandedRegulation === reg.regulation.id ? (
                      <motion.tr
                        key={`expanded-${reg.regulation.id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <td colSpan={9} className="px-5 pb-5">
                          <div className="ml-10 mr-5 pt-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl p-5">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <div className="md:col-span-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
                                <p className="mt-1 text-sm text-slate-700">{reg.regulation.description}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Details</p>
                                <dl className="mt-1 space-y-1 text-sm">
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Status:</dt><dd className="font-medium">{STATUS_CONFIG[reg.status].label}</dd></div>
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Findings:</dt><dd className="font-mono text-slate-700">{reg.findingsCount} total, {reg.highFindings} high</dd></div>
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Evidence:</dt><dd className="font-mono text-slate-700">{reg.evidenceCount} records</dd></div>
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Last Checked:</dt><dd className="text-slate-700">{new Date(reg.lastChecked).toLocaleString()}</dd></div>
                                </dl>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Regulation Info</p>
                                <dl className="mt-1 space-y-1 text-sm">
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Framework:</dt><dd className="font-medium">{FRAMEWORK_LABELS[reg.regulation.framework]}</dd></div>
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Article:</dt><dd className="font-mono text-slate-700">{reg.regulation.article}</dd></div>
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Severity:</dt><dd className="font-medium text-slate-700">{reg.regulation.severity}</dd></div>
                                  <div className="flex gap-4"><dt className="text-slate-500 w-28">Trend:</dt><dd className="font-medium">{reg.trend}</dd></div>
                                </dl>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ) : null
                  )}
                </AnimatePresence>
              </motion.section>
            </motion.div>
          )}

          {viewMode === "heatmap" && (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Risk Heatmap</h2>
                    <p className="text-sm text-slate-500">Visual prioritization of regulatory gaps by severity and framework</p>
                  </div>
                </div>

                {/* Matrix View */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr] border-b border-slate-200 bg-slate-50">
                    <div className="p-3 text-xs font-semibold text-slate-500">Framework</div>
                    <div className="grid grid-cols-4 gap-1 p-3">
                      {["Critical", "High", "Medium", "Low"].map((level) => (
                        <div key={level} className="text-center text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: RISK_COLORS[level], color: "white" }}>
                          {level}
                        </div>
                      ))}
                    </div>
                  </div>
                  {frameworks.map((framework) => {
                    const risks = scorecard.riskHeatmap.filter((r) => r.framework === framework);
                    return (
                      <div key={framework} className="grid grid-cols-[auto_1fr] border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center p-3 border-r border-slate-100">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${FRAMEWORK_COLORS[framework]} text-white`}>
                            {FRAMEWORK_LABELS[framework]}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 p-3">
                          {["Critical", "High", "Medium", "Low"].map((level) => {
                            const risk = risks.find((r) => r.riskLevel === level);
                            const count = risk?.count ?? 0;
                            return (
                              <motion.div
                                key={level}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className={`relative aspect-square rounded-lg flex items-center justify-center ${count > 0 ? RISK_COLORS[level] : "bg-slate-100"} transition-colors`}
                              >
                                {count > 0 ? (
                                  <>
                                    <span className="text-white font-bold text-lg">{count}</span>
                                    <div className="absolute bottom-1 right-1 text-[8px] text-white/80">{risk?.article}</div>
                                  </>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed List */}
                <div className="mt-6">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Risk Details</h3>
                  <div className="space-y-3">
                    {scorecard.riskHeatmap.map((risk, i) => (
                      <motion.div
                        key={`${risk.framework}-${risk.article}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50/50 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${RISK_COLORS[risk.riskLevel]}`}>
                            <span className="text-white font-bold text-xl">{risk.count}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{risk.framework} {risk.article}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${RISK_COLORS[risk.riskLevel]} text-white`}>
                                {risk.riskLevel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{risk.count} finding{risk.count !== 1 ? "s" : ""} requiring attention</p>
                          </div>
                        </div>
                        <motion.button
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          Investigate <ChevronRight size={14} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}

          {viewMode === "evidence" && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Evidence Package</h2>
                    <p className="text-sm text-slate-500">Approved evidence records supporting compliance claims</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  {[
                    { label: "Total Records", value: scorecard.evidencePackage.totalEvidence, icon: BadgeCheck, color: "bg-blue-50 text-blue-600" },
                    { label: "Approved", value: scorecard.evidencePackage.approvedEvidence, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
                    { label: "Deprecated", value: scorecard.evidencePackage.deprecatedEvidence, icon: Archive, color: "bg-amber-50 text-amber-600" },
                    { label: "Categories", value: Object.keys(scorecard.evidencePackage.coverageByCategory).length, icon: Grid, color: "bg-violet-50 text-violet-600" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div key={stat.label} className="rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-500">{stat.label}</p>
                          <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
                        </div>
                        <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-slate-700">Coverage by Category</h3>
                  {Object.entries(scorecard.evidencePackage.coverageByCategory).map(([category, count]) => (
                    <motion.div
                      key={category}
                      className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <BadgeCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{category}</p>
                          <p className="text-xs text-slate-500">{count} evidence-backed findings</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (count / 5) * 100)}%` }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-semibold text-slate-700">{count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Evidence Inventory Placeholder */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Evidence Inventory</h3>
                  <span className="text-xs text-slate-500">15 records in demo mode</span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Version</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { id: "claim-policy-superlatives", category: "Claim verification", source: "Claim Policy 3.2", version: "1.0", status: "Approved" },
                        { id: "northwind-integrations", category: "Fact verification", source: "Northwind Product Fact Sheet", version: "v3.2", status: "Approved" },
                        { id: "northwind-terminology", category: "Brand consistency", source: "Northwind Brand Guide", version: "7.1", status: "Approved" },
                        { id: "wcag-contrast", category: "Accessibility", source: "WCAG 2.2", version: "1.4.3", status: "Approved" },
                        { id: "wcag-alt-text", category: "Accessibility", source: "WCAG 2.2", version: "1.1.1", status: "Approved" },
                      ].map((ev, i) => (
                        <tr key={ev.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{ev.id}</td>
                          <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200">{ev.category}</span></td>
                          <td className="px-4 py-3 text-sm text-slate-700">{ev.source}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{ev.version}</td>
                          <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 size={10} />{ev.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            </motion.div>
          )}

          {viewMode === "audit" && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-lg">Audit Readiness</h2>
                    <p className="text-sm text-slate-500">Preparedness for external compliance audits</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  {[
                    { label: "Audit Score", value: `${scorecard.auditReadiness.score}/100`, icon: Target, color: "bg-blue-50 text-blue-600" },
                    { label: "Missing Artifacts", value: scorecard.auditReadiness.missingArtifacts.length, icon: AlertTriangle, color: "bg-rose-50 text-rose-600" },
                    { label: "Last Audit", value: scorecard.auditReadiness.lastAudit ? new Date(scorecard.auditReadiness.lastAudit).toLocaleDateString() : "Never", icon: Clock, color: "bg-amber-50 text-amber-600" },
                    { label: "Next Due", value: scorecard.auditReadiness.nextAuditDue ? new Date(scorecard.auditReadiness.nextAuditDue).toLocaleDateString() : "Not scheduled", icon: Calendar, color: "bg-emerald-50 text-emerald-600" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div key={stat.label} className="rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-500">{stat.label}</p>
                          <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
                        </div>
                        <p className="mt-4 text-2xl font-bold">{stat.value}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Missing Artifacts */}
                {scorecard.auditReadiness.missingArtifacts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                      <AlertTriangle className="text-rose-500" size={16} />
                      Missing Artifacts (Blockers for Audit)
                    </h3>
                    {scorecard.auditReadiness.missingArtifacts.map((artifact, i) => (
                      <motion.div
                        key={artifact}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <AlertCircle className="text-rose-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-rose-800">{artifact}</p>
                            <p className="text-xs text-rose-600">High-severity finding without supporting evidence</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-semibold bg-rose-100 text-rose-700">Blocker</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Audit Checklist */}
                <div className="mt-6 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-700">Audit Readiness Checklist</h3>
                  {[
                    { item: "All high-severity findings have evidence", done: scorecard.auditReadiness.missingArtifacts.length === 0 },
                    { item: "Evidence records are current and approved", done: scorecard.evidencePackage.deprecatedEvidence === 0 },
                    { item: "Governance runs have complete audit trails", done: true },
                    { item: "Reviewer decisions are documented", done: true },
                    { item: "Trust Passports generated for all campaigns", done: true },
                    { item: "Regulation mapping is complete", done: true },
                    { item: "Risk heatmap reviewed and acknowledged", done: true },
                    { item: "Evidence package exported and archived", done: false },
                  ].map((check, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${check.done ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                          {check.done && <Check className="text-white text-xs" size={12} />}
                        </div>
                        <p className="text-sm text-slate-700">{check.item}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded ${check.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {check.done ? "Ready" : "Pending"}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">Export Compliance Package</h2>
                <motion.button onClick={() => setShowExportModal(false)} whileTap={{ scale: 0.9 }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><XCircle size={20} /></motion.button>
              </div>
              <p className="text-sm text-slate-500 mb-6">Choose format for the compliance evidence package. Markdown includes human-readable report; JSON for programmatic use.</p>
              <div className="space-y-3 mb-6">
                {[
                  { value: "markdown", label: "Markdown Report", desc: "Human-readable compliance report with regulation status, risk heatmap, and evidence inventory", icon: FileText },
                  { value: "json", label: "JSON Data", desc: "Structured data for API integration and automated processing", icon: Code2 },
                  { value: "pdf", label: "PDF (Coming Soon)", desc: "Formatted PDF document for executive sharing", icon: FileText, disabled: true },
                ].map((opt) => (
                  <motion.button
                    key={opt.value}
                    onClick={() => !opt.disabled && setExportFormat(opt.value as typeof exportFormat)}
                    disabled={opt.disabled}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                      exportFormat === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <opt.icon className={`w-8 h-8 rounded-lg flex items-center justify-center ${exportFormat === opt.value ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"}`} size={20} />
                    <div>
                      <p className="font-semibold text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                    {exportFormat === opt.value && <CheckCircle2 className="ml-auto text-blue-500" size={20} />}
                  </motion.button>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <motion.button onClick={() => setShowExportModal(false)} whileTap={{ scale: 0.98 }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</motion.button>
                <motion.button onClick={handleExport} whileTap={{ scale: 0.98 }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  <Download size={14} className="inline mr-1" /> Export {exportFormat === "markdown" ? ".md" : ".json"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}