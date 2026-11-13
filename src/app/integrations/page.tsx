"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Download,
  RotateCcw,
  Settings,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  History,
  BarChart2,
  Users,
  Shield,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Eye,
  Copy,
  AlertTriangle,
  Zap,
  Sparkles,
  Database,
  ArrowUpRight,
  MoreVertical,
  X,
  ExternalLink,
  Code2,
  Layout,
  Globe,
  GitBranch,
  PenTool,
  Brain,
  Check,
  Loader2,
  MessageSquare,
  Link2,
  Key,
  Unlock,
  RefreshCw,
  Share2,
  Layers,
  Target,
  Award,
  TrendingUp,
  Building2,
  Scale,
  Lock,
  UserCheck,
  Archive,
  BadgeCheck,
} from "lucide-react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { QRCodeSVG } from "qrcode.react";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEdited: string;
  content: string;
  governanceRun?: any;
}

interface GitHubPR {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  author: string;
  repo: string;
  governanceRun?: any;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"notion" | "github" | "demo">("demo");
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [githubPRs, setGitHubPRs] = useState<GitHubPR[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [demoContent, setDemoContent] = useState("");
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Mock Notion pages for demo
  useEffect(() => {
    setNotionPages([
      {
        id: "notion-1",
        title: "Q4 Launch Campaign - Northwind Insights",
        url: "https://notion.so/northwind/q4-launch",
        lastEdited: "2 hours ago",
        content: `Northwind Insights is the world's fastest analytics platform.
It connects to 12 data sources in the currently approved product fact sheet.
Our clients use our platform to improve reporting by 40%.
Northwind Analytics helps customers make better business decisions.`,
      },
      {
        id: "notion-2",
        title: "Security Features Announcement",
        url: "https://notion.so/northwind/security-features",
        lastEdited: "1 day ago",
        content: `Introducing enterprise-grade security with SOC 2 Type II certification.
Our platform now offers end-to-end encryption for all data at rest and in transit.
We maintain 99.99% uptime with zero security incidents in 2026.
Penetration testing completed by third-party auditors.`,
      },
      {
        id: "notion-3",
        title: "AI Capabilities Blog Post",
        url: "https://notion.so/northwind/ai-capabilities",
        lastEdited: "3 days ago",
        content: `Northwind AI predicts customer churn with 95% accuracy.
Our machine learning models are trained on proprietary datasets.
The AI assistant reduces manual analysis time by 80%.
Industry-leading natural language query interface.`,
      },
    ]);
  }, []);

  // Mock GitHub PRs for demo
  useEffect(() => {
    setGitHubPRs([
      {
        number: 234,
        title: "feat: Add real-time collaboration to dashboards",
        url: "https://github.com/northwind/insights/pull/234",
        state: "open",
        author: "sarah-chen",
        repo: "northwind/insights",
      },
      {
        number: 231,
        title: "docs: Update API reference for v3.2",
        url: "https://github.com/northwind/insights/pull/231",
        state: "merged",
        author: "marcus-johnson",
        repo: "northwind/insights",
      },
      {
        number: 228,
        title: "fix: Resolve contrast issues in dark mode",
        url: "https://github.com/northwind/insights/pull/228",
        state: "closed",
        author: "priya-patel",
        repo: "northwind/insights",
      },
    ]);
  }, []);

  const runNotionGovernance = async (page: NotionPage) => {
    setLoading(true);
    showToast("Analyzing Notion page...", "info");
    try {
      const response = await fetch("/api/integrations/notion/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: page.id,
          content: page.content,
          content_id: page.id,
          title: page.title,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analysis failed");
      setNotionPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, governanceRun: data } : p)));
      showToast("Governance check complete!", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const runGitHubGovernance = async (pr: GitHubPR) => {
    setLoading(true);
    showToast("Analyzing GitHub PR...", "info");
    try {
      const response = await fetch("/api/integrations/github/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "opened",
          pull_request: { title: pr.title, body: "", number: pr.number },
          repository: { full_name: pr.repo },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analysis failed");
      setGitHubPRs((prev) => prev.map((p) => (p.number === pr.number ? { ...p, governanceRun: data } : p)));
      showToast("Governance check complete!", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const runDemoGovernance = async () => {
    if (!demoContent.trim()) {
      showToast("Enter content to analyze", "error");
      return;
    }
    setDemoRunning(true);
    showToast("Running governance check...", "info");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demoContent, contentId: "demo-integration" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Analysis failed");
      setDemoResult(data);
      showToast("Analysis complete!", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed", "error");
    } finally {
      setDemoRunning(false);
    }
  };

  const connectNotion = () => {
    window.location.href = "/api/integrations/notion/oauth";
  };

  const connectGitHub = () => {
    window.location.href = "https://github.com/apps/inkloom/installations/new";
  };

  const severityColor = (severity: string) =>
    severity === "High" ? "bg-rose-500" : severity === "Medium" ? "bg-amber-500" : "bg-slate-500";

  const statusConfig = {
    open: { label: "Open", color: "bg-blue-500", bg: "bg-blue-50 text-blue-700" },
    closed: { label: "Closed", color: "bg-slate-500", bg: "bg-slate-50 text-slate-700" },
    merged: { label: "Merged", color: "bg-violet-500", bg: "bg-violet-50 text-violet-700" },
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f4f7fb]">
        {/* Demo Banner */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center"
        >
          <div className="max-w-[1500px] mx-auto flex items-center justify-center gap-3 text-xs font-semibold text-amber-800 flex-wrap">
            <Sparkles size={14} />
            <span>🔗 Live Integrations — Notion pages, GitHub PRs, real-time governance checks</span>
            <span className="font-mono">Deterministic engine • Evidence-backed • Policy-as-Code</span>
          </div>
        </motion.div>

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
                <Link2 size={22} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
                <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">LIVE INTEGRATIONS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Northwind Demo Org
              </span>
              <a href="/dashboard" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <FolderOpen size={14} /> Dashboard
              </a>
              <a href="/" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <ExternalLink size={14} /> Workspace
              </a>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="sticky top-[76px] z-20 border-b border-slate-200 bg-white px-4 py-2 md:px-8">
          <div className="mx-auto max-w-[1500px] flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[
                { id: "demo", label: "Live Demo", icon: Zap, desc: "Paste content → instant governance" },
                { id: "notion", label: "Notion", icon: PenTool, desc: "Analyze pages via webhook" },
                { id: "github", label: "GitHub", icon: GitBranch, desc: "PR checks with findings" },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    title={tab.desc}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </motion.button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {!notionConnected && (
                <motion.button onClick={connectNotion} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                  <Unlock size={14} /> Connect Notion
                </motion.button>
              )}
              {notionConnected && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} /> Notion Connected
                </span>
              )}
              {!githubConnected && (
                <motion.button onClick={connectGitHub} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">
                  <GitBranch size={14} /> Connect GitHub
                </motion.button>
              )}
              {githubConnected && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} /> GitHub Connected
                </span>
              )}
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
          {/* Live Demo Tab */}
          {activeTab === "demo" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Hero */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-blue-600">
                      <Zap size={14} className="animate-pulse" /> Live Governance Demo
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Paste any content. Get instant governance findings.</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      No setup required. Our deterministic engine checks claims against 15 approved evidence records across 4 categories.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button onClick={() => setDemoContent(`Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`)} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Load Sample</motion.button>
                    <motion.button onClick={() => setDemoContent("")} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</motion.button>
                  </div>
                </div>
              </motion.section>

              {/* Input & Results */}
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex justify-between gap-3 mb-4">
                    <label className="font-bold">Content to analyze</label>
                    <span className="text-xs text-slate-400 self-center">{demoContent.length} / 5,000</span>
                  </div>
                  <textarea
                    value={demoContent}
                    onChange={(e) => setDemoContent(e.target.value)}
                    rows={12}
                    placeholder="Paste marketing copy, blog post, PR description, or any text to check..."
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 font-mono text-xs"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <motion.button
                      onClick={runDemoGovernance}
                      disabled={demoRunning || !demoContent.trim()}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
                    >
                      {demoRunning ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap size={17} fill="currentColor" />
                          Run Governance Check
                        </>
                      )}
                    </motion.button>
                    {demoResult && (
                      <motion.button
                        onClick={() => setDemoResult(null)}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <RotateCcw size={14} /> New Analysis
                      </motion.button>
                    )}
                  </div>
                </motion.section>

                {/* Results Panel */}
                <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  {!demoResult ? (
                    <motion.div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                      <Zap className="mx-auto text-slate-300" size={48} />
                      <p className="mt-3 font-bold">Ready to analyze</p>
                      <p className="mt-1 text-xs text-slate-500">Paste content and run governance check to see findings.</p>
                      <div className="mt-4 flex justify-center gap-2 text-[10px] text-slate-400">
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">Claim Verification</span>
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Fact Verification</span>
                        <span className="px-2 py-1 rounded bg-violet-50 text-violet-700">Brand Consistency</span>
                        <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">Accessibility</span>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold">Analysis Results</h3>
                            <p className="mt-1 text-xs text-slate-400">{demoResult.findings?.length ?? 0} findings · {demoResult.claimsChecked ?? 0} claims checked</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{demoResult.status}</span>
                        </div>
                        {demoResult.findings && demoResult.findings.length > 0 && (
                          <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                            {demoResult.findings.slice(0, 5).map((finding: any, i: number) => (
                              <motion.div key={finding.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                  <motion.div className={`flex h-7 w-7 items-center justify-center rounded-xl ${severityColor(finding.severity)}`}><AlertTriangle size={14} className="text-white" /></motion.div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{finding.title}</p>
                                    <p className="text-xs text-slate-500">{finding.category}</p>
                                  </div>
                                  <span className="rounded-full px-2 py-1 text-[10px] font-semibold bg-slate-100 text-slate-600">{finding.severity}</span>
                                </div>
                                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{finding.explanation}</p>
                              </motion.div>
                            ))}
                            {demoResult.findings.length > 5 && (
                              <p className="text-xs text-slate-500 text-center">+{demoResult.findings.length - 5} more findings</p>
                            )}
                          </div>
                        )}
                        {!demoResult.findings || demoResult.findings.length === 0 ? (
                          <div className="mt-4 text-center text-sm text-emerald-600">
                            <CheckCircle2 className="inline mr-1" size={16} /> No findings — all claims supported!
                          </div>
                        ) : null}
                      </motion.div>

                      <motion.div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="font-bold">Quick Actions</h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <motion.button onClick={() => window.open(`/?demo=perfect`, "_blank")} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ExternalLink size={14} /> View in Workspace</motion.button>
                          <motion.button onClick={() => { const url = `${window.location.origin}/api/analyze`; navigator.clipboard.writeText(JSON.stringify({ text: demoContent, contentId: "demo" }, null, 2)); showToast("API request copied!", "success"); }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Code2 size={14} /> Copy API Request</motion.button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </motion.aside>
              </div>
            </motion.div>
          )}

          {/* Notion Tab */}
          {activeTab === "notion" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-violet-600">
                      <PenTool size={14} /> Notion Integration
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Governance-check Notion pages in one click.</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Paste a Notion page URL or connect your workspace. Our webhook extracts content, runs deterministic governance, and writes findings back as comments.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!notionConnected ? (
                      <motion.button onClick={connectNotion} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"><Unlock size={16} /> Connect Notion Workspace</motion.button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Connected to Northwind Demo Workspace</span>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* Notion Pages Grid */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-bold">Demo Pages</h2>
                  <p className="mt-1 text-xs text-slate-500">Click "Analyze" to run governance check on any page</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {notionPages.map((page, index) => (
                    <motion.div key={page.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex flex-col md:flex-row md:items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-lg truncate">{page.title}</h3>
                          <a href={page.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><ExternalLink size={10} /> Open in Notion</a>
                          <span className="text-xs text-slate-400">Edited {page.lastEdited}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500 line-clamp-2 font-mono text-xs">{page.content}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                        {page.governanceRun ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 size={10} /> Analyzed</span>
                            <span className="text-xs text-slate-500">{page.governanceRun.findings?.length ?? 0} findings</span>
                            <motion.button onClick={() => window.open(`/?run=${page.governanceRun.runId}`, "_blank")} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><ArrowUpRight size={12} /> View</motion.button>
                          </>
                        ) : (
                          <motion.button onClick={() => runNotionGovernance(page)} disabled={loading} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"><Zap size={12} /> Analyze</motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Integration Details */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold mb-4">How it works</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { step: 1, title: "Connect Workspace", desc: "OAuth install to your Notion workspace. We request read access to pages.", icon: Unlock },
                    { step: 2, title: "Webhook Trigger", desc: "On page edit or manual trigger, webhook sends content to Inkloom API.", icon: Zap },
                    { step: 3, title: "Deterministic Analysis", desc: "Rules engine evaluates claims against evidence — no AI hallucination.", icon: Brain },
                    { step: 4, title: "Findings as Comments", desc: "Results posted back to Notion page as threaded comments with evidence links.", icon: MessageSquare },
                    { step: 5, title: "Trust Passport", desc: "Full audit trail, evidence, and reviewer decisions generated automatically.", icon: BadgeCheck },
                    { step: 6, title: "CI/CD Integration", desc: "Block merges on High-severity findings. Passport published on approval.", icon: GitBranch },
                  ].map((item) => (
                    <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.step * 0.05 }} className="rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><item.icon size={20} /></div>
                        <span className="text-2xl font-bold text-violet-600">{item.step}</span>
                      </div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* GitHub Tab */}
          {activeTab === "github" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-slate-600">
                      <GitBranch size={14} /> GitHub Integration
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Governance checks on every pull request.</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Install the Inkloom GitHub App. On PR open/sync, we analyze changed content, post findings as review comments, and block merge on High-severity issues.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!githubConnected ? (
                      <motion.button onClick={connectGitHub} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"><GitBranch size={16} /> Install GitHub App</motion.button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Installed on northwind/insights</span>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* GitHub PRs */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-bold">Recent Pull Requests</h2>
                  <p className="mt-1 text-xs text-slate-500">Demo PRs — click "Analyze" to run governance check</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {githubPRs.map((pr, index) => {
                    const config = statusConfig[pr.state];
                    return (
                      <motion.div key={pr.number} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex flex-col md:flex-row md:items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <a href={pr.url} target="_blank" rel="noopener noreferrer" className="font-bold text-lg truncate hover:text-blue-600">#{pr.number}: {pr.title}</a>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${config.bg}`}>{config.label}</span>
                            <span className="text-xs text-slate-400 font-mono">{pr.repo}</span>
                            <span className="text-xs text-slate-400">by @{pr.author}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                          {pr.governanceRun ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 size={10} /> Checked</span>
                              <span className="text-xs text-slate-500">{pr.governanceRun.findings?.length ?? 0} findings</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${pr.governanceRun.conclusion === "failure" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{pr.governanceRun.conclusion === "failure" ? "✗ Blocked" : "✓ Passing"}</span>
                              <motion.button onClick={() => window.open(`/?run=${pr.governanceRun.runId}`, "_blank")} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><ArrowUpRight size={12} /> View</motion.button>
                            </>
                          ) : (
                            <motion.button onClick={() => runGitHubGovernance(pr)} disabled={loading} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"><Zap size={12} /> Analyze</motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>

              {/* GitHub Integration Flow */}
              <motion.section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold mb-4">PR Check Flow</h2>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { step: 1, title: "PR Opened", desc: "Developer opens PR with marketing copy changes", icon: GitBranch },
                    { step: 2, title: "Webhook Fires", desc: "GitHub sends PR payload to Inkloom webhook endpoint", icon: Zap },
                    { step: 3, title: "Content Extracted", desc: "Title, body, and changed files parsed for claims", icon: Code2 },
                    { step: 4, title: "Governance Run", desc: "Deterministic engine checks against evidence library", icon: Brain },
                    { step: 5, title: "Check Created", desc: "GitHub Check Run created with findings summary", icon: BadgeCheck },
                    { step: 6, title: "Comments Posted", desc: "Inline comments on flagged lines with evidence links", icon: MessageSquare },
                    { step: 7, title: "Merge Gate", desc: "High-severity findings block merge via branch protection", icon: Lock },
                    { step: 8, title: "Passport on Approve", desc: "Trust Passport generated when PR approved & merged", icon: Award },
                  ].map((item) => (
                    <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.step * 0.05 }} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><item.icon size={16} /></div>
                        <span className="text-xl font-bold text-slate-600">{item.step}</span>
                      </div>
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* Footer */}
          <footer className="pt-6 pb-3 text-center text-xs text-slate-400 border-t border-slate-200">
            © 2026 Inkloom AI · Live Integrations · Notion · GitHub · Deterministic Governance · Evidence-Backed
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
              {toast.type === "error" && <AlertCircle size={18} />}
              {toast.type === "info" && <Zap size={18} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
        <ToastViewport />
      </div>
    </ToastProvider>
  );
}