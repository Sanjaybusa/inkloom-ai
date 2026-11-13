"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  FileText,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Shield,
  Check,
  Info,
  Scale,
  GitCompare,
  Layers,
  ArrowLeft,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { DiffView } from "@/components/ui/diff-view";
import { JudgeScorecard } from "@/components/ui/judge-scorecard";
import { EvidenceProvenancePanel } from "@/components/ui/evidence-provenance-panel";

import type { FindingStatus, FindingAction, ReviewDecision, Finding, GovernanceRun } from "@/lib/governance";
import type { EvidenceRecord, EvidenceVersion } from "@/lib/governance-store";

const RULES_VERSION = "1.0";
const EVIDENCE_VERSION = "2026.11";

const sampleText = `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`;

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

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center"><p className="text-slate-500">Loading workspace...</p></div>}>
      <WorkspaceContent />
    </Suspense>
  );
}

function WorkspaceContent() {
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Evidence provenance states
  const [evidenceRecord, setEvidenceRecord] = useState<EvidenceRecord | null>(null);
  const [evidenceVersion, setEvidenceVersion] = useState<EvidenceVersion | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const findings = run?.findings ?? [];
  const selected = findings.find((f) => f.id === selectedId) ?? findings[0];
  const approved = run?.status === "approved";
  const hasRun = !!run;

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refreshPassport = useCallback(async (contentId: string) => {
    try {
      const response = await fetch(`/api/passport/${encodeURIComponent(contentId)}?format=json`);
      if (response.ok) setPassport(await response.json());
    } catch {
      // ignore
    }
  }, []);

  // Fetch evidence provenance for selected finding
  useEffect(() => {
    if (!selected?.evidenceId) {
      setEvidenceRecord(null);
      setEvidenceVersion(null);
      return;
    }

    let isMounted = true;
    fetch(`/api/evidence/${encodeURIComponent(selected.evidenceId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: EvidenceRecord | null) => {
        if (!isMounted) return;
        setEvidenceRecord(data);
        if (data?.versions && selected.evidenceVersionId) {
          const matchedVersion = data.versions.find((v) => v.id === selected.evidenceVersionId);
          setEvidenceVersion(matchedVersion || data.versions[0] || null);
        } else if (data?.versions?.[0]) {
          setEvidenceVersion(data.versions[0]);
        } else {
          setEvidenceVersion(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEvidenceRecord(null);
          setEvidenceVersion(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selected?.evidenceId, selected?.evidenceVersionId]);

  // Listen to cross-reference event from EvidenceProvenancePanel
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setSelectedId(custom.detail);
        const f = findings.find((x) => x.id === custom.detail);
        if (f) setEditedFix(f.recommendation || "");
      }
    };
    window.addEventListener("inkloom:select-finding", handler);
    return () => window.removeEventListener("inkloom:select-finding", handler);
  }, [findings]);

  // Deep linking and Demo state handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    const runId = params.get("run");
    const campaignId = params.get("campaign");
    const findingId = params.get("finding");

    if (demo) {
      loadDemoState(demo);
      return;
    }

    if (runId) {
      loadRunById(runId, findingId);
      return;
    }

    if (campaignId) {
      loadCampaignRuns(campaignId, findingId);
      return;
    }

    // Default: try restoring latest demo run
    restoreLatestRun();
  }, []);

  const loadRunById = async (id: string, findingId?: string | null) => {
    setLoading(true);
    try {
      let res = await fetch(`/api/content/${encodeURIComponent(id)}`);
      let data = null;
      if (res.ok) {
        data = await res.json();
      } else {
        // Fallback to sample
        res = await fetch("/api/content/northwind-q4");
        if (res.ok) data = await res.json();
      }

      if (data) {
        setRun(data);
        setText(data.campaignText);
        const matched = findingId ? data.findings?.find((f: Finding) => f.id === findingId) : data.findings?.[0];
        setSelectedId(matched?.id || data.findings?.[0]?.id || null);
        setEditedFix(matched?.recommendation || data.findings?.[0]?.recommendation || "");
        setReviewer(data.review?.reviewer || "Demo Reviewer");
        setReviewReason(data.review?.reason || "");
        refreshPassport(data.contentId);
      }
    } catch (err) {
      console.error("Failed to load run:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignRuns = async (cId: string, findingId?: string | null) => {
    setLoading(true);
    try {
      const runsRes = await fetch(`/api/campaigns/${encodeURIComponent(cId)}/runs`);
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        if (Array.isArray(runsData) && runsData.length > 0) {
          const latest = runsData[0];
          setRun(latest);
          setText(latest.campaignText);
          const matched = findingId ? latest.findings?.find((f: Finding) => f.id === findingId) : latest.findings?.[0];
          setSelectedId(matched?.id || latest.findings?.[0]?.id || null);
          setEditedFix(matched?.recommendation || latest.findings?.[0]?.recommendation || "");
          refreshPassport(latest.contentId);
          return;
        }
      }

      // If no runs exist yet, fetch campaign details to load text
      const campRes = await fetch(`/api/campaigns/${encodeURIComponent(cId)}`);
      if (campRes.ok) {
        const camp = await campRes.json();
        if (camp.description) setText(camp.description);
      }
    } catch (err) {
      console.error("Failed to load campaign:", err);
    } finally {
      setLoading(false);
    }
  };

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
    } catch {
      // ignore
    }
  };

  const loadDemoState = async (demo: string) => {
    setAnalyzing(true);
    try {
      if (demo === "perfect") {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, contentId: "northwind-q4" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");

        let curVersion = data.version;
        for (const finding of data.findings) {
          const actRes = await fetch(`/api/findings/${finding.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: data.id, action: "accept", version: curVersion }),
          });
          const result = await actRes.json();
          if (result.version !== undefined) curVersion = result.version;
        }

        const revRes = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: data.id, decision: "approved", reviewer: "Demo Reviewer", reason: "All claims verified", version: curVersion }),
        });
        const finalRun = await revRes.json();
        setRun(finalRun);
        setSelectedId(finalRun.findings[0]?.id ?? null);
        setEditedFix(finalRun.findings[0]?.recommendation ?? "");
        await refreshPassport(finalRun.contentId);
        showToast("Perfect verified demo state loaded!", "success");
      } else if (demo === "rejected") {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, contentId: "northwind-q4" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");

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
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, contentId: "northwind-q4" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");
        setRun(data);
        setSelectedId(data.findings[0]?.id ?? null);
        setEditedFix(data.findings[0]?.recommendation ?? "");
        await refreshPassport(data.contentId);
        showToast("Pending review demo loaded!", "info");
      } else if (demo === "empty") {
        setRun(null);
        setText("");
        setPassport(null);
        showToast("Workspace reset to blank slate", "info");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load demo", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const runAnalysis = async () => {
    if (!text.trim()) {
      showToast("Campaign content is required.", "error");
      return;
    }
    setLoading(true);
    setAnalyzing(true);
    showToast("Evaluating claims against policy rules...", "info");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, contentId: run?.contentId || "northwind-q4" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Analysis failed.");
      setRun(data);
      setSelectedId(data.findings[0]?.id ?? null);
      setEditedFix(data.findings[0]?.recommendation ?? "");
      await refreshPassport(data.contentId);
      showToast(`Analysis complete! Flagged ${data.findings.length} findings.`, "success");
      document.getElementById("findings-section")?.scrollIntoView({ behavior: "smooth" });
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
      showToast("Add a review reason before disputing.", "error");
      return;
    }
    if (action === "edit" && !editedFix.trim()) {
      showToast("Add replacement text before saving edit.", "error");
      return;
    }
    if (loading) return;
    setLoading(true);
    showToast(`Applying ${action}...`, "info");
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
      if (!response.ok) throw new Error(data.message ?? "Action failed.");
      setRun(data);
      setEditedFix(data.findings.find((f: Finding) => f.id === selected.id)?.recommendation ?? "");
      await refreshPassport(data.contentId);
      showToast(`Finding marked as ${action}ed!`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (decision: ReviewDecision) => {
    if (!run) return;
    if (decision !== "approved" && !reviewReason.trim()) {
      showToast("Please provide a reason for this decision.", "error");
      return;
    }
    setLoading(true);
    showToast("Recording review decision and signing passport...", "info");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          decision,
          reviewer,
          reason: reviewReason,
          version: run.version,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Review failed.");
      setRun(data);
      await refreshPassport(data.contentId);
      showToast(`Campaign ${decision === "approved" ? "Approved & Signed" : decision}!`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Review submission failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchCat = categoryFilter === "All" || f.category === categoryFilter;
      const matchSearch =
        !searchQuery ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.claim.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [findings, categoryFilter, searchQuery]);

  const severityColor = (severity: Finding["severity"]) =>
    severity === "High" ? "bg-rose-500" : severity === "Medium" ? "bg-amber-500" : "bg-slate-500";

  const statusColor = (status: FindingStatus) => {
    switch (status) {
      case "Supported":
        return "bg-emerald-100 text-emerald-700";
      case "Outdated":
        return "bg-amber-100 text-amber-700";
      case "Unverified":
        return "bg-rose-100 text-rose-700";
      case "Brand violation":
        return "bg-violet-100 text-violet-700";
      case "Needs correction":
        return "bg-blue-100 text-blue-700";
      case "Disputed":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f4f7fb] text-slate-900 pb-16">
        {/* Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-semibold text-amber-800">
          <div className="max-w-[1500px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} />
              <span>Interactive Governance Workspace — Deterministic Policy-as-Code & Evidence Provenance</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono bg-amber-100 px-2 py-0.5 rounded">Rules v{RULES_VERSION}</span>
              <span className="font-mono bg-amber-100 px-2 py-0.5 rounded">Evidence {EVIDENCE_VERSION}</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="mx-auto flex h-[70px] max-w-[1500px] items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mr-2" title="Back to Campaigns">
                <ArrowLeft size={18} />
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">
                  inkloom<span className="text-blue-600">.</span>
                </p>
                <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">
                  CONTENT GOVERNANCE WORKSPACE
                </p>
              </div>
            </div>

            {/* Quick Links & Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <FolderOpen size={14} /> Campaigns
              </Link>
              <Link
                href="/evidence"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Database size={14} /> Evidence Library
              </Link>
              {run?.id && (
                <>
                  <Link
                    href={`/scorecard/${run.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Scale size={14} /> Scorecard
                  </Link>
                  <Link
                    href={`/passport/${run.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 text-xs font-semibold hover:bg-blue-100"
                  >
                    <FileCheck2 size={14} /> Trust Passport
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Demo Controls Bar */}
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 md:px-8">
          <div className="mx-auto max-w-[1500px] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Demo Presets:</span>
              <button
                onClick={() => loadDemoState("pending")}
                className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sample Check (5 Findings)
              </button>
              <button
                onClick={() => loadDemoState("perfect")}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                All Approved (Signed)
              </button>
              <button
                onClick={() => loadDemoState("rejected")}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100"
              >
                Rejected Case
              </button>
            </div>
            {run?.id && (
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">Run: {run.id}</span>
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">v{run.version}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace Layout */}
        <main className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-6">
          {/* Top Actions & Copy Input */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Campaign Content Under Review</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste marketing copy or load a campaign to check claims, facts, and accessibility.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={runAnalysis}
                  disabled={loading || analyzing || !text.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Evaluating Copy...
                    </>
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" />
                      Run Governance Check
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Paste campaign copy here..."
              className="w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </section>

          {/* Metrics Overview */}
          {hasRun && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Claims Evaluated</p>
                <p className="text-3xl font-bold mt-2">{run?.claimsChecked ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Deterministic rules applied</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Flagged Findings</p>
                <p className="text-3xl font-bold mt-2 text-amber-600">{findings.length}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {findings.filter((f) => f.severity === "High").length} high priority
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Human Approval Status</p>
                <p className="text-2xl font-bold mt-2 capitalize">
                  {run?.status === "approved" ? "✅ Approved" : run?.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {run?.review?.reviewer ? `Reviewer: ${run.review.reviewer}` : "Awaiting review decision"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Trust Passport</p>
                <p className="text-2xl font-bold mt-2">
                  {approved ? "Ed25519 Signed" : "Draft Passport"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Cryptographic proof of review</p>
              </div>
            </div>
          )}

          {/* Core Review Two-Column Grid */}
          <div className="grid items-start gap-6 lg:grid-cols-12" id="findings-section">
            {/* Left Column: Findings List (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900">Governance Findings</h3>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {findings.length}
                    </span>
                  </div>

                  {/* Filter Categories */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {["All", "Claim verification", "Fact verification", "Brand consistency", "Accessibility"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                          categoryFilter === cat
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {!run ? (
                  <div className="p-8 text-center text-slate-400">
                    <Search className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-sm font-semibold">No analysis active</p>
                    <p className="text-xs mt-1">Click "Run Governance Check" above to evaluate copy.</p>
                  </div>
                ) : filteredFindings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={32} />
                    <p className="text-sm font-semibold text-slate-700">No matching findings</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {filteredFindings.map((finding) => {
                      const isSelected = selected?.id === finding.id;
                      return (
                        <button
                          key={finding.id}
                          onClick={() => {
                            setSelectedId(finding.id);
                            setEditedFix(finding.recommendation || "");
                          }}
                          className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                            isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className={`mt-0.5 rounded-lg p-1.5 text-white ${severityColor(finding.severity)}`}>
                            <CircleAlert size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold truncate text-slate-900">{finding.title}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(finding.status)}`}>
                                {finding.action ? finding.action : finding.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">"{finding.claim}"</p>
                            <span className="inline-block mt-2 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {finding.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Review Decision Box */}
              {hasRun && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" size={20} />
                    <h3 className="font-bold text-slate-900">Human Approval Decision</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Reviewer Name</label>
                      <input
                        value={reviewer}
                        onChange={(e) => setReviewer(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Reason / Notes</label>
                      <input
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder="Required for changes or rejection..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      disabled={loading || approved}
                      onClick={() => submitReview("approved")}
                      className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      Approve
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => submitReview("changes_requested")}
                      className="rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition"
                    >
                      Request Changes
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => submitReview("rejected")}
                      className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Evidence Provenance & Suggested Fix (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Evidence Provenance Panel */}
              <EvidenceProvenancePanel
                finding={selected}
                evidenceRecord={evidenceRecord}
                evidenceVersion={evidenceVersion}
                allFindings={findings}
                onAcceptFix={() => findingAction("accept")}
                onDisputeFinding={() => findingAction("dispute")}
                onOpenEvidenceLibrary={() => window.open("/evidence", "_blank")}
              />

              {/* Suggested Fix & Action Box */}
              {selected && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Suggested Correction</h3>
                    <span className="text-xs text-slate-400">Accept, edit, or dispute</span>
                  </div>

                  <textarea
                    value={editedFix}
                    onChange={(e) => setEditedFix(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-blue-400"
                    placeholder="Enter or customize proposed replacement text..."
                  />

                  <div className="flex items-center gap-2">
                    <button
                      disabled={loading}
                      onClick={() => findingAction("accept")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check size={14} /> Accept Fix
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => findingAction("edit")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      Save Custom Fix
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => findingAction("dispute")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <AlertTriangle size={14} /> Dispute Finding
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust Passport & Verification Card */}
          {hasRun && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                    <FileCheck2 size={16} /> Cryptographic Proof
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Trust Passport Certification</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ed25519 canonical JSON signature ensuring immutable proof of approval.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/passport/${run.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink size={14} /> Full Passport
                  </Link>
                  <Link
                    href={`/verify/${run.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <ShieldCheck size={14} /> Verify Signature
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Governance Metadata</p>
                  <p className="text-slate-500">
                    <span className="font-semibold">Campaign:</span> {run.campaignTitle}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-semibold">Status:</span> {run.status}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-semibold">Version:</span> {run.version}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-semibold">Timestamp:</span> {new Date(run.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Audit Trail</p>
                  <p className="text-slate-500">{run.audit.length} immutable events logged</p>
                  <p className="text-slate-500">
                    <span className="font-semibold">Reviewer:</span> {run.review.reviewer || "None"}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-semibold">Decision:</span> {run.review.decision || "Pending"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-4">
                  <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${run.id}`} size={64} includeMargin={true} />
                  <div className="text-xs">
                    <p className="font-bold text-slate-700">Mobile Verification</p>
                    <p className="text-slate-500 mt-1">Scan to inspect client-side cryptographic proof</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        <ToastViewport />
      </div>
    </ToastProvider>
  );
}
