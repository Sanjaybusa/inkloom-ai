"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  Database,
  FileText,
  Shield,
  Eye,
  X,
  Copy,
} from "lucide-react";
import Link from "next/link";

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

export default function EvidenceLibrary() {
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
    try {
      const response = await fetch("/api/content/northwind-q4");
      if (response.ok) {
        const run = await response.json();
        const refs: Record<string, FindingRef[]> = {};
        for (const finding of run.findings || []) {
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
  }, []);

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
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
                <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">EVIDENCE LIBRARY</p>
              </div>
            </Link>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={14} /> Back to Workspace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
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
                                  <Link
                                    key={ref.findingId}
                                    href={`/?run=${ref.findingId}`}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${severityColor(ref.severity)} hover:opacity-80`}
                                  >
                                    <AlertCircle size={12} />
                                    {ref.findingTitle}
                                  </Link>
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
      </div>

      <footer className="pb-3 text-center text-xs text-slate-400">
        © 2026 Inkloom AI · Evidence library — deterministic, versioned, auditable.
      </footer>
    </div>
  );
}

// Need to add import
import { ShieldCheck } from "lucide-react";