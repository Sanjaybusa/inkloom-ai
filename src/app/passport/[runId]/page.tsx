"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  FileCheck2,
  History,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronLeft,
  FileText,
  Database,
  Shield,
  BarChart2,
  GitBranch,
  X,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { DiffView } from "@/components/ui/diff-view";
import { JudgeScorecard } from "@/components/ui/judge-scorecard";

import type { Finding, AuditEntry, GovernanceRun } from "@/lib/governance";

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

export default function PublicPassport({ params }: { params: Promise<{ runId: string }> }) {
  const [run, setRun] = useState<GovernanceRun | null>(null);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [runId, setRunId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { runId: id } = await params;
      setRunId(id);
      try {
        // First try to get run by ID
        let runRes = await fetch(`/api/content/${id}`);
        let runData = null;
        if (runRes.ok) {
          runData = await runRes.json();
        } else {
          // Fallback: get latest run for demo content
          const fallbackRes = await fetch(`/api/content/northwind-q4`);
          if (fallbackRes.ok) {
            runData = await fallbackRes.json();
          }
        }
        if (runData) {
          setRun(runData);
          // Fetch passport using the run's contentId
          const passportRes = await fetch(`/api/passport/${encodeURIComponent(runData.contentId)}?format=json`);
          if (passportRes.ok) setPassport(await passportRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch passport:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-slate-600">Loading Trust Passport...</p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <div className="text-center p-8">
          <FileCheck2 className="mx-auto text-slate-300" size={64} />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Passport Not Found</h1>
          <p className="mt-2 text-slate-500">The requested Trust Passport could not be found.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline">
            <ChevronLeft size={16} /> Back to Workspace
          </Link>
        </div>
      </div>
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

  const severityColor = (severity: Finding["severity"]) =>
    severity === "High" ? "bg-rose-500" : severity === "Medium" ? "bg-amber-500" : "bg-slate-500";

  const statusColor = (status: string) => {
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

  const downloadPDF = () => {
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
          ["Claims Checked", passport?.claimsChecked ?? run.claimsChecked],
          ["Supported", passport?.supported ?? 0],
          ["Outdated", passport?.outdated ?? 0],
          ["Unverified", passport?.unverified ?? 0],
          ["Accessibility Issues", passport?.accessibilityIssues ?? 0],
          ["Resolved Accessibility", passport?.resolvedAccessibility ?? 0],
          ["Total Findings", run.findings.length],
          ["High Priority", run.findings.filter((f) => f.severity === "High").length],
          ["Audit Events", passport?.auditEvents ?? run.audit.length],
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
      });
    });
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#f4f7fb] text-slate-900"
    >
      {/* Public View Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="mx-auto max-w-[1500px] flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <ShieldCheck size={16} />
            <span className="font-semibold">Public Trust Passport — Read-only view</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-[10px] font-mono">v{run.rulesVersion} / {run.evidenceVersion}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/?run=${run.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <ExternalLink size={14} /> Open in Workspace
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-[40px] z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
              <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">TRUST PASSPORT</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Public workspace
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-blue-600">
                <FileCheck2 size={14} /> Trust Passport
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{run.campaignTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                A generated record of checks, findings, evidence, and reviewer decisions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                approved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                run.status === "rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {decisionLabel}
              </span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <QRCodeSVG value={shareUrl} size={32} includeMargin />
                <span className="text-xs text-slate-500 hidden sm:block">Scan to share</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Metrics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Claims checked", value: passport?.claimsChecked ?? run.claimsChecked, icon: FileText, color: "bg-blue-50 text-blue-600" },
            { label: "Supported", value: passport?.supported ?? 0, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
            { label: "Outdated", value: passport?.outdated ?? 0, icon: Database, color: "bg-amber-50 text-amber-600" },
            { label: "Unverified", value: passport?.unverified ?? 0, icon: AlertTriangle, color: "bg-rose-50 text-rose-600" },
            { label: "Accessibility issues", value: passport?.accessibilityIssues ?? 0, icon: Info, color: "bg-blue-50 text-blue-600" },
            { label: "Resolved accessibility", value: passport?.resolvedAccessibility ?? 0, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
            { label: "Findings", value: run.findings.length, icon: Shield, color: "bg-violet-50 text-violet-600" },
            { label: "Audit events", value: passport?.auditEvents ?? run.audit.length, icon: History, color: "bg-slate-50 text-slate-600" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
                </div>
                <AnimatedNumber value={stat.value} className="mt-2 text-3xl font-bold" />
              </motion.div>
            );
          })}
        </motion.section>

        {/* Review Details */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-bold">Review details</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reviewer</p>
              <p className="mt-2 text-sm font-semibold">{run.review.reviewer ?? "Not recorded"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decision</p>
              <p className="mt-2 text-sm font-semibold capitalize">{run.review.decision ?? "Pending"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decided at</p>
              <p className="mt-2 text-sm font-semibold">{run.review.decidedAt ? new Date(run.review.decidedAt).toLocaleString() : "Not recorded"}</p>
            </div>
          </div>
          {run.review.reason && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p>
              <p className="mt-2 text-sm text-slate-600">{run.review.reason}</p>
            </div>
          )}
        </motion.section>

        {/* Findings Summary */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Findings summary</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{run.findings.length} findings</span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {run.findings.map((finding) => (
              <div key={finding.id} className="flex items-center gap-3 px-5 py-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${severityColor(finding.severity)}`}>
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{finding.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{finding.category}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColor(finding.status)}`}>
                  {finding.action ? finding.action : finding.status}
                </span>
                <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[10px] font-semibold">
                  {finding.severity}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Evidence & Rules */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              <h2 className="font-bold">Evidence & Rules</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rules version</p>
                <p className="mt-1 font-mono text-sm">{run.rulesVersion}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evidence version</p>
                <p className="mt-1 font-mono text-sm">{run.evidenceVersion}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI assistance</p>
                <p className="mt-1">{run.aiAssistance ? "Declared and recorded" : "No AI assistance used"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Run ID</p>
                <p className="mt-1 font-mono text-xs">{run.id}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Analyzed at</p>
                <p className="mt-1">{new Date(run.analyzedAt).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Updated at</p>
                <p className="mt-1">{new Date(run.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Database className="text-emerald-600" size={20} />
              <h2 className="font-bold">Verification summary</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PassportDetail label="Supported claims" value={passport?.supported ?? 0} />
              <PassportDetail label="Outdated claims" value={passport?.outdated ?? 0} />
              <PassportDetail label="Unverified claims" value={passport?.unverified ?? 0} />
              <PassportDetail label="Accessibility issues" value={passport?.accessibilityIssues ?? 0} />
              <PassportDetail label="Resolved accessibility" value={passport?.resolvedAccessibility ?? 0} />
              <PassportDetail label="High priority findings" value={run.findings.filter((f) => f.severity === "High").length} />
            </div>
          </div>
        </motion.section>

        {/* Diff View */}
        {showDiff && run.correctedCampaignText && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch size={18} className="text-blue-600" />
                <h2 className="font-bold">Corrected Campaign Diff</h2>
              </div>
              <button
                onClick={() => setShowDiff(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <X size={14} /> Close
              </button>
            </div>
            <DiffView original={run.campaignText} corrected={run.correctedCampaignText} />
          </motion.section>
        )}

        {/* Judge Scorecard */}
        {showScorecard && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600" />
                <h2 className="font-bold">Judge Scorecard</h2>
              </div>
              <button
                onClick={() => setShowScorecard(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <X size={14} /> Close
              </button>
            </div>
            <JudgeScorecard run={run} passport={passport} />
          </motion.section>
        )}

        {/* Audit Trail */}
        {showAudit && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={18} className="text-blue-600" />
                <h2 className="font-bold">Audit trail</h2>
              </div>
              <button
                onClick={() => setShowAudit(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <X size={14} /> Close
              </button>
            </div>
            <div className="p-5 space-y-2 max-h-[400px] overflow-auto">
              {[...run.audit].reverse().map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-800">{event.event}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="font-medium">{event.actor}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-slate-500 text-sm">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <pre className="text-[10px] text-slate-500 overflow-auto max-h-32">{JSON.stringify(event.details, null, 2)}</pre>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-3"
        >
          <button
            onClick={() => setShowAudit(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
          >
            <History size={16} /> View Audit Trail
          </button>
          {run.correctedCampaignText && (
            <button
              onClick={() => setShowDiff(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
            >
              <GitBranch size={16} /> View Diff
            </button>
          )}
          <button
            onClick={() => setShowScorecard(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
          >
            <BarChart2 size={16} /> View Scorecard
          </button>
          {approved && (
            <>
              <button onClick={downloadPDF} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#101b35]">
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={() => {
                  const lines = [
                    "# Trust Passport",
                    "",
                    `Campaign: ${run.campaignTitle}`,
                    `Status: ${run.status}`,
                    `Run: ${run.id}`,
                    `Version: ${run.version}`,
                    `Claims checked: ${passport?.claimsChecked ?? run.claimsChecked}`,
                    `Findings: ${run.findings.length}`,
                    `Reviewer: ${run.review.reviewer ?? "Not recorded"}`,
                    `Decision: ${run.review.decision ?? "Pending"}`,
                    `Reason: ${run.review.reason ?? "Not recorded"}`,
                    `Approved/reviewed at: ${run.review.decidedAt ?? "Not recorded"}`,
                    `AI assistance: ${passport?.aiAssistance ?? "No AI assistance used"}`,
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
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-3 text-sm font-bold text-[#101b35]"
              >
                <FileText size={16} /> Download Markdown
              </button>
            </>
          )}
        </motion.div>
      </div>

      <footer className="pb-6 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
        <span>© 2026 Inkloom AI · Every claim checked, every source visible, every decision recorded.</span>
        <div className="flex items-center gap-2 text-slate-400">
          <QRCodeSVG value={shareUrl} size={32} includeMargin />
          <span className="text-[10px]">Share this passport</span>
        </div>
      </footer>
    </motion.div>
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

function PassportDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}