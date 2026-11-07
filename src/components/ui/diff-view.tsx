"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { diffLines } from "diff";

interface DiffLine {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function DiffView({ original, corrected }: { original: string; corrected: string }) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");
  const [contextLines, setContextLines] = useState(3);

  const diff = useMemo(() => diffLines(original, corrected), [original, corrected]);

  const sideBySide = useMemo(() => {
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    let leftLineNum = 0;
    let rightLineNum = 0;

    for (const part of diff) {
      const lines = part.value.split("\n");
      for (const line of lines) {
        if (part.added) {
          right.push({ value: line, added: true });
          rightLineNum++;
          left.push({ value: "", removed: false }); // placeholder for alignment
        } else if (part.removed) {
          left.push({ value: line, removed: true });
          leftLineNum++;
          right.push({ value: "", added: false }); // placeholder for alignment
        } else {
          left.push({ value: line });
          right.push({ value: line });
          leftLineNum++;
          rightLineNum++;
        }
      }
    }
    return { left, right };
  }, [diff]);

  const unified = useMemo(() => {
    const result: (DiffLine & { lineNum?: number })[] = [];
    let lineNum = 0;
    for (const part of diff) {
      const lines = part.value.split("\n");
      for (const line of lines) {
        if (part.added) {
          result.push({ value: line, added: true, lineNum: ++lineNum });
        } else if (part.removed) {
          result.push({ value: line, removed: true, lineNum: lineNum });
        } else {
          result.push({ value: line, lineNum: ++lineNum });
        }
      }
    }
    return result;
  }, [diff]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 p-3 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Diff view</span>
          <div className="flex rounded-lg bg-white border border-slate-200 p-1">
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                viewMode === "side-by-side" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode("unified")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                viewMode === "unified" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unified
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Context lines:</span>
          <select
            value={contextLines}
            onChange={(e) => setContextLines(Number(e.target.value))}
            className="rounded border border-slate-200 px-2 py-1 text-sm bg-white"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700">
            <GitBranch size={12} /> Deterministic
          </span>
        </div>
      </div>

      {/* Diff Content */}
      <div className="max-h-[500px] overflow-auto font-mono text-sm">
        {viewMode === "side-by-side" ? (
          <div className="grid grid-cols-2">
            {/* Original */}
            <div className="border-r border-slate-200 bg-rose-50/30">
              <div className="sticky top-0 bg-rose-50/30 border-b border-slate-200 px-3 py-2 text-xs font-semibold text-rose-700">
                Original
              </div>
              <pre className="p-3 m-0">{sideBySide.left.map((line, i) => (
                <motion.div
                  key={i}
                  className={`flex border-b border-slate-100 last:border-0 ${line.removed ? "bg-rose-100" : ""}`}
                >
                  <span className="w-8 text-right text-slate-400 pr-3 select-none user-select-none">
                    {line.removed ? i + 1 : ""}
                  </span>
                  <span className={`flex-1 px-3 py-1 ${line.removed ? "line-through text-rose-700" : "text-slate-600"}`}>
                    {line.value || " "}
                  </span>
                </motion.div>
              ))}</pre>
            </div>

            {/* Corrected */}
            <div className="bg-emerald-50/30">
              <div className="sticky top-0 bg-emerald-50/30 border-b border-slate-200 px-3 py-2 text-xs font-semibold text-emerald-700">
                Corrected
              </div>
              <pre className="p-3 m-0">{sideBySide.right.map((line, i) => (
                <motion.div
                  key={i}
                  className={`flex border-b border-slate-100 last:border-0 ${line.added ? "bg-emerald-100" : ""}`}
                >
                  <span className="w-8 text-right text-slate-400 pr-3 select-none user-select-none">
                    {line.added ? i + 1 : ""}
                  </span>
                  <span className={`flex-1 px-3 py-1 ${line.added ? "font-medium text-emerald-800" : "text-slate-600"}`}>
                    {line.value || " "}
                  </span>
                </motion.div>
              ))}</pre>
            </div>
          </div>
        ) : (
          <div className="bg-white">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              Unified Diff
            </div>
            <pre className="p-3 m-0">{unified.map((line, i) => (
              <motion.div
                key={i}
                className={`flex border-b border-slate-100 last:border-0 ${
                  line.added ? "bg-emerald-50" : line.removed ? "bg-rose-50" : ""
                }`}
              >
                <span className="w-8 text-right text-slate-400 pr-3 select-none user-select-none">
                  {line.lineNum ?? ""}
                </span>
                <span className={`flex-1 px-3 py-1 ${
                  line.added ? "text-emerald-800" : line.removed ? "line-through text-rose-700" : "text-slate-600"
                }`}>
                  {line.added ? "+" : line.removed ? "-" : " "}{line.value}
                </span>
              </motion.div>
            ))}</pre>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between border-t border-slate-100 p-3 bg-slate-50 text-xs text-slate-600">
        <span>
          {diff.filter((d) => d.added).reduce((a, b) => a + b.value.split("\n").length - 1, 0)} additions,
          {diff.filter((d) => d.removed).reduce((a, b) => a + b.value.split("\n").length - 1, 0)} deletions
        </span>
        <span className="text-slate-400">Deterministic diff — no AI involved</span>
      </div>
    </div>
  );
}