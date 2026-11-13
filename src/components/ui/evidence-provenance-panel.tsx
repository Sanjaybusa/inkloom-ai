"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileText,
  GitCompare,
  Info,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
} from "lucide-react";
import type { Finding } from "@/lib/governance";
import type { EvidenceRecord, EvidenceVersion } from "@/lib/governance-store";

interface EvidenceProvenancePanelProps {
  finding: Finding | null;
  evidenceRecord: EvidenceRecord | null;
  evidenceVersion: EvidenceVersion | null;
  allFindings: Finding[];
  onVerifyEvidence?: () => void;
  onOpenEvidenceLibrary?: () => void;
  onDisputeFinding?: () => void;
  onAcceptFix?: () => void;
  className?: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "Supported": return <CheckCircle2 size={14} className="text-emerald-600" />;
    case "Outdated": return <AlertTriangle size={14} className="text-amber-600" />;
    case "Unverified": return <AlertCircle size={14} className="text-rose-600" />;
    case "Needs correction": return <CircleAlert size={14} className="text-blue-600" />;
    case "Brand violation": return <Shield size={14} className="text-violet-600" />;
    case "Disputed": return <Flag size={14} className="text-slate-600" />;
    default: return <Info size={14} className="text-slate-600" />;
  }
};

const statusBadge = (status: string) => {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold";
  switch (status) {
    case "Supported": return `${base} bg-emerald-100 text-emerald-700`;
    case "Outdated": return `${base} bg-amber-100 text-amber-700`;
    case "Unverified": return `${base} bg-rose-100 text-rose-700`;
    case "Needs correction": return `${base} bg-blue-100 text-blue-700`;
    case "Brand violation": return `${base} bg-violet-100 text-violet-700`;
    case "Disputed": return `${base} bg-slate-100 text-slate-700`;
    default: return `${base} bg-slate-100 text-slate-700`;
  }
};

const evidenceStatusBadge = (status: "active" | "deprecated" | "expired" | "draft" | "unknown") => {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold";
  switch (status) {
    case "active": return `${base} bg-emerald-100 text-emerald-700`;
    case "deprecated": return `${base} bg-rose-100 text-rose-700`;
    case "expired": return `${base} bg-amber-100 text-amber-700`;
    case "draft": return `${base} bg-slate-100 text-slate-700`;
    default: return `${base} bg-slate-100 text-slate-700`;
  }
};

export function EvidenceProvenancePanel({
  finding,
  evidenceRecord,
  evidenceVersion,
  allFindings,
  onVerifyEvidence,
  onOpenEvidenceLibrary,
  onDisputeFinding,
  onAcceptFix,
  className = "",
}: EvidenceProvenancePanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Find other findings that reference the same evidence version
  const crossReferences = useMemo(() => {
    if (!finding?.evidenceVersionId || !finding.evidenceId) return [];
    return allFindings.filter(
      (f) =>
        f.id !== finding.id &&
        f.evidenceId === finding.evidenceId &&
        f.evidenceVersionId === finding.evidenceVersionId
    );
  }, [finding, allFindings]);

  // Determine if evidence is deprecated or expired
  const isDeprecated = evidenceRecord?.deprecated ?? false;
  const isExpired = evidenceVersion?.deprecated ?? false;
  const evidenceStatus = finding?.evidenceStatusAtEvaluation ??
    (isDeprecated ? "deprecated" : isExpired ? "expired" : evidenceRecord?.approved ? "active" : "draft");

  // Check if finding has no evidence support
  const hasNoEvidence = !finding?.evidenceId || !evidenceRecord;

  if (!finding) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}
      >
        <div className="text-center text-slate-500 py-8">
          <Search size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 font-medium">Select a finding to view provenance</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Evidence Provenance</h3>
              <p className="text-xs text-slate-500">
                Complete audit trail for this finding — rule, evidence version, and evaluation context
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => setExpanded(!expanded)}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Collapse" : "Expand"}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 space-y-6"
          >
            {/* Deprecation/Expiry Warning Banner */}
            {(isDeprecated || isExpired) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border-2 bg-rose-50 border-rose-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    {isExpired ? <Calendar size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-rose-800">
                      {isExpired ? "Warning: Evidence Expired" : "Warning: Evidence Deprecated"}
                    </p>
                    <p className="mt-1 text-sm text-rose-700">
                      {isExpired
                        ? `This evidence version expired on ${evidenceVersion?.deprecated_at ? new Date(evidenceVersion.deprecated_at).toLocaleDateString() : "an unknown date"}. Findings referencing it may no longer be valid.`
                        : `This evidence was deprecated on ${evidenceRecord?.deprecated_at ? new Date(evidenceRecord.deprecated_at).toLocaleDateString() : "an unknown date"}${evidenceRecord?.deprecated_reason ? `: ${evidenceRecord.deprecated_reason}` : "."} Historical findings retain the version used at evaluation time.`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* No Evidence Warning */}
            {hasNoEvidence && !isDeprecated && !isExpired && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border-2 bg-amber-50 border-amber-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <AlertCircle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800">No Approved Evidence Found</p>
                    <p className="mt-1 text-sm text-amber-700">
                      This claim has no supporting evidence in the approved library.
                      Status: <span className="font-semibold">Needs Human Review</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Claim Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Claim Under Review</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-sm leading-6 text-slate-700">"{finding.claim}"</p>
                {finding.matchedText && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold">Matched text:</span>{" "}
                    <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">"{finding.matchedText}"</span>
                  </p>
                )}
              </div>
            </div>

            {/* Rule & Policy Pack Section */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={14} className="text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rule & Policy Pack</span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Rule ID:</dt>
                    <dd className="font-mono text-slate-700 font-medium">{finding.ruleId ?? "N/A"}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Rule Version:</dt>
                    <dd className="font-mono text-slate-700">{finding.ruleVersion ?? "N/A"}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Policy Pack:</dt>
                    <dd className="font-mono text-slate-700">{finding.rulePackVersion ?? "N/A"}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Severity:</dt>
                    <dd className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        finding.severity === "High" ? "bg-rose-100 text-rose-700" :
                        finding.severity === "Medium" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {finding.severity}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Evaluation Context</span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Evaluated At:</dt>
                    <dd className="font-mono text-slate-700">
                      {finding.evaluatedAt ? new Date(finding.evaluatedAt).toLocaleString() : "N/A"}
                    </dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Finding Status:</dt>
                    <dd className="flex items-center gap-2">
                      <span className={statusBadge(finding.status)}>
                        {statusIcon(finding.status)}
                        {finding.action ? `${finding.status} -> ${finding.action}` : finding.status}
                      </span>
                    </dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="text-slate-500 w-28">Action:</dt>
                    <dd className="text-slate-700">{finding.action ?? "Pending"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Evidence Record Section */}
            {evidenceRecord && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Evidence Record</span>
                  </div>
                  <span className={evidenceStatusBadge(evidenceStatus)}>
                    {evidenceStatus === "active" && <CheckCircle2 size={10} />}
                    {evidenceStatus === "deprecated" && <AlertTriangle size={10} />}
                    {evidenceStatus === "expired" && <Calendar size={10} />}
                    {evidenceStatus === "draft" && <Info size={10} />}
                    {evidenceStatus.charAt(0).toUpperCase() + evidenceStatus.slice(1)}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title / Source</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{evidenceRecord.source}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</p>
                      <p className="mt-1 text-sm text-slate-700">{evidenceRecord.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Record ID</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{evidenceRecord.id}</code>
                        <motion.button
                          onClick={() => navigator.clipboard.writeText(evidenceRecord.id)}
                          whileTap={{ scale: 0.9 }}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy ID"
                        >
                          <Copy size={12} />
                        </motion.button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evidence Version</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {evidenceVersion?.version ?? evidenceRecord.version}
                        </code>
                        {evidenceVersion?.id && (
                          <code className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {evidenceVersion.id.slice(0, 16)}...
                          </code>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supporting Passage</p>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                      <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                        {evidenceVersion?.passage ?? evidenceRecord.passage}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner</p>
                      <p className="mt-1 text-sm text-slate-700 flex items-center gap-1">
                        <User size={12} />
                        {evidenceVersion?.created_by ?? "Product Team"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective From</p>
                      <p className="mt-1 text-sm text-slate-700 flex items-center gap-1">
                        <Calendar size={12} />
                        {evidenceVersion?.created_at ? new Date(evidenceVersion.created_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective Until</p>
                      <p className="mt-1 text-sm text-slate-700 flex items-center gap-1">
                        <Calendar size={12} />
                        {evidenceVersion?.deprecated_at ? new Date(evidenceVersion.deprecated_at).toLocaleDateString() : "No expiry"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cross-References Section */}
            {crossReferences.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitCompare size={14} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cross-References ({crossReferences.length} other finding{ crossReferences.length !== 1 ? "s" : "" } citing this evidence version)
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    {crossReferences.map((ref) => (
                      <motion.button
                        key={ref.id}
                        onClick={() => window.dispatchEvent(new CustomEvent("inkloom:select-finding", { detail: ref.id }))}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition hover:opacity-80"
                        style={{
                          backgroundColor: ref.severity === "High" ? "#fff1f2" : ref.severity === "Medium" ? "#fffbeb" : "#f1f5f9",
                          borderColor: ref.severity === "High" ? "#fecaca" : ref.severity === "Medium" ? "#fde68a" : "#e2e8f0",
                          color: ref.severity === "High" ? "#9f1239" : ref.severity === "Medium" ? "#92400e" : "#475569",
                        }}
                      >
                        <CircleAlert size={10} />
                        {ref.title}
                        <span className="rounded px-1 text-[9px] font-bold"
                          style={{
                            backgroundColor: ref.severity === "High" ? "#fecaca" : ref.severity === "Medium" ? "#fde68a" : "#e2e8f0",
                            color: ref.severity === "High" ? "#9f1239" : ref.severity === "Medium" ? "#92400e" : "#475569",
                          }}>
                          {ref.severity}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Section */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              {onVerifyEvidence && evidenceRecord && (
                <motion.button
                  onClick={onVerifyEvidence}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
                >
                  <Eye size={14} /> Verify Evidence
                </motion.button>
              )}
              {onOpenEvidenceLibrary && (
                <motion.button
                  onClick={onOpenEvidenceLibrary}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <ExternalLink size={14} /> Open Evidence Library
                </motion.button>
              )}
              {hasNoEvidence && onDisputeFinding && (
                <motion.button
                  onClick={onDisputeFinding}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
                >
                  <AlertTriangle size={14} /> Needs Human Review
                </motion.button>
              )}
              {!hasNoEvidence && onAcceptFix && finding.status !== "Supported" && (
                <motion.button
                  onClick={onAcceptFix}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
                >
                  <CheckCircle2 size={14} /> Accept Fix
                </motion.button>
              )}
              {!hasNoEvidence && onDisputeFinding && (
                <motion.button
                  onClick={onDisputeFinding}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Flag size={14} /> Dispute
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}