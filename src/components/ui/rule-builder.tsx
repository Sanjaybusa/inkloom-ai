"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Database,
  Shield,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code2,
  Zap,
  Sparkles,
} from "lucide-react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";

type Rule = {
  id: string;
  name: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  pattern: { type: "regex"; value: string };
  conditions: Array<{
    field: string;
    operator: "contains_any" | "not_contains_any" | "matches_regex";
    value: string[];
  }>;
  evidenceIds: string[];
  explanationTemplate: string;
  recommendationTemplate: string;
  handler?: string;
};

type RulePack = {
  rulesVersion: string;
  description: string;
  author: string;
  createdAt: string;
  rules: Rule[];
};

const CATEGORIES = ["Claim verification", "Fact verification", "Brand consistency", "Accessibility"] as const;
const SEVERITIES = ["High", "Medium", "Low"] as const;
const OPERATORS = ["contains_any", "not_contains_any", "matches_regex"] as const;
const CONDITION_FIELDS = ["claim.text", "claim.category", "claim.severity"] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Claim verification": <Shield className="text-blue-600" size={16} />,
  "Fact verification": <Database className="text-emerald-600" size={16} />,
  "Brand consistency": <FileText className="text-violet-600" size={16} />,
  "Accessibility": <Info className="text-amber-600" size={16} />,
};

const SEVERITY_COLORS: Record<string, string> = {
  High: "bg-rose-100 text-rose-700 border-rose-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-700 border-slate-200",
};

const OPERATOR_LABELS: Record<string, string> = {
  contains_any: "Contains any of",
  not_contains_any: "Does NOT contain any of",
  matches_regex: "Matches regex",
};

interface RuleBuilderProps {
  rulePack: RulePack | null;
  onSave: (rulePack: RulePack) => Promise<void>;
  onValidate: (rulePack: RulePack) => { valid: boolean; errors: string[] };
  onTest: (rulePack: RulePack, text: string) => Promise<void>;
  loading: boolean;
}

function ConditionBuilder({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: Rule["conditions"][0];
  index: number;
  onChange: (index: number, field: keyof Rule["conditions"][0], value: string | string[]) => void;
  onRemove: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-slate-700">Condition #{index + 1}</h4>
        <motion.button
          onClick={() => onRemove(index)}
          whileTap={{ scale: 0.9 }}
          className="text-slate-400 hover:text-rose-500"
        >
          <Trash2 size={16} />
        </motion.button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Field</label>
          <select
            value={condition.field}
            onChange={(e) => onChange(index, "field", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            {CONDITION_FIELDS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => onChange(index, "operator", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Values (comma-separated)</label>
          <input
            type="text"
            value={condition.value.join(", ")}
            onChange={(e) => onChange(index, "value", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
            placeholder="e.g., reduc, sav, impro"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </motion.div>
  );
}

function RuleCard({
  rule,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  evidenceIds,
}: {
  rule: Rule;
  index: number;
  onUpdate: (index: number, field: keyof Rule, value: unknown) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  evidenceIds: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [patternValid, setPatternValid] = useState(true);
  const [showRegexHelp, setShowRegexHelp] = useState(false);

  useEffect(() => {
    try {
      new RegExp(rule.pattern.value);
      setPatternValid(true);
    } catch {
      setPatternValid(false);
    }
  }, [rule.pattern.value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${expanded ? "border-blue-300 bg-blue-50/50" : "border-slate-200"} p-5 space-y-4`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <motion.button
              onClick={() => setExpanded(!expanded)}
              whileTap={{ scale: 0.95 }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </motion.button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rule.id}
                onChange={(e) => onUpdate(index, "id", e.target.value)}
                className="font-mono text-sm bg-transparent border-none outline-none w-48"
              />
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${SEVERITY_COLORS[rule.severity]}`}>
                {rule.severity}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${CATEGORY_ICONS[rule.category] ? "" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                {CATEGORY_ICONS[rule.category]}
                {rule.category}
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600 truncate">{rule.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            onClick={() => onDuplicate(index)}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Duplicate"
          >
            <Plus size={14} className="mr-1" /> Duplicate
          </motion.button>
          <motion.button
            onClick={() => onRemove(index)}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
            title="Delete"
          >
            <Trash2 size={14} className="mr-1" /> Delete
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-4 border-t border-slate-200"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => onUpdate(index, "name", e.target.value)}
                  placeholder="e.g., Unsupported Metric Claim"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                <select
                  value={rule.category}
                  onChange={(e) => onUpdate(index, "category", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Severity</label>
                <select
                  value={rule.severity}
                  onChange={(e) => onUpdate(index, "severity", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                Regex Pattern
                <motion.button
                  onClick={() => setShowRegexHelp(!showRegexHelp)}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showRegexHelp ? <EyeOff size={14} /> : <Eye size={14} />} Regex Help
                </motion.button>
                {!patternValid && <span className="text-rose-500 text-xs">Invalid regex</span>}
              </label>
              <div className="relative">
                <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={rule.pattern.value}
                  onChange={(e) => onUpdate(index, "pattern", { ...rule.pattern, value: e.target.value })}
                  placeholder="e.g., \\d+%"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border font-mono text-sm outline-none focus:border-blue-400 ${
                    patternValid ? "border-slate-200" : "border-rose-400 bg-rose-50"
                  }`}
                />
              </div>
              {showRegexHelp && (
                <div className="mt-2 p-3 rounded-lg bg-slate-50 text-xs text-slate-600 space-y-1 font-mono">
                  <p><span className="font-semibold">Common patterns:</span></p>
                  <p><code>\\d+%</code> — percentages (e.g., 80%)</p>
                  <p><code>\\d+</code> — any number</p>
                  <p><code>(world's|#1|best in class|fastest)</code> — superlatives</p>
                  <p><code>\\bclient\\b</code> — word boundary match for "client"</p>
                  <p><code>SOC ?2|ISO ?27001|GDPR</code> — compliance terms</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-2">
                Conditions (all must match)
                <motion.button
                  onClick={() => onUpdate(index, "conditions", [...rule.conditions, { field: "claim.text", operator: "contains_any", value: [] }])}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  <Plus size={14} className="mr-1" /> Add Condition
                </motion.button>
              </label>
              <AnimatePresence mode="popLayout">
                {rule.conditions.map((cond, ci) => (
                  <ConditionBuilder
                    key={`${index}-${ci}`}
                    condition={cond}
                    index={ci}
                    onChange={(ci, field, value) => {
                      const newConditions = [...rule.conditions];
                      newConditions[ci] = { ...newConditions[ci], [field]: value };
                      onUpdate(index, "conditions", newConditions);
                    }}
                    onRemove={(ci) => {
                      const newConditions = rule.conditions.filter((_, i) => i !== ci);
                      onUpdate(index, "conditions", newConditions);
                    }}
                  />
                ))}
              </AnimatePresence>
              {rule.conditions.length === 0 && (
                <p className="text-xs text-slate-400 italic">No conditions — rule matches on pattern alone</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Evidence IDs (comma-separated)</label>
              <input
                type="text"
                value={rule.evidenceIds.join(", ")}
                onChange={(e) => onUpdate(index, "evidenceIds", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
                placeholder="e.g., claim-policy-metrics, northwind-integrations"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {evidenceIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100"
                    onClick={() => onUpdate(index, "evidenceIds", [...new Set([...rule.evidenceIds, id])])}
                  >
                    {id}
                    <Plus size={10} />
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Explanation Template</label>
                <textarea
                  value={rule.explanationTemplate}
                  onChange={(e) => onUpdate(index, "explanationTemplate", e.target.value)}
                  rows={3}
                  placeholder='Use "{matched_text}", "{matched_number}", "{evidence_sources}", "{approved_number}"'
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
                />
                <p className="mt-1 text-xs text-slate-400">Variables: {"{"}matched_text{"}"}, {"{"}matched_number{"}"}, {"{"}evidence_sources{"}"}, {"{"}approved_number{"}"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Recommendation Template</label>
                <textarea
                  value={rule.recommendationTemplate}
                  onChange={(e) => onUpdate(index, "recommendationTemplate", e.target.value)}
                  rows={3}
                  placeholder='Use "{matched_text}", "{matched_number}", "{evidence_sources}", "{approved_number}"'
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
                />
                <p className="mt-1 text-xs text-slate-400">Variables: {"{"}matched_text{"}"}, {"{"}matched_number{"}"}, {"{"}evidence_sources{"}"}, {"{"}approved_number{"}"}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Handler (optional)</label>
              <input
                type="text"
                value={rule.handler ?? ""}
                onChange={(e) => onUpdate(index, "handler", e.target.value || undefined)}
                placeholder="e.g., product-spec-mismatch"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <p className="mt-1 text-xs text-slate-400">Special handler name for complex logic (e.g., number comparison). Leave empty for default.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function RuleBuilder({
  rulePack,
  onSave,
  onValidate,
  onTest,
  loading,
}: RuleBuilderProps) {
  const [rules, setRules] = useState<Rule[]>(rulePack?.rules ?? []);
  const [metadata, setMetadata] = useState({
    rulesVersion: rulePack?.rulesVersion ?? "1.0",
    description: rulePack?.description ?? "",
    author: rulePack?.author ?? "Inkloom AI",
    createdAt: rulePack?.createdAt ?? new Date().toISOString().split("T")[0],
  });
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [testText, setTestText] = useState("");
  const [testResults, setTestResults] = useState<{ findings: string; passed: boolean } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [yamlOutput, setYamlOutput] = useState("");

  useEffect(() => {
    if (rulePack) {
      setRules(rulePack.rules);
      setMetadata({
        rulesVersion: rulePack.rulesVersion,
        description: rulePack.description,
        author: rulePack.author,
        createdAt: rulePack.createdAt,
      });
    }
  }, [rulePack]);

  useEffect(() => {
    const ids = new Set<string>();
    rules.forEach((r) => r.evidenceIds.forEach((id) => ids.add(id)));
    setEvidenceIds(Array.from(ids).sort());
  }, [rules]);

  useEffect(() => {
    const yaml = `# Inkloom Policy-as-Code Rule Pack
# Auto-generated — edit via Rule Builder UI

rulesVersion: "${metadata.rulesVersion}"
description: "${metadata.description}"
author: "${metadata.author}"
createdAt: "${metadata.createdAt}"

rules:
${rules.map((r) => `  - id: "${r.id}"
    name: "${r.name}"
    category: "${r.category}"
    severity: "${r.severity}"
    pattern:
      type: "regex"
      value: "${r.pattern.value.replace(/"/g, '\\"')}"
    conditions:
${r.conditions.length > 0
  ? r.conditions
      .map(
        (c) => `      - field: "${c.field}"
        operator: "${c.operator}"
        value: ${JSON.stringify(c.value)}`
      )
      .join("\n")
  : "      []"}
    evidenceIds: ${JSON.stringify(r.evidenceIds)}
    explanationTemplate: "${r.explanationTemplate.replace(/"/g, '\\"')}"
    recommendationTemplate: "${r.recommendationTemplate.replace(/"/g, '\\"')}"
${r.handler ? `    handler: "${r.handler}"` : ""}`
).join("\n\n")}
`;
    setYamlOutput(yaml);
  }, [rules, metadata]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateRule = (index: number, field: keyof Rule, value: unknown) => {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateRule = (index: number) => {
    setRules((prev) => {
      const rule = prev[index];
      const newRule: Rule = {
        ...rule,
        id: `${rule.id}-copy-${Date.now()}`,
        name: `${rule.name} (copy)`,
      };
      return [...prev.slice(0, index + 1), newRule, ...prev.slice(index + 1)];
    });
  };

  const addRule = () => {
    const newRule: Rule = {
      id: `custom-rule-${Date.now()}`,
      name: "New Rule",
      category: "Claim verification",
      severity: "Medium",
      pattern: { type: "regex", value: "" },
      conditions: [],
      evidenceIds: [],
      explanationTemplate: "The campaign contains a claim matching {matched_text} with no approved source.",
      recommendationTemplate: "Remove the claim or attach approved supporting evidence from {evidence_sources}.",
    };
    setRules((prev) => [...prev, newRule]);
  };

  const handleSave = async () => {
    const pack: RulePack = { ...metadata, rules };
    const { valid, errors } = onValidate(pack);
    if (!valid) {
      showToast(`Validation failed: ${errors.join(", ")}`, "error");
      return;
    }
    setToast({ message: "Saving rule pack...", type: "info" });
    try {
      await onSave(pack);
      showToast("Rule pack saved successfully!", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed", "error");
    }
  };

  const handleValidate = () => {
    const pack: RulePack = { ...metadata, rules };
    const { valid, errors } = onValidate(pack);
    if (valid) {
      showToast("Rule pack is valid!", "success");
    } else {
      showToast(`Validation errors: ${errors.join("; ")}`, "error");
    }
  };

  const handleTest = async () => {
    if (!testText.trim()) {
      showToast("Enter text to test against", "error");
      return;
    }
    setShowTestPanel(true);
    setTestResults(null);
    try {
      await onTest({ ...metadata, rules }, testText);
      setTestResults({ findings: "Test completed — check console for details", passed: true });
    } catch (error) {
      setTestResults({ findings: error instanceof Error ? error.message : "Test failed", passed: false });
    }
  };

  const copyYaml = () => {
    navigator.clipboard.writeText(yamlOutput);
    showToast("YAML copied to clipboard!", "success");
  };

  return (
    <div className="space-y-6">
      <ToastProvider>
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-blue-600">
                <Sparkles size={14} /> Policy-as-Code Rule Builder
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Write governance rules in YAML — no code deploys</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Define regex patterns, conditions, evidence links, and fix templates. Rules are versioned, testable, and hot-reloadable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.button onClick={handleValidate} disabled={loading} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <CheckCircle2 size={16} /> Validate
              </motion.button>
              <motion.button onClick={handleSave} disabled={loading} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                <Save size={16} /> Save Rule Pack
              </motion.button>
              <motion.button onClick={() => setShowTestPanel(!showTestPanel)} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100">
                <Zap size={16} /> {showTestPanel ? "Hide" : "Test"} Rules
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Metadata */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="font-bold mb-4">Rule Pack Metadata</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Version</label>
              <input
                type="text"
                value={metadata.rulesVersion}
                onChange={(e) => setMetadata({ ...metadata, rulesVersion: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Author</label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Created</label>
              <input
                type="date"
                value={metadata.createdAt}
                onChange={(e) => setMetadata({ ...metadata, createdAt: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
              <textarea
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                rows={2}
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </motion.section>

        {/* Add Rule Button */}
        <motion.button
          onClick={addRule}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-xs mx-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          <Plus size={18} /> Add New Rule
        </motion.button>

        {/* Rules List */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {rules.length === 0 ? (
            <motion.div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200">
              <FileText className="mx-auto text-slate-300" size={48} />
              <p className="mt-4 font-bold text-slate-600">No rules yet</p>
              <p className="mt-1 text-sm text-slate-400">Click "Add New Rule" to create your first governance rule</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {rules.map((rule, index) => (
                <RuleCard
                  key={`${rule.id}-${index}`}
                  rule={rule}
                  index={index}
                  onUpdate={updateRule}
                  onRemove={removeRule}
                  onDuplicate={duplicateRule}
                  evidenceIds={evidenceIds}
                />
              ))}
            </AnimatePresence>
          )}
        </motion.section>

        {/* Test Panel */}
        <AnimatePresence>
          {showTestPanel && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-violet-800 flex items-center gap-2">
                  <Zap size={20} /> Test Rules Against Text
                </h3>
                <motion.button onClick={() => setShowTestPanel(false)} whileTap={{ scale: 0.9 }} className="text-violet-500 hover:text-violet-700">
                  <X size={20} />
                </motion.button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Test Content</label>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    rows={6}
                    placeholder="Paste campaign copy here to test rules..."
                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <motion.button onClick={handleTest} disabled={loading || !testText.trim()} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                  <Loader2 size={16} className={loading ? "animate-spin" : "hidden"} />
                  Run Test
                </motion.button>
                {testResults && (
                  <div className={`rounded-lg p-4 ${testResults.passed ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">{testResults.findings}</pre>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* YAML Output */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Code2 size={20} /> Generated YAML (rules/v1/northwind-governance.yaml)
            </h3>
            <motion.button onClick={copyYaml} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Copy size={14} /> Copy YAML
            </motion.button>
          </div>
          <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 text-xs overflow-x-auto max-h-96 font-mono leading-relaxed">
            {yamlOutput}
          </pre>
        </motion.section>

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
              {toast.type === "error" && <AlertCircle size={18} />}
              {toast.type === "info" && <Info size={18} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
        <ToastViewport />
      </ToastProvider>
    </div>
  );
}