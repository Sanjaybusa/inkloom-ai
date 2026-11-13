"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, AlertCircle, Shield, Database, FileText, TrendingUp, Target, Zap, Activity } from "lucide-react";

interface Finding {
  id: string;
  title: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  status: string;
  evidenceId?: string;
  recommendation?: string;
}

interface EvidenceRecord {
  id: string;
  category: string;
  source: string;
  version: string;
  passage: string;
  approved: boolean;
}

interface GovernanceRun {
  id: string;
  created_at: string;
  findings: Finding[];
  claimsChecked: number;
  status: string;
}

const SEVERITY_COLORS = {
  High: { bg: "bg-rose-500", text: "text-rose-600", border: "border-rose-200", darkBg: "bg-rose-900/30", darkBorder: "border-rose-800" },
  Medium: { bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-200", darkBg: "bg-amber-900/30", darkBorder: "border-amber-800" },
  Low: { bg: "bg-slate-500", text: "text-slate-600", border: "border-slate-200", darkBg: "bg-slate-900/30", darkBorder: "border-slate-800" },
};

const CATEGORY_COLORS: Record<string, { bg: string; icon: typeof Shield }> = {
  "Claim verification": { bg: "bg-blue-500", icon: Shield },
  "Fact verification": { bg: "bg-emerald-500", icon: Database },
  "Brand consistency": { bg: "bg-violet-500", icon: FileText },
  "Accessibility": { bg: "bg-amber-500", icon: Target },
};

export function FindingsHeatmap({ findings }: { findings: Finding[] }) {
  const categories = ["Claim verification", "Fact verification", "Brand consistency", "Accessibility"];
  const severities: ("High" | "Medium" | "Low")[] = ["High", "Medium", "Low"];

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    categories.forEach(cat => { m[cat] = { High: 0, Medium: 0, Low: 0 }; });
    findings.forEach(f => {
      if (m[f.category]) m[f.category][f.severity]++;
    });
    return m;
  }, [findings]);

  const maxCount = useMemo(() => Math.max(...Object.values(matrix).flatMap(v => Object.values(v)), 1), [matrix]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">Findings Heatmap</h3>
        <div className="flex items-center gap-4 text-xs">
          {severities.map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${SEVERITY_COLORS[s].bg}`} />
              <span className="text-slate-500 dark:text-slate-400">{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
              {severities.map(s => (
                <th key={s} className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{s}</th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => {
              const Icon = CATEGORY_COLORS[cat]?.icon || Shield;
              const row = matrix[cat] || { High: 0, Medium: 0, Low: 0 };
              const total = row.High + row.Medium + row.Low;
              return (
                <motion.tr key={cat} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]?.bg || "bg-slate-500"}`} />
                    <Icon className="w-4 h-4" style={{ color: CATEGORY_COLORS[cat]?.bg?.replace("bg-", "") || "#64748b" }} />
                    {cat}
                  </td>
                  {severities.map(s => {
                    const count = row[s];
                    const intensity = count / maxCount;
                    return (
                      <td key={s} className="px-3 py-3 text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.05 + 0.1, type: "spring", stiffness: 300 }}
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all ${
                            count > 0
                              ? `${SEVERITY_COLORS[s].bg} text-white shadow-${s.toLowerCase()}`
                              : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                          }`}
                          style={{ opacity: count > 0 ? 0.7 + intensity * 0.3 : 0.3 }}
                        >
                          {count > 0 ? count : "—"}
                        </motion.div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    <span className={`px-3 py-1 rounded-full text-sm ${total > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-100 text-slate-500"}`}>
                      {total}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GovernanceScoreTrend({ runs }: { runs: GovernanceRun[] }) {
  const data = useMemo(() => {
    return runs
      .slice(-10)
      .map((r, i) => {
        const high = r.findings.filter(f => f.severity === "High").length;
        const medium = r.findings.filter(f => f.severity === "Medium").length;
        const low = r.findings.filter(f => f.severity === "Low").length;
        const score = Math.max(0, 100 - high * 15 - medium * 8 - low * 3);
        return {
          label: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score,
          high,
          medium,
          low,
          claims: r.claimsChecked,
        };
      })
      .reverse();
  }, [runs]);

  const maxScore = Math.max(...data.map(d => d.score), 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">Governance Score Trend</h3>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {data.length > 1 && data[data.length - 1].score > data[data.length - 2].score ? "+" : ""}
            {data.length > 1 ? data[data.length - 1].score - data[data.length - 2].score : 0}
          </span>
        </div>
      </div>
      <div className="h-48 relative">
        <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 380 + 10;
              const y = 170 - (d.score / maxScore) * 150;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            }).join(" ")}
            stroke="#3b82f6"
            strokeWidth="3"
            fill="none"
            className="dark:stroke-blue-400"
          />
          <path
            d={["M 10 170", ...data.map((d, i) => {
              const x = (i / (data.length - 1)) * 380 + 10;
              const y = 170 - (d.score / maxScore) * 150;
              return `L ${x} ${y}`;
            }), "L 390 170", "Z"].join(" ")}
            fill="url(#areaGradient)"
          />
          {data.map((d, i) => (
            <motion.g key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, type: "spring" }}>
              <circle
                cx={(i / (data.length - 1)) * 380 + 10}
                cy={170 - (d.score / maxScore) * 150}
                r={6}
                fill="#3b82f6"
                className="dark:fill-blue-400"
              />
              <text
                x={(i / (data.length - 1)) * 380 + 10}
                y={160 - (d.score / maxScore) * 150}
                textAnchor="middle"
                fontSize="10"
                fill="#3b82f6"
                className="dark:fill-blue-400"
              >
                {d.score}
              </text>
            </motion.g>
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-slate-400">
          {data.map((d, i) => (
            <span key={i} style={{ left: `${(i / (data.length - 1)) * 100}%` }}>{d.label}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {data[data.length - 1] && [
          { label: "Score", value: data[data.length - 1].score, icon: Target, color: "text-blue-500" },
          { label: "High", value: data[data.length - 1].high, icon: AlertTriangle, color: "text-rose-500" },
          { label: "Medium", value: data[data.length - 1].medium, icon: AlertCircle, color: "text-amber-500" },
          { label: "Claims", value: data[data.length - 1].claims, icon: Activity, color: "text-violet-500" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function EvidenceNetworkGraph({ evidence, findings }: { evidence: EvidenceRecord[]; findings: Finding[] }) {
  const evidenceByCategory = useMemo(() => {
    const map: Record<string, EvidenceRecord[]> = {};
    evidence.forEach(e => {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    });
    return map;
  }, [evidence]);

  const findingsByEvidence = useMemo(() => {
    const map: Record<string, Finding[]> = {};
    findings.forEach(f => {
      if (f.evidenceId) {
        if (!map[f.evidenceId]) map[f.evidenceId] = [];
        map[f.evidenceId].push(f);
      }
    });
    return map;
  }, [findings]);

  const categories = Object.keys(evidenceByCategory);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 dark:text-white">Evidence ↔ Findings Network</h3>
      <div className="space-y-3">
        {categories.map((cat, catIndex) => {
          const Icon = CATEGORY_COLORS[cat]?.icon || Shield;
          const items = evidenceByCategory[cat];
          const categoryColor = CATEGORY_COLORS[cat]?.bg || "bg-slate-500";
          const colorHex = categoryColor.replace("bg-", "").replace("-500", "");

          return (
            <motion.div key={cat} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: catIndex * 0.1 }} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <span className={`w-2 h-2 rounded-full ${categoryColor}`} />
                <Icon className="w-4 h-4" style={{ color: `#${colorHex}` }} />
                {cat} <span className="text-slate-400">({items.length})</span>
              </div>
              <div className="ml-6 space-y-1.5">
                {items.slice(0, 8).map((item, i) => {
                  const refs = findingsByEvidence[item.id] || [];
                  const hasHigh = refs.some(f => f.severity === "High");
                  const hasMedium = refs.some(f => f.severity === "Medium");
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: catIndex * 0.1 + i * 0.03 }} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-400 truncate">{item.id}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.source}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {refs.length > 0 && (
                          <>
                            {hasHigh && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="High severity finding" />}
                            {hasMedium && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Medium severity finding" />}
                            {!hasHigh && !hasMedium && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Low severity finding" />}
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{refs.length}</span>
                          </>
                        )}
                        {refs.length === 0 && <span className="text-xs text-slate-300 dark:text-slate-500">Unused</span>}
                      </div>
                    </motion.div>
                  );
                })}
                {items.length > 8 && (
                  <div className="ml-2 text-xs text-slate-400 italic">+{items.length - 8} more records</div>
                )}
              </div>
            </motion.div>
          );
        })}
        {categories.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Database className="mx-auto text-slate-300" size={32} />
            <p className="mt-2">No evidence records to visualize</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SeverityRadial({ findings }: { findings: Finding[] }) {
  const counts = useMemo(() => ({
    High: findings.filter(f => f.severity === "High").length,
    Medium: findings.filter(f => f.severity === "Medium").length,
    Low: findings.filter(f => f.severity === "Low").length,
  }), [findings]);

  const total = counts.High + counts.Medium + counts.Low;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const highPercent = total ? counts.High / total : 0;
  const mediumPercent = total ? counts.Medium / total : 0;
  const lowPercent = total ? counts.Low / total : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" className="dark:stroke-slate-700" />
          {highPercent > 0 && (
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: highPercent }}
              transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
              d={`M80 80 m0 -${radius} a${radius},${radius} 0 1,0 0,${2*radius} a${radius},${radius} 0 1,0 0,-${2*radius}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="12"
              strokeLinecap="round"
            />
          )}
          {mediumPercent > 0 && (
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: mediumPercent }}
              transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
              d={`M80 80 m0 -${radius} a${radius},${radius} 0 1,0 0,${2*radius} a${radius},${radius} 0 1,0 0,-${2*radius}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${highPercent * circumference} ${circumference}`}
              strokeDashoffset={-highPercent * circumference}
            />
          )}
          {lowPercent > 0 && (
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: lowPercent }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
              d={`M80 80 m0 -${radius} a${radius},${radius} 0 1,0 0,${2*radius} a${radius},${radius} 0 1,0 0,-${2*radius}`}
              fill="none"
              stroke="#64748b"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(highPercent + mediumPercent) * circumference} ${circumference}`}
              strokeDashoffset={-(highPercent + mediumPercent) * circumference}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{total}</p>
            <p className="text-xs text-slate-500">Total Findings</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {[
          { label: "High", count: counts.High, color: "text-rose-500", bg: "bg-rose-500" },
          { label: "Medium", count: counts.Medium, color: "text-amber-500", bg: "bg-amber-500" },
          { label: "Low", count: counts.Low, color: "text-slate-500", bg: "bg-slate-500" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded ${item.bg}`} />
            <span className={`font-medium ${item.color}`}>{item.label}</span>
            <span className="text-slate-500 dark:text-slate-400">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}