"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  BarChart2,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  FileText,
  GitCompare,
  History,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  RotateCcw,
  Zap,
  QrCode,
  Eye,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Settings,
  Info,
  Filter,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DiffView } from "@/components/ui/diff-view";
import { JudgeScorecard } from "@/components/ui/judge-scorecard";
import { QRCodeSVG } from "qrcode.react";

import type { FindingStatus, FindingAction, ReviewDecision, Finding, AuditEntry, GovernanceRun } from "@/lib/governance";

type EvidenceRecord = {
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  approved: boolean;
  created_at: string;
};

type FindingRef = {
  findingId: string;
  findingTitle: string;
  severity: "High" | "Medium" | "Low";
};

const CATEGORIES = [
  "All",
  "Claim verification",
  "Fact verification",
  "Brand consistency",
  "Accessibility",
] as const;

type Passport = {
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
};

const sampleText = `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`;

const DEMO_STATES = {
  perfect: {
    text: sampleText,
    run: null as GovernanceRun | null,
  },
  rejected: {
    text: sampleText,
    run: null as GovernanceRun | null,
  },
  pending: {
    text: sampleText,
    run: null as GovernanceRun | null,
  },
  empty: {
    text: "",
    run: null as GovernanceRun | null,
  },
};

export default function Home() {
  const [text, setText] = useState(sampleText);
  const [run, setRun] = useState<GovernanceRun | null>(null);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("Demo Reviewer");
  const [reviewReason, setReviewReason] = useState("");
  const [editedFix, setEditedFix] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [demoMode, setDemoMode] = useState<keyof typeof DEMO_STATES | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "evidence" | "passport">("workspace");

  const findings = run?.findings ?? [];
  const selected = findings.find((f) => f.id === selectedId) ?? findings[0];
  const approved = run?.status === "approved";
  const hasRun = !!run;

  // URL parameter handling for demo states and deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo") as keyof typeof DEMO_STATES | null;
    const runId = params.get("run");
    const findingId = params.get("finding");
    const view = params.get("view");

    if (demo && DEMO_STATES[demo]) {
      setDemoMode(demo);
      applyDemoState(demo);
      return;
    }

    if (view === "passport" && runId) {
      fetch(`/api/passport/${runId}?format=json`)
        .then((r) => r.json())
        .then((data) => setPassport(data));
      return;
    }

    if (runId) {
      fetch(`/api/content/${runId}`)
        .then((r) => r.json())
        .then((data) => {
          setRun(data);
          setText(data.campaignText);
          setSelectedId(findingId || data.findings[0]?.id || null);
          setEditedFix(data.findings[0]?.recommendation || "");
          setReviewer(data.review.reviewer || "Demo Reviewer");
          setReviewReason(data.review.reason || "");
          refreshPassport(data.contentId);
        });
    } else {
      restoreLatestRun();
    }
  }, []);

  const restoreLatestRun = async () => {
    try {
      const response = await fetch("/api/content/northwind-q4");
      if (!response.ok) return;
      const restoredRun = await response.json() as GovernanceRun;
      setRun(restoredRun);
      setText(restoredRun.campaignText);
      setSelectedId(restoredRun.findings[0]?.id ?? null);
      setEditedFix(restoredRun.findings[0]?.recommendation ?? "");
      setReviewer(restoredRun.review.reviewer ?? "Demo Reviewer");
      setReviewReason(restoredRun.review.reason ?? "");
      await refreshPassport(restoredRun.contentId);
    } catch (error) {
      console.error("Unable to restore latest run", error);
    }
  };

  const applyDemoState = async (demo: keyof typeof DEMO_STATES) => {
    setAnalyzing(true);
    try {
      if (demo === "perfect") {
        // Create a perfect run: all findings accepted, approved
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, contentId: "northwind-q4" }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Analysis failed.");

        // Accept all findings - use updated version from each response
        let currentVersion = data.version;
        for (const finding of data.findings) {
          const response = await fetch(`/api/findings/${finding.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: data.id, action: "accept", version: currentVersion }),
          });
          const result = await response.json();
          if (result.version !== undefined) currentVersion = result.version;
        }

        // Approve
        const reviewResponse = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: data.id, decision: "approved", reviewer: "Demo Reviewer", reason: "All claims verified", version: currentVersion }),
        });
        const finalRun = await reviewResponse.json();
        setRun(finalRun);
        setSelectedId(finalRun.findings[0]?.id ?? null);
        setEditedFix(finalRun.findings[0]?.recommendation ?? "");
        await refreshPassport(finalRun.contentId);
        showToast("Perfect demo loaded!", "success");
      } else if (demo === "rejected") {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, contentId: "northwind-q4" }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Analysis failed.");

        await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: data.id, decision: "rejected", reviewer: "Demo Reviewer", reason: "Critical claims unsupported", version: data.version }),
        });
        const finalRun = await fetch(`/api/content/${data.id}`).then((r) => r.json());
        setRun(finalRun);
        await refreshPassport(finalRun.contentId);
        showToast("Rejected demo loaded!", "info");
      } else if (demo === "pending") {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, contentId: "northwind-q4" }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Analysis failed.");
        setRun(data);
        setSelectedId(data.findings[0]?.id ?? null);
        setEditedFix(data.findings[0]?.recommendation ?? "");
        await refreshPassport(data.contentId);
        showToast("Pending review demo loaded!", "info");
      } else if (demo === "empty") {
        setRun(null);
        setText("");
        setPassport(null);
        showToast("Demo reset!", "info");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Demo setup failed", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const refreshPassport = async (contentId: string) => {
    const response = await fetch(`/api/passport/${encodeURIComponent(contentId)}`);
    if (response.ok) setPassport(await response.json());
  };

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const runAnalysis = async () => {
    if (!text.trim()) {
      showToast("Campaign content is required.", "error");
      return;
    }
    setLoading(true);
    setAnalyzing(true);
    showToast("Analyzing campaign...", "info");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, contentId: "northwind-q4" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Analysis failed.");
      setRun(data);
      setSelectedId(data.findings[0]?.id ?? null);
      setEditedFix(data.findings[0]?.recommendation ?? "");
      await refreshPassport(data.contentId);
      setActiveStep(1);
      showToast("Analysis complete!", "success");
      document.getElementById("findings")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analysis failed.", "error");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const findingAction = async (action: FindingAction) => {
    if (!run || !selected) return;
    if (action === "dispute" && !reviewReason.trim()) {
      showToast("Add a reason before disputing a finding.", "error");
      return;
    }
    if (action === "edit" && !editedFix.trim()) {
      showToast("Add replacement text before saving an edit.", "error");
      return;
    }
    // Prevent rapid clicks - use a ref to track in-flight request
    if (loading) return;
    setLoading(true);
    showToast(`${action.charAt(0).toUpperCase() + action.slice(1)}ing finding...`, "info");
    try {
      const response = await fetch(`/api/findings/${encodeURIComponent(selected.id)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          action,
          reason: reviewReason,
          editedFix: action === "edit" ? editedFix : undefined,
          version: run.version,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Finding action failed.");
      setRun(data);
      setEditedFix(data.findings.find((f: Finding) => f.id === selected.id)?.recommendation ?? "");
      await refreshPassport(data.contentId);
      showToast(`Finding ${action}ed`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Finding action failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (decision: ReviewDecision) => {
    if (!run) return;
    if (decision !== "approved" && !reviewReason.trim()) {
      showToast("Add a reason for rejection or requested changes.", "error");
      return;
    }
    setLoading(true);
    showToast("Submitting review...", "info");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.id, decision, reviewer, reason: reviewReason, version: run.version }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Review failed.");
      setRun(data);
      await refreshPassport(data.contentId);
      setActiveStep(3);
      showToast(`Campaign ${decision}!`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Review failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadPassport = () => {
    if (!run || !passport) return;
    const lines = [
      "# Trust Passport",
      "",
      `Campaign: ${run.campaignTitle}`,
      `Status: ${run.status}`,
      `Run: ${run.id}`,
      `Version: ${run.version}`,
      `Claims checked: ${passport.claimsChecked}`,
      `Findings: ${passport.findingsCount}`,
      `Reviewer: ${run.review.reviewer ?? "Not recorded"}`,
      `Decision: ${run.review.decision ?? "Pending"}`,
      `Reason: ${run.review.reason ?? "Not recorded"}`,
      `Approved/reviewed at: ${run.review.decidedAt ?? "Not recorded"}`,
      `AI assistance: ${passport.aiAssistance}`,
      `Rules version: ${run.rulesVersion}`,
      `Evidence version: ${run.evidenceVersion}`,
      ...(run.correctedCampaignText ? ["", "## Corrected campaign snapshot", "", run.correctedCampaignText] : []),
      "",
      "## Audit trail",
      "",
      ...run.audit.map((event) => `- ${event.timestamp} · ${event.actor} · ${event.event}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${run.campaignTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-trust-passport.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Passport downloaded!", "success");
  };

  const downloadPDF = () => {
    if (!run || !passport) return;
    import("jspdf").then(({ jsPDF }) => {
      import("jspdf-autotable").then(() => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Trust Passport", 14, 22);
        doc.setFontSize(10);
        doc.text(run.campaignTitle, 14, 30);
        doc.text(`Status: ${run.status}`, 14, 36);
        doc.text(`Run: ${run.id}`, 14, 42);
        doc.text(`Version: ${run.version}`, 14, 48);

        const metrics = [
          ["Claims Checked", passport.claimsChecked],
          ["Supported", passport.supported],
          ["Outdated", passport.outdated],
          ["Unverified", passport.unverified],
          ["Accessibility Issues", passport.accessibilityIssues],
          ["Resolved Accessibility", passport.resolvedAccessibility],
          ["Total Findings", passport.findingsCount],
          ["High Priority", passport.highPriorityFindings],
          ["Audit Events", passport.auditEvents],
        ];

        (doc as any).autoTable({
          head: [["Metric", "Value"]],
          body: metrics,
          startY: 56,
        });

        const auditY = (doc as any).lastAutoTable.finalY + 10;
        doc.text("Audit Trail", 14, auditY);
        const auditData = run.audit.map((e) => [e.timestamp, e.actor, e.event, JSON.stringify(e.details)]);
        (doc as any).autoTable({
          head: [["Timestamp", "Actor", "Event", "Details"]],
          body: auditData,
          startY: auditY + 6,
          styles: { fontSize: 7 },
        });

        doc.save(`${run.campaignTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-trust-passport.pdf`);
        showToast("PDF downloaded!", "success");
      });
    });
  };

  const copyShareableLink = () => {
    if (!run) return;
    const url = `${window.location.origin}${window.location.pathname}?run=${run.id}&finding=${selectedId || ""}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    showToast("Link copied!", "success");
  };

  const resetDemo = () => {
    setRun(null);
    setText(sampleText);
    setPassport(null);
    setSelectedId(null);
    setReviewer("Demo Reviewer");
    setReviewReason("");
    setEditedFix("");
    setActiveStep(0);
    setDemoMode(null);
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url);
    showToast("Demo reset to initial state", "info");
  };

  const decisionLabel =
    run?.status === "approved"
      ? "Approved"
      : run?.status === "rejected"
        ? "Rejected"
        : run?.status === "changes_requested"
          ? "Changes requested"
          : "Pending";

  const steps = [
    { id: 0, label: "Campaign", icon: FileText },
    { id: 1, label: "Findings", icon: CircleAlert },
    { id: 2, label: "Review", icon: ClipboardCheck },
    { id: 3, label: "Passport", icon: FileCheck2 },
  ];

  const severityColor = (severity: Finding["severity"]) =>
    severity === "High" ? "bg-rose-500" : severity === "Medium" ? "bg-amber-500" : "bg-slate-500";

  const statusColor = (status: FindingStatus) => {
    switch (status) {
      case "Supported": return "bg-emerald-100 text-emerald-700";
      case "Outdated": return "bg-amber-100 text-amber-700";
      case "Unverified": return "bg-rose-100 text-rose-700";
      case "Brand violation": return "bg-violet-100 text-violet-700";
      case "Needs correction": return "bg-blue-100 text-blue-700";
      case "Disputed": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <ToastProvider>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-[#f4f7fb] text-slate-900"
      >
        {/* Demo Mode Banner */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center"
        >
          <div className="max-w-[1500px] mx-auto flex items-center justify-center gap-3 text-xs font-semibold text-amber-800">
            <Sparkles size={14} />
            <span>🎪 Demo Mode — Data resets daily | </span>
            <span className="font-mono">Deterministic engine • No AI hallucination • Evidence-backed</span>
            <span className="ml-4 px-2 py-0.5 rounded bg-amber-100">v{RULES_VERSION} / {EVIDENCE_VERSION}</span>
          </div>
        </motion.div>

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
                <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">CONTENT GOVERNANCE</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Public workspace
              </span>
              <button
                onClick={resetDemo}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={14} /> Reset Demo
              </button>
            </div>
          </div>
        </header>

        {/* Progress Stepper */}
        <nav className="sticky top-[76px] z-20 border-b border-slate-200 bg-white px-4 py-2 md:px-8">
          <div className="mx-auto max-w-[1500px] flex items-center justify-between">
            {steps.map((step, index) => (
              <motion.button
                key={step.id}
                disabled={!hasRun && index > 0}
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  index === activeStep
                    ? "bg-blue-50 text-blue-700"
                    : index < activeStep
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-400 hover:text-slate-600 disabled:opacity-40"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <step.icon size={14} />
                <span>{step.label}</span>
                {index < steps.length - 1 && (
                  <motion.div
                    className={`h-0.5 flex-1 max-w-20 rounded ${
                      index < activeStep ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: index < activeStep ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </nav>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-[1500px] px-4 md:px-8">
          <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
            <motion.button
              onClick={() => setActiveTab("workspace")}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "workspace"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText size={16} />
              Workspace
            </motion.button>
            <motion.button
              onClick={() => setActiveTab("evidence")}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "evidence"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Database size={16} />
              Evidence Library
            </motion.button>
            <motion.button
              onClick={() => setActiveTab("passport")}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "passport"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Shield size={16} />
              Passport
            </motion.button>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
          {activeTab === "workspace" && (
            <>
              <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:p-7">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-blue-600">
                <Sparkles size={14} /> Your content trust workspace
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Every claim. Every source. Every decision.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Check campaign content against approved evidence, accessibility rules, and brand standards.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                onClick={runAnalysis}
                disabled={loading || analyzing || !text.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex min-w-64 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    {demoMode ? "Loading Demo..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Play size={17} fill="currentColor" />
                    Run Governance Check
                  </>
                )}
              </motion.button>
              {hasRun && (
                <motion.button
                  onClick={copyShareableLink}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <ExternalLink size={14} />
                  {copiedUrl ? <Check size={14} className="text-emerald-600" /> : "Share Link"}
                </motion.button>
              )}
            </div>
          </section>

          <section id="campaign" className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-3">
              <div>
                <label htmlFor="campaign-text" className="font-bold">Campaign copy</label>
                <p className="mt-1 text-xs text-slate-400">Use the Northwind sample or enter custom copy.</p>
              </div>
              <span className="text-xs text-slate-400">{text.length} / 2,000</span>
            </div>
            <textarea
              id="campaign-text"
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Claims checked", value: run?.claimsChecked ?? "—", note: "Current snapshot", icon: FileText, color: "bg-blue-50 text-blue-600" },
              { label: "Findings", value: findings.length.toString(), note: findings.length ? "Evidence review needed" : "No findings yet", icon: CircleAlert, color: "bg-amber-50 text-amber-600" },
              { label: "High-priority", value: findings.filter((f) => f.severity === "High").length.toString(), note: "Require attention", icon: BadgeCheck, color: "bg-rose-50 text-rose-600" },
              { label: "Review status", value: decisionLabel, note: run?.review.decidedAt ? "Decision recorded" : "Human approval required", icon: ClipboardCheck, color: "bg-violet-50 text-violet-600" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * steps.findIndex((step) => step.label === stat.label) }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
                  </div>
                  <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{stat.note}</p>
                </motion.div>
              );
            })}
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[1.45fr_0.85fr]">
            <div className="space-y-5">
              <motion.section
                id="findings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <div>
                    <h2 className="font-bold">Governance findings</h2>
                    <p className="mt-1 text-xs text-slate-400">{run ? run.campaignTitle : "Northwind Q4 Campaign"} · {run ? run.id.slice(0, 18) : "No analysis run"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{findings.length} findings</span>
                </div>

                {!run ? (
                  <div className="px-5 py-12 text-center">
                    <Search className="mx-auto text-slate-300" size={34} />
                    <p className="mt-3 font-bold">Ready for analysis</p>
                    <p className="mt-1 text-xs text-slate-500">Run the sample to evidence-back the Northwind campaign.</p>
                  </div>
                ) : findings.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-600" size={34} />
                    <p className="mt-3 font-bold">No findings detected</p>
                    <p className="mt-1 text-xs text-slate-500">All claims are supported by approved evidence.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    <AnimatePresence mode="wait">
                      {findings.map((finding, index) => (
                        <motion.button
                          key={finding.id}
                          onClick={() => { setSelectedId(finding.id); setEditedFix(finding.recommendation); }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${
                            selected?.id === finding.id ? "bg-blue-50/70" : "hover:bg-slate-50"
                          }`}
                        >
                          <motion.div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${severityColor(finding.severity)}`}
                            whileTap={{ scale: 0.9 }}
                          >
                            <CircleAlert size={18} className="text-white" />
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{finding.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{finding.category}</p>
                          </div>
                          <motion.span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColor(finding.status)}`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                          >
                            {finding.action ? finding.action : finding.status}
                          </motion.span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.section>

              <motion.section
                id="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-blue-600" size={22} />
                  <div>
                    <h2 className="font-bold">Human review</h2>
                    <p className="mt-1 text-xs text-slate-400">Reviewer identity, decision, reason, and timestamp are recorded.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Reviewer
                    <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Review reason
                    <input value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} placeholder="Required for changes or rejection" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-400" />
                  </label>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <motion.button
                    disabled={!run || loading || approved}
                    onClick={() => submitReview("approved")}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Approve
                  </motion.button>
                  <motion.button
                    disabled={!run || loading}
                    onClick={() => submitReview("changes_requested")}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-slate-300"
                  >
                    Request changes
                  </motion.button>
                  <motion.button
                    disabled={!run || loading}
                    onClick={() => submitReview("rejected")}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:bg-slate-100"
                  >
                    Reject
                  </motion.button>
                </div>
              </motion.section>
            </div>

            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-[120px]"
            >
              <div className="border-b border-slate-100 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Evidence review</p>
                <h2 className="mt-1 font-bold">Finding details</h2>
              </div>
              {selected && run ? (
                <div className="space-y-5 p-5">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${severityColor(selected.severity)} text-white`}>{selected.severity} priority</span>
                    <h3 className="mt-3 text-lg font-bold">{selected.title}</h3>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Content under review</p>
                    <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-sm leading-6">"{selected.claim}"</div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Why it was flagged</p>
                    <p className="text-sm leading-6 text-slate-600">{selected.explanation}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-xs font-bold text-blue-800">Approved evidence</p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{selected.evidence}</p>
                    {selected.evidenceId && (
                      <p className="mt-1 text-[10px] text-slate-400 font-mono">Evidence ID: {selected.evidenceId}</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Original → suggested fix</p>
                    <div className="grid gap-2">
                      <textarea
                        value={editedFix}
                        onChange={(e) => setEditedFix(e.target.value)}
                        rows={3}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs leading-5 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      disabled={loading}
                      onClick={() => findingAction("accept")}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-lg bg-blue-600 px-2 py-2.5 text-xs font-bold text-white"
                    >
                      <Check size={12} className="inline mr-1" /> Accept
                    </motion.button>
                    <motion.button
                      disabled={loading}
                      onClick={() => findingAction("edit")}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-lg bg-violet-600 px-2 py-2.5 text-xs font-bold text-white"
                    >
                      Save edit
                    </motion.button>
                    <motion.button
                      disabled={loading}
                      onClick={() => findingAction("dispute")}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-lg border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600"
                    >
                      <AlertTriangle size={12} className="inline mr-1" /> Dispute
                    </motion.button>
                  </div>
                  {selected.action && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-semibold text-emerald-700"
                    >
                      Finding disposition: {selected.action}
                    </motion.p>
                  )}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-sm text-slate-500">Run analysis to inspect evidence.</div>
              )}
            </motion.aside>
          </div>

          <motion.section
            id="passport"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="scroll-mt-32 overflow-hidden rounded-2xl bg-[#101b35] text-white shadow-sm"
          >
            <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-white/10 p-3"><FileCheck2 size={24} /></div>
                <div>
                  <p className="text-lg font-bold">Trust Passport</p>
                  <p className="mt-1 text-sm text-slate-300">A generated record of checks, findings, evidence, and reviewer decisions.</p>
                </div>
              </div>
              {run && (
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    onClick={() => setShowAudit((open) => !open)}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
                  >
                    <History size={16} /> Audit trail
                  </motion.button>
                  <motion.button
                    onClick={() => setShowDiff((open) => !open)}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
                  >
                    <GitCompare size={16} /> Diff
                  </motion.button>
                  <motion.button
                    onClick={() => setShowScorecard((open) => !open)}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
                  >
                    <BarChart2 size={16} /> Scorecard
                  </motion.button>
                  <motion.button
                    disabled={!approved}
                    onClick={downloadPDF}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#101b35] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
                  >
                    <Download size={16} /> PDF
                  </motion.button>
                  <motion.button
                    disabled={!approved}
                    onClick={downloadPassport}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-3 text-sm font-bold text-[#101b35] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
                  >
                    <FileText size={16} /> Markdown
                  </motion.button>
                  {approved && (
                    <>
                      <PassportVerifyQR runId={run.id} />
                      <motion.a
                        href={`/verify/${run.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-bold text-[#101b35] hover:bg-violet-500"
                      >
                        <Shield size={16} /> Verify
                      </motion.a>
                    </>
                  )}
                </div>
              )}
            </div>

            {run && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-white/10 bg-white p-5 text-slate-900 md:p-6"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Trust Passport — {run.campaignTitle}</p>
                    <h2 className="mt-1 text-xl font-bold">{decisionLabel}</h2>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${approved ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{run.status}</span>
                </div>

                <PassportMetrics passport={passport} run={run} />

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <PassportDetail label="Reviewer" value={run.review.reviewer ?? "Not recorded"} />
                  <PassportDetail label="Decision" value={run.review.decision ?? "Pending"} />
                  <PassportDetail label="Reviewed at" value={run.review.decidedAt ?? "Not recorded"} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <PassportDetail label="AI assistance" value={run.aiAssistance ? "Declared and recorded" : "No AI assistance used"} />
                  <PassportDetail label="Evidence / rules" value={`${run.evidenceVersion} · ${run.rulesVersion}`} />
                </div>

                {showAudit && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit trail</p>
                    <div className="mt-3 space-y-2">
                      {[...run.audit].reverse().map((event) => (
                        <div key={event.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                          <span className="font-bold text-slate-800">{event.event}</span>
                          <span className="mx-2 text-slate-300">·</span>
                          {event.actor}
                          <span className="mx-2 text-slate-300">·</span>
                          {new Date(event.timestamp).toLocaleString()}
                          <pre className="mt-1 text-[10px] text-slate-400 overflow-auto">{JSON.stringify(event.details, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {showDiff && run.correctedCampaignText && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4"
                  >
                    <DiffView
                      original={run.campaignText}
                      corrected={run.correctedCampaignText}
                    />
                  </motion.div>
                )}

                {showScorecard && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4"
                  >
                    <JudgeScorecard run={run} passport={passport} />
                  </motion.div>
                )}
              </motion.div>
            )}

            {!run && (
              <div className="border-t border-white/10 bg-white/5 p-6 text-center text-slate-400">
                <FileCheck2 className="mx-auto text-slate-400" size={48} />
                <p className="mt-3 font-bold text-white">No passport yet</p>
                <p className="mt-1 text-sm">Run a governance check to generate a Trust Passport.</p>
              </div>
            )}
          </motion.section>
            </>
          )}
          {activeTab === "evidence" && (
            <EvidenceLibraryInline run={run} setActiveTab={setActiveTab} setSelectedId={setSelectedId} />
          )}
          {activeTab === "passport" && (
            <PassportInline
              run={run}
              passport={passport}
              onGoToWorkspace={() => setActiveTab("workspace")}
              showAudit={showAudit}
              setShowAudit={setShowAudit}
              showDiff={showDiff}
              setShowDiff={setShowDiff}
              showScorecard={showScorecard}
              setShowScorecard={setShowScorecard}
              downloadPDF={downloadPDF}
              downloadPassport={downloadPassport}
            />
          )}

          <footer className="pb-3 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
            <span>© 2026 Inkloom AI · Every claim checked, every source visible, every decision recorded.</span>
            <ClientQRCode />
          </footer>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2 ${
                toast.type === "success" ? "bg-emerald-600 text-white" :
                toast.type === "error" ? "bg-rose-600 text-white" :
                "bg-blue-600 text-white"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 size={18} />}
              {toast.type === "error" && <AlertTriangle size={18} />}
              {toast.type === "info" && <Info size={18} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        <ToastViewport />
      </motion.main>
    </ToastProvider>
  );
}

function ClientQRCode() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}${window.location.pathname}?demo=perfect`);
  }, []);
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <QRCodeSVG value={url} size={32} includeMargin={true} />
      <span className="text-[10px]">Scan for demo</span>
    </div>
  );
}

function PassportVerifyQR({ runId }: { runId: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/verify/${runId}`);
  }, [runId]);
  return (
    <div className="flex items-center gap-2">
      <QRCodeSVG value={url} size={32} includeMargin={true} />
      <span className="text-[10px] text-white/70">Scan to verify</span>
    </div>
  );
}

function PassportMetrics({ passport, run }: { passport: Passport | null; run: GovernanceRun }) {
  const metrics = [
    { label: "Claims checked", value: passport?.claimsChecked ?? run.claimsChecked },
    { label: "Supported", value: passport?.supported ?? 0 },
    { label: "Outdated", value: passport?.outdated ?? 0 },
    { label: "Unverified", value: passport?.unverified ?? 0 },
    { label: "Accessibility issues", value: passport?.accessibilityIssues ?? 0 },
    { label: "Resolved accessibility", value: passport?.resolvedAccessibility ?? 0 },
    { label: "Findings", value: run.findings.length },
    { label: "Audit events", value: passport?.auditEvents ?? run.audit.length },
  ];

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
          <AnimatedNumber value={metric.value} className="mt-2 text-2xl font-bold" />
        </motion.div>
      ))}
    </div>
  );
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const duration = 800;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className={className}>{displayValue}</span>;
}

function PassportDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold break-words">{value}</p>
    </div>
  );
}

// Inline Evidence Library component for unified tab view
function EvidenceLibraryInline({ run, setActiveTab, setSelectedId }: { run: GovernanceRun | null; setActiveTab: (tab: "workspace" | "evidence" | "passport") => void; setSelectedId: (id: string | null) => void }) {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [filteredEvidence, setFilteredEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [findingRefs, setFindingRefs] = useState<Record<string, FindingRef[]>>({});

  const fetchEvidence = useCallback(async () => {
    try {
      const response = await fetch("/api/evidence");
      if (response.ok) {
        const data = await response.json();
        setEvidence(data);
        setFilteredEvidence(data);
      }
    } catch (error) {
      console.error("Failed to fetch evidence:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFindingRefs = useCallback(async () => {
    if (!run) return;
    try {
      const response = await fetch(`/api/content/${run.id}`);
      if (response.ok) {
        const runData = await response.json();
        const refs: Record<string, FindingRef[]> = {};
        for (const finding of runData.findings || []) {
          if (finding.evidenceId) {
            if (!refs[finding.evidenceId]) refs[finding.evidenceId] = [];
            refs[finding.evidenceId].push({
              findingId: finding.id,
              findingTitle: finding.title,
              severity: finding.severity,
            });
          }
        }
        setFindingRefs(refs);
      }
    } catch (error) {
      console.error("Failed to fetch finding refs:", error);
    }
  }, [run]);

  useEffect(() => {
    fetchEvidence();
    fetchFindingRefs();
  }, [fetchEvidence, fetchFindingRefs]);

  useEffect(() => {
    let filtered = evidence;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.source.toLowerCase().includes(query) ||
          e.passage.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query) ||
          e.id.toLowerCase().includes(query)
      );
    }
    if (selectedCategory !== "All") {
      filtered = filtered.filter((e) => e.category === selectedCategory);
    }
    setFilteredEvidence(filtered);
  }, [evidence, searchQuery, selectedCategory]);

  const categoryIcon = (category: string) => {
    switch (category) {
      case "Claim verification": return <Shield className="text-blue-600" size={16} />;
      case "Fact verification": return <Database className="text-emerald-600" size={16} />;
      case "Brand consistency": return <FileText className="text-violet-600" size={16} />;
      case "Accessibility": return <Info className="text-amber-600" size={16} />;
      default: return <Shield className="text-slate-600" size={16} />;
    }
  };

  const categoryColor = (category: string) => {
    switch (category) {
      case "Claim verification": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Fact verification": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Brand consistency": return "bg-violet-50 text-violet-700 border-violet-200";
      case "Accessibility": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const severityColor = (severity: "High" | "Medium" | "Low") => {
    switch (severity) {
      case "High": return "bg-rose-100 text-rose-700";
      case "Medium": return "bg-amber-100 text-amber-700";
      case "Low": return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-blue-600">
              <Database size={14} /> Approved Evidence Library
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Every source. Every version. Every decision backed.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Browse the curated evidence records used to verify campaign claims. Each record is approved, versioned, and traceable to findings.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100">
              <Database size={14} /> {evidence.length} records
            </span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700">
              <Filter size={14} /> {CATEGORIES.length - 1} categories
            </span>
          </div>
        </div>
      </motion.section>

      {/* Search & Filters */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search evidence by source, passage, ID, or category..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                whileTap={{ scale: 0.98 }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat !== "All" && categoryIcon(cat)}
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Evidence Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 px-5 py-4 border-b border-slate-100"
              >
                <div className="animate-pulse bg-slate-200 rounded w-10 h-10" />
                <div className="flex-1 space-y-2">
                  <div className="animate-pulse bg-slate-200 rounded h-4 w-1/4" />
                  <div className="animate-pulse bg-slate-200 rounded h-3 w-1/2" />
                </div>
                <div className="animate-pulse bg-slate-200 rounded h-6 w-20" />
              </motion.div>
            ))}
          </div>
        ) : filteredEvidence.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <Search className="mx-auto text-slate-300" size={48} />
            <p className="mt-4 font-bold text-slate-600">No evidence records found</p>
            <p className="mt-1 text-sm text-slate-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Record</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Source</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Version</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Passage</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Used In</th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500 pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filteredEvidence.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={expandedId === record.id ? "bg-blue-50/50" : "hover:bg-slate-50/50"}
                      >
                        <td className="px-5 py-4 font-mono text-xs text-slate-500">{record.id}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${categoryColor(record.category)}`}>
                            {categoryIcon(record.category)}
                            {record.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700">{record.source}</td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500">{record.version}</td>
                        <td className="px-5 py-4">
                          <div className="max-w-md">
                            <p className="text-sm text-slate-600 line-clamp-2">{record.passage}</p>
                            {expandedId === record.id && (
                              <p className="mt-1 text-xs text-slate-400 font-mono">{record.passage}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const refs = findingRefs[record.id] || [];
                            if (refs.length > 0) {
                              return (
                                <div className="flex flex-wrap gap-1.5">
                                  {refs.map((ref) => (
                                    <motion.span
                                      key={ref.findingId}
                                      initial={{ scale: 0.8 }}
                                      animate={{ scale: 1 }}
                                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold ${severityColor(ref.severity)}`}
                                    >
                                      <ExternalLink size={10} />
                                      {ref.findingTitle}
                                    </motion.span>
                                  ))}
                                </div>
                              );
                            }
                            return <span className="text-xs text-slate-400">Not referenced</span>;
                          })()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <motion.button
                              onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                              whileTap={{ scale: 0.9 }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              {expandedId === record.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {expandedId === record.id ? "Collapse" : "Expand"}
                            </motion.button>
                            <motion.button
                              onClick={() => navigator.clipboard.writeText(record.id)}
                              whileTap={{ scale: 0.9 }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Copy size={12} />
                              Copy ID
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
              {filteredEvidence.map((record) =>
                expandedId === record.id ? (
                  <motion.tr
                    key={`expanded-${record.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <td colSpan={7} className="px-5 pb-5">
                      <div className="ml-10 mr-5 pt-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Passage</p>
                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{record.passage}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metadata</p>
                            <dl className="mt-1 space-y-1 text-sm">
                              <div className="flex gap-4">
                                <dt className="text-slate-500 w-24">ID:</dt>
                                <dd className="font-mono text-slate-700">{record.id}</dd>
                              </div>
                              <div className="flex gap-4">
                                <dt className="text-slate-500 w-24">Category:</dt>
                                <dd className="font-medium text-slate-700">{record.category}</dd>
                              </div>
                              <div className="flex gap-4">
                                <dt className="text-slate-500 w-24">Source:</dt>
                                <dd className="font-medium text-slate-700">{record.source}</dd>
                              </div>
                              <div className="flex gap-4">
                                <dt className="text-slate-500 w-24">Version:</dt>
                                <dd className="font-mono text-slate-700">{record.version}</dd>
                              </div>
                              <div className="flex gap-4">
                                <dt className="text-slate-500 w-24">Created:</dt>
                                <dd className="text-slate-700">{new Date(record.created_at).toLocaleString()}</dd>
                              </div>
                              <div className="flex gap-4">
                                <dt className="text-slate-500 w-24">Approved:</dt>
                                <dd className="flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 size={12} /> Yes
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                        {findingRefs[record.id]?.length && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Referenced in Findings</p>
                            <div className="flex flex-wrap gap-2">
                              {findingRefs[record.id]!.map((ref) => (
                                <button
                                  key={ref.findingId}
                                  onClick={() => {
                                    setActiveTab("workspace");
                                    setSelectedId(ref.findingId);
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${severityColor(ref.severity)} hover:opacity-80`}
                                >
                                  <AlertCircle size={12} />
                                  {ref.findingTitle}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ) : null
              )}
            </AnimatePresence>
          </>
        )}
      </motion.section>

      {/* Stats Summary */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: "Total Records", value: evidence.length, icon: Database, color: "bg-blue-50 text-blue-600" },
          { label: "Categories", value: [...new Set(evidence.map((e) => e.category))].length, icon: Filter, color: "bg-emerald-50 text-emerald-600" },
          { label: "Referenced", value: Object.keys(findingRefs).length, icon: ExternalLink, color: "bg-violet-50 text-violet-600" },
          { label: "Unused", value: evidence.length - Object.keys(findingRefs).length, icon: AlertCircle, color: "bg-amber-50 text-amber-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
              </div>
              <p className="mt-4 text-3xl font-bold">{stat.value}</p>
            </motion.div>
          );
        })}
      </motion.section>
    </motion.div>
  );
}

// Inline Passport component for unified tab view
function PassportInline({ run, passport, onGoToWorkspace, showAudit, setShowAudit, showDiff, setShowDiff, showScorecard, setShowScorecard, downloadPDF, downloadPassport }: { run: GovernanceRun | null; passport: Passport | null; onGoToWorkspace: () => void; showAudit: boolean; setShowAudit: (open: boolean) => void; showDiff: boolean; setShowDiff: (open: boolean) => void; showScorecard: boolean; setShowScorecard: (open: boolean) => void; downloadPDF: () => void; downloadPassport: () => void }) {
  if (!run) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <motion.section
          className="rounded-2xl bg-[#101b35] text-white p-8 shadow-sm text-center"
        >
          <FileCheck2 className="mx-auto text-slate-400" size={48} />
          <p className="mt-3 font-bold text-white text-xl">No passport yet</p>
          <p className="mt-1 text-sm text-slate-300">Run a governance check to generate a Trust Passport.</p>
          <motion.button
            onClick={onGoToWorkspace}
            whileTap={{ scale: 0.98 }}
            className="mt-6 inline-flex items-center gap-2 mx-auto rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Play size={17} fill="currentColor" />
            Go to Workspace
          </motion.button>
        </motion.section>
      </motion.div>
    );
  }

  const decisionLabel =
    run.status === "approved"
      ? "Approved"
      : run.status === "rejected"
        ? "Rejected"
        : run.status === "changes_requested"
          ? "Changes requested"
          : "Pending";

  const approved = run.status === "approved";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <motion.section
        className="overflow-hidden rounded-2xl bg-[#101b35] text-white shadow-sm"
      >
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/10 p-3"><FileCheck2 size={24} /></div>
            <div>
              <p className="text-lg font-bold">Trust Passport</p>
              <p className="mt-1 text-sm text-slate-300">A generated record of checks, findings, evidence, and reviewer decisions.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              onClick={() => setShowAudit(!showAudit)}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
            >
              <History size={16} /> Audit trail
            </motion.button>
            <motion.button
              onClick={() => setShowDiff(!showDiff)}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
            >
              <GitCompare size={16} /> Diff
            </motion.button>
            <motion.button
              onClick={() => setShowScorecard(!showScorecard)}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
            >
              <BarChart2 size={16} /> Scorecard
            </motion.button>
            <motion.button
              disabled={!approved}
              onClick={downloadPDF}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#101b35] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
            >
              <Download size={16} /> PDF
            </motion.button>
            <motion.button
              disabled={!approved}
              onClick={downloadPassport}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-3 text-sm font-bold text-[#101b35] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
            >
              <FileText size={16} /> Markdown
            </motion.button>
            {approved && (
              <>
                <PassportVerifyQR runId={run.id} />
                <motion.a
                  href={`/verify/${run.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-bold text-[#101b35] hover:bg-violet-500"
                >
                  <Shield size={16} /> Verify
                </motion.a>
              </>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-white/10 bg-white p-5 text-slate-900 md:p-6"
        >
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Trust Passport — {run.campaignTitle}</p>
              <h2 className="mt-1 text-xl font-bold">{decisionLabel}</h2>
            </div>
            <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${approved ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{run.status}</span>
          </div>

          <PassportMetrics passport={passport} run={run} />

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <PassportDetail label="Reviewer" value={run.review.reviewer ?? "Not recorded"} />
            <PassportDetail label="Decision" value={run.review.decision ?? "Pending"} />
            <PassportDetail label="Reviewed at" value={run.review.decidedAt ?? "Not recorded"} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <PassportDetail label="AI assistance" value={run.aiAssistance ? "Declared and recorded" : "No AI assistance used"} />
            <PassportDetail label="Evidence / rules" value={`${run.evidenceVersion} · ${run.rulesVersion}`} />
          </div>

          {showAudit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit trail</p>
              <div className="mt-3 space-y-2">
                {[...run.audit].reverse().map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{event.event}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    {event.actor}
                    <span className="mx-2 text-slate-300">·</span>
                    {new Date(event.timestamp).toLocaleString()}
                    <pre className="mt-1 text-[10px] text-slate-400 overflow-auto">{JSON.stringify(event.details, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {showDiff && run.correctedCampaignText && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4"
            >
              <DiffView
                original={run.campaignText}
                corrected={run.correctedCampaignText}
              />
            </motion.div>
          )}

          {showScorecard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4"
            >
              <JudgeScorecard run={run} passport={passport} />
            </motion.div>
          )}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}

const RULES_VERSION = "1.0";
const EVIDENCE_VERSION = "northwind-demo-v2";