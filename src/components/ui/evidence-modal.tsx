"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  FileText,
  Database,
  Shield,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";

type EvidenceRecord = {
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  approved: boolean;
  deprecated?: boolean;
  deprecated_at?: string;
  deprecated_reason?: string;
  org_id?: string;
  created_at: string;
  versions?: EvidenceVersion[];
};

type EvidenceVersion = {
  id: string;
  evidence_id: string;
  version: string;
  category: string;
  source: string;
  passage: string;
  approved: boolean;
  deprecated: boolean;
  deprecated_at?: string;
  deprecated_reason?: string;
  created_by: string;
  created_at: string;
};

type Mode = "create" | "edit" | "deprecate" | "view-version";

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  record?: EvidenceRecord | null;
  version?: EvidenceVersion | null;
  categories: string[];
  onSubmit: (data: {
    id?: string;
    category: string;
    source: string;
    version: string;
    passage: string;
    approved: boolean;
    reason?: string;
  }) => Promise<void>;
  onDeprecate: (id: string, reason: string) => Promise<void>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Claim verification": <Shield className="text-blue-600" size={16} />,
  "Fact verification": <Database className="text-emerald-600" size={16} />,
  "Brand consistency": <FileText className="text-violet-600" size={16} />,
  "Accessibility": <Info className="text-amber-600" size={16} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Claim verification": "bg-blue-50 text-blue-700 border-blue-200",
  "Fact verification": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Brand consistency": "bg-violet-50 text-violet-700 border-violet-200",
  "Accessibility": "bg-amber-50 text-amber-700 border-amber-200",
};

export function EvidenceModal({
  isOpen,
  onClose,
  mode,
  record,
  version,
  categories,
  onSubmit,
  onDeprecate,
}: EvidenceModalProps) {
  const [formData, setFormData] = useState({
    id: "",
    category: "Claim verification",
    source: "",
    version: "1.0",
    passage: "",
    approved: true,
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === "create") {
        setFormData({ id: "", category: "Claim verification", source: "", version: "1.0", passage: "", approved: true, reason: "" });
      } else if (mode === "edit" && record) {
        setFormData({
          id: record.id,
          category: record.category,
          source: record.source,
          version: record.version,
          passage: record.passage,
          approved: record.approved,
          reason: "",
        });
      } else if (mode === "deprecate" && record) {
        setFormData({ id: record.id, category: "", source: "", version: "", passage: "", approved: false, reason: "" });
      } else if (mode === "view-version" && version) {
        setFormData({
          id: version.evidence_id,
          category: version.category,
          source: version.source,
          version: version.version,
          passage: version.passage,
          approved: version.approved,
          reason: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, record, version]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (mode !== "deprecate" && mode !== "view-version") {
      if (!formData.id.trim()) newErrors.id = "ID is required";
      else if (!/^[a-z0-9-]+$/.test(formData.id)) newErrors.id = "ID must be lowercase, numbers, and hyphens only";
      if (!formData.source.trim()) newErrors.source = "Source is required";
      if (!formData.version.trim()) newErrors.version = "Version is required";
      if (!formData.passage.trim()) newErrors.passage = "Passage is required";
      if (formData.passage.length > 5000) newErrors.passage = "Passage must be under 5000 characters";
    }
    if (mode === "deprecate" && !formData.reason.trim()) {
      newErrors.reason = "Deprecation reason is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "deprecate" && record) {
        await onDeprecate(record.id, formData.reason);
        showToast("Evidence record deprecated", "success");
      } else {
        await onSubmit({
          id: formData.id || undefined,
          category: formData.category,
          source: formData.source,
          version: formData.version,
          passage: formData.passage,
          approved: formData.approved,
        });
        showToast(mode === "create" ? "Evidence record created" : "Evidence record updated", "success");
      }
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Operation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = () => {
    switch (mode) {
      case "create": return "Add Evidence Record";
      case "edit": return `Edit: ${record?.id}`;
      case "deprecate": return `Deprecate: ${record?.id}`;
      case "view-version": return `Version ${version?.version} — ${version?.evidence_id}`;
    }
  };

  const modalDescription = () => {
    switch (mode) {
      case "create": return "Create a new approved evidence record. A version 1 entry will be created automatically.";
      case "edit": return "Update the evidence record. A new version will be created automatically if content changes.";
      case "deprecate": return "This will mark the record as deprecated (soft delete). History will be preserved. Findings referencing this evidence will show a warning.";
      case "view-version": return "View a historical version of this evidence record. This version is read-only.";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 className="font-bold text-lg">{modalTitle()}</h2>
              <p className="mt-1 text-sm text-slate-500">{modalDescription()}</p>
            </div>
            <motion.button
              onClick={onClose}
              disabled={loading}
              whileTap={{ scale: 0.9 }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={20} />
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-5 overflow-y-auto max-h-[70vh]">
            {mode === "view-version" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${CATEGORY_COLORS[formData.category] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                    {CATEGORY_ICONS[formData.category]}
                    {formData.category}
                  </span>
                  <span className="font-mono text-xs text-slate-500">v{formData.version}</span>
                  {formData.approved ? (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold">
                      <CheckCircle2 size={10} /> Approved
                    </span>
                  ) : (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-[10px] font-semibold">
                      <AlertCircle size={10} /> Not Approved
                    </span>
                  )}
                  {version?.deprecated && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-[10px] font-semibold">
                      <AlertTriangle size={10} /> Deprecated
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Source</label>
                  <p className="font-medium text-slate-700">{formData.source}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Passage</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {formData.passage}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-xs">
                  <div className="rounded-lg border border-slate-200 p-2">
                    <p className="text-slate-400">Created By</p>
                    <p className="font-mono">{version?.created_by}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2">
                    <p className="text-slate-400">Created At</p>
                    <p>{new Date(version?.created_at ?? "").toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2">
                    <p className="text-slate-400">Version ID</p>
                    <p className="font-mono truncate">{version?.id}</p>
                  </div>
                </div>
              </div>
            )}

            {mode !== "view-version" && (
              <>
                {(mode === "create" || mode === "edit") && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      disabled={mode === "edit" || loading}
                      placeholder="e.g., claim-policy-new-rule"
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
                        errors.id ? "border-rose-400" : "border-slate-200"
                      }`}
                    />
                    {errors.id && <p className="mt-1 text-xs text-rose-600">{errors.id}</p>}
                    <p className="mt-1 text-xs text-slate-400">Lowercase, numbers, and hyphens only. Immutable after creation.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Source <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    disabled={loading}
                    placeholder="e.g., Northwind Fact Sheet v3.2, Section 4.1"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
                      errors.source ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {errors.source && <p className="mt-1 text-xs text-rose-600">{errors.source}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Version <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    disabled={loading}
                    placeholder="e.g., 1.0, 2.1, 3.0"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
                      errors.version ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {errors.version && <p className="mt-1 text-xs text-rose-600">{errors.version}</p>}
                  <p className="mt-1 text-xs text-slate-400">Semantic version. A new version entry is created automatically on content changes.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Passage <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={formData.passage}
                    onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                    disabled={loading}
                    rows={6}
                    maxLength={5000}
                    placeholder="Enter the approved evidence passage..."
                    className={`w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
                      errors.passage ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {errors.passage && <p className="mt-1 text-xs text-rose-600">{errors.passage}</p>}
                  <p className="mt-1 text-xs text-slate-400">{formData.passage.length}/5000 characters</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="approved"
                    checked={formData.approved}
                    onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                    disabled={loading}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="approved" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Approved (available for governance checks)
                  </label>
                </div>

                {mode === "deprecate" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Deprecation Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      disabled={loading}
                      rows={3}
                      placeholder="Explain why this record is being deprecated..."
                      className={`w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
                        errors.reason ? "border-rose-400" : "border-slate-200"
                      }`}
                    />
                    {errors.reason && <p className="mt-1 text-xs text-rose-600">{errors.reason}</p>}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <motion.button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                      mode === "deprecate"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    } disabled:opacity-60`}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {mode === "deprecate" ? "Deprecating..." : mode === "create" ? "Creating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {mode === "deprecate" ? "Deprecate" : mode === "create" ? "Create Record" : "Save Changes"}
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            )}

            {mode === "view-version" && (
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Close
                </motion.button>
              </div>
            )}
          </form>

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
                {toast.type === "error" && <AlertCircle size={18} />}
                {toast.type === "info" && <Info size={18} />}
                {toast.message}
              </motion.div>
            )}
          </AnimatePresence>
          <ToastViewport />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}