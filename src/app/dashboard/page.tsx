"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Search,
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
  Users,
  Shield,
  AlertTriangle,
  Zap,
  Sparkles,
  Database,
  ArrowUpRight,
  X,
  Loader2,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import {
  SkeletonCard,
  SkeletonMetric,
} from "@/components/ui/skeleton";

import type { ReviewDecision, CampaignWithStats, CampaignStatus } from "@/lib/governance";

type CampaignCard = CampaignWithStats;

type DashboardStats = {
  totalCampaigns: number;
  approved: number;
  pending: number;
  rejected: number;
  totalFindings: number;
  highPriority: number;
};

const SAMPLE_TEXT = `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`;

type CampaignDisplayStatus = CampaignStatus | "analyzed" | ReviewDecision;

const statusConfig: Record<CampaignDisplayStatus | "all", { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  all: { label: "All", color: "bg-blue-500", icon: FolderOpen, bg: "bg-blue-50 text-blue-700 border-blue-200" },
  approved: { label: "Approved", color: "bg-emerald-500", icon: CheckCircle2, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-rose-500", icon: XCircle, bg: "bg-rose-50 text-rose-700 border-rose-200" },
  changes_requested: { label: "Changes Requested", color: "bg-amber-500", icon: AlertCircle, bg: "bg-amber-50 text-amber-700 border-amber-200" },
  analyzed: { label: "Analyzed", color: "bg-blue-500", icon: Clock, bg: "bg-blue-50 text-blue-700 border-blue-200" },
  draft: { label: "Draft", color: "bg-slate-500", icon: FileText, bg: "bg-slate-50 text-slate-700 border-slate-200" },
  active: { label: "Active", color: "bg-blue-500", icon: Sparkles, bg: "bg-blue-50 text-blue-700 border-blue-200" },
  archived: { label: "Archived", color: "bg-slate-400", icon: XCircle, bg: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    totalFindings: 0,
    highPriority: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState<string | null>(null);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [analyzingCampaignId, setAnalyzingCampaignId] = useState<string | null>(null);
  const [newCampaignTitle, setNewCampaignTitle] = useState("");
  const [newCampaignText, setNewCampaignText] = useState(SAMPLE_TEXT);

  // Fetch campaigns on mount
  const fetchCampaigns = useCallback(async () => {
    setInitialLoading(true);
    try {
      const response = await fetch("/api/campaigns?withStats=true");
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      setCampaigns(data);

      // Compute stats
      const total = data.length;
      const approved = data.filter((c: CampaignCard) => c.decision === "approved").length;
      const rejected = data.filter((c: CampaignCard) => c.decision === "rejected").length;
      const pending = data.filter((c: CampaignCard) => c.decision === null && c.status !== "archived").length;
      const totalFindings = data.reduce((sum: number, c: CampaignCard) => sum + c.findingsCount, 0);
      const highPriority = data.reduce((sum: number, c: CampaignCard) => sum + c.highFindings, 0);

      setStats({
        totalCampaigns: total,
        approved,
        pending,
        rejected,
        totalFindings,
        highPriority,
      });
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    fetchCampaigns();
  }, []);

  // Deep link handling for campaign/run/finding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const runId = params.get("run");
    const findingId = params.get("finding");

    if (runId) {
      // Navigate to workspace page to check and analyze the run
      window.location.href = `/workspace?run=${encodeURIComponent(runId)}${findingId ? `&finding=${encodeURIComponent(findingId)}` : ""}`;
    }
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaignTitle?.trim() || !newCampaignText?.trim()) {
      showToast("Title and content are required", "error");
      return;
    }
    setLoading(true);
    showToast("Creating campaign...", "info");
    try {
      // Create campaign via API
      const createResponse = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCampaignTitle,
          description: newCampaignText,
          status: "draft",
        }),
      });
      const campaignData = await createResponse.json();
      if (!createResponse.ok) throw new Error(campaignData.message ?? "Campaign creation failed.");

      showToast("Campaign created successfully", "success", 2000);

      // Analyze the campaign
      const analyzeResponse = await fetch(`/api/campaigns/${campaignData.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newCampaignText }),
      });
      const runData = await analyzeResponse.json();
      if (!analyzeResponse.ok) throw new Error(runData.message ?? "Analysis failed.");

      // Refresh campaigns list
      await fetchCampaigns();
      setShowCreateModal(false);
      setNewCampaignTitle("");
      setNewCampaignText(SAMPLE_TEXT);
      showToast("Campaign created and analyzed! Opening workspace...", "success");

      // Redirect immediately to the check & analysis workspace
      if (runData?.id) {
        setTimeout(() => {
          window.location.href = `/workspace?run=${encodeURIComponent(runData.id)}`;
        }, 400);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create campaign", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = useCallback(async (campaignId: string, text: string) => {
    setAnalyzingCampaignId(campaignId);
    showToast("Running analysis...", "info");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Analysis failed.");
      await fetchCampaigns();
      showToast("Analysis complete!", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analysis failed", "error");
    } finally {
      setAnalyzingCampaignId(null);
    }
  }, [fetchCampaigns, showToast]);

  const handleBulkReanalyze = async () => {
    setLoading(true);
    showToast("Re-analyzing all campaigns...", "info");
    try {
      for (const campaign of campaigns) {
        if (campaign.runId) {
          const response = await fetch(`/api/campaigns/${campaign.id}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentId: campaign.runId }),
          });
          if (!response.ok) console.error(`Failed to re-analyze ${campaign.id}`);
        }
      }
      await fetchCampaigns();
      showToast("All campaigns re-analyzed!", "success");
    } catch {
      showToast("Bulk re-analysis failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    showToast("Preparing export...", "info");
    const lines = [
      "# Bulk Trust Passports Export",
      "",
      `Exported: ${new Date().toISOString()}`,
      `Campaigns: ${campaigns.length}`,
      "",
      ...campaigns.flatMap(c => [
        `## ${c.title}`,
        `Status: ${c.status}`,
        `Run: ${c.runId ?? "N/A"}`,
        `Version: ${c.version ?? "N/A"}`,
        `Findings: ${c.findingsCount}`,
        `High Priority: ${c.highFindings}`,
        `Reviewer: ${c.reviewer || "Not recorded"}`,
        `Decision: ${c.decision || "Pending"}`,
        `Analyzed: ${c.lastAnalyzedAt || "N/A"}`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bulk-trust-passports-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Bulk export downloaded!", "success");
    setShowBulkExport(false);
  };

  const nowRef = useRef<number>(0);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const updateNow = () => {
      const newNow = Date.now();
      nowRef.current = newNow;
      setNow(newNow);
    };
    updateNow(); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatRelativeTime = useCallback((iso?: string) => {
    if (!iso || now === 0) return "...";
    const diff = now - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, [now]);

  // Loading skeletons for initial load
  if (initialLoading) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-[#f4f7fb]">
          {/* Demo Mode Banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
            <div className="max-w-[1500px] mx-auto flex items-center justify-center gap-3 text-xs font-semibold text-amber-800">
              <Sparkles size={14} />
              <span>🎪 Demo Mode — Multi-campaign workspace with real API data | </span>
              <span className="font-mono">Deterministic engine • Evidence-backed • Policy-as-Code</span>
              <span className="ml-4 px-2 py-0.5 rounded bg-amber-100">v1.0 / northwind-demo-v2</span>
            </div>
          </div>

          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
            <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
                  <Shield size={22} />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
                  <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">MULTI-CAMPAIGN WORKSPACE</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Northwind Demo Org
                </span>
              </div>
            </div>
          </header>

          <nav className="sticky top-[76px] z-20 border-b border-slate-200 bg-white px-4 py-2 md:px-8">
            <div className="mx-auto max-w-[1500px] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700" disabled>
                  <FolderOpen size={14} /> Campaigns
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400" disabled>
                  <Database size={14} /> Evidence Library
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400" disabled>
                  <FileText size={14} /> Rules
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400" disabled>
                  <Users size={14} /> Team
                </button>
              </div>
            </div>
          </nav>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
            {/* Stats Cards - Skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonMetric key={i} />
              ))}
            </div>

            {/* Search & Filters - Skeleton */}
            <SkeletonCard className="h-32" />

            {/* Campaign Grid - Skeleton */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} className="m-5" />
                ))}
              </div>
            </div>
          </div>

          <footer className="pb-3 text-center text-xs text-slate-400">
            © 2026 Inkloom AI · Multi-campaign workspace · Deterministic governance · Evidence-backed decisions
          </footer>
        </div>
        <ToastViewport />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <motion.div
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
            <span>🎪 Demo Mode — Multi-campaign workspace with real API data | </span>
            <span className="font-mono">Deterministic engine • Evidence-backed • Policy-as-Code</span>
            <span className="ml-4 px-2 py-0.5 rounded bg-amber-100">v1.0 / northwind-demo-v2</span>
          </div>
        </motion.div>

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
                <Shield size={22} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
                <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">MULTI-CAMPAIGN WORKSPACE</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Northwind Demo Org
              </span>
              <motion.button
                onClick={() => setShowSettings(true)}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Settings size={14} /> Org Settings
              </motion.button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="sticky top-[76px] z-20 border-b border-slate-200 bg-white px-4 py-2 md:px-8">
          <div className="mx-auto max-w-[1500px] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Link
                href="/workspace"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition"
              >
                <Shield size={14} /> Workspace
              </Link>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700"
              >
                <FolderOpen size={14} /> Campaigns
              </button>
              <Link
                href="/evidence"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition"
              >
                <Database size={14} /> Evidence Library
              </Link>
              <Link
                href="/integrations"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition"
              >
                <Zap size={14} /> Integrations
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleBulkReanalyze}
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={14} /> Re-analyze All
              </motion.button>
              <motion.button
                onClick={() => setShowBulkExport(true)}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} /> Export All
              </motion.button>
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Plus size={14} /> New Campaign
              </motion.button>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              { label: "Total Campaigns", value: stats.totalCampaigns, icon: FolderOpen, color: "bg-blue-50 text-blue-600" },
              { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
              { label: "Pending Review", value: stats.pending, icon: Clock, color: "bg-blue-50 text-blue-600" },
              { label: "Rejected", value: stats.rejected, icon: XCircle, color: "bg-rose-50 text-rose-600" },
              { label: "Total Findings", value: stats.totalFindings, icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
              { label: "High Priority", value: stats.highPriority, icon: AlertCircle, color: "bg-rose-50 text-rose-600" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
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
          </div>

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
                  placeholder="Search campaigns by title, content ID..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "draft", "active", "archived"] as const).map((status) => {
                  const config = statusConfig[status];
                  const Icon = config?.icon;
                  return (
                    <motion.button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      whileTap={{ scale: 0.98 }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                        statusFilter === status
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {Icon && <Icon size={12} />}
                      {status === "all" ? "All" : config?.label || status}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* Campaign Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            {filteredCampaigns.length === 0 ? (
              <div className="px-8 py-16 text-center">
                <FolderOpen className="mx-auto text-slate-300" size={48} />
                <p className="mt-4 font-bold text-slate-600">No campaigns found</p>
                <p className="mt-1 text-sm text-slate-400">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No campaigns exist yet"}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <motion.button
                    onClick={fetchCampaigns}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw size={14} /> Retry
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setShowCreateModal(true);
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus size={14} /> Create Campaign
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {filteredCampaigns.map((campaign, index) => {
                    const config = statusConfig[campaign.status];
                    const StatusIcon = config?.icon || FileText;
                    const isAnalyzing = loading && campaign.runId === analyzingCampaignId;
                    return (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className={`flex flex-col md:flex-row md:items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors ${isAnalyzing ? "bg-blue-50/30 ring-2 ring-blue-200" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3
                              onClick={() => {
                                const targetId = campaign.runId || campaign.id;
                                window.location.href = `/workspace?run=${encodeURIComponent(targetId)}`;
                              }}
                              className="font-bold text-lg truncate cursor-pointer hover:text-blue-600 transition"
                            >
                              {campaign.title}
                            </h3>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${config?.bg || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                              <StatusIcon size={10} />
                              {config?.label || campaign.status}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{campaign.id}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Clock size={12} /> {campaign.lastAnalyzedAt ? `Analyzed ${formatRelativeTime(campaign.lastAnalyzedAt)}` : "Not analyzed"}</span>
                            <span className="flex items-center gap-1"><FileText size={12} /> {campaign.findingsCount} findings</span>
                            <span className="flex items-center gap-1"><AlertCircle size={12} className="text-rose-500" /> {campaign.highFindings} high</span>
                            <span className="flex items-center gap-1"><History size={12} /> v{campaign.version ?? "N/A"}</span>
                            {campaign.reviewer && (
                              <span className="flex items-center gap-1"><Users size={12} /> Reviewed by {campaign.reviewer}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                          <motion.button
                            onClick={() => {
                              const targetId = campaign.runId || campaign.id;
                              window.location.href = `/workspace?run=${encodeURIComponent(targetId)}`;
                            }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                          >
                            <ArrowUpRight size={14} /> Check & Analyze
                          </motion.button>
                          <motion.button
                            onClick={() => setShowRunHistory(campaign.id)}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <History size={14} /> History
                          </motion.button>
                          {campaign.runId && (
                            <motion.button
                              onClick={() => window.open(`/passport/${campaign.runId}`, "_blank")}
                              whileTap={{ scale: 0.98 }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <Shield size={14} /> Passport
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() => {
                              if (!campaign.description) {
                                showToast("No campaign content to analyze", "error");
                                return;
                              }
                              handleRunAnalysis(campaign.id, campaign.description);
                            }}
                            disabled={loading}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Re-analyzing...
                              </>
                            ) : (
                              <>
                                <Zap size={14} /> Re-analyze
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.section>

          {/* Run History Modal */}
          <AnimatePresence>
            {showRunHistory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowRunHistory(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <h2 className="font-bold">Run History</h2>
                    <motion.button
                      onClick={() => setShowRunHistory(null)}
                      whileTap={{ scale: 0.9 }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X size={20} />
                    </motion.button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <p className="text-sm text-slate-500 mb-4">Showing mock history for demo. In production, this loads from Supabase.</p>
                    <div className="space-y-3">
                      {[
                        { version: 3, status: "approved", date: "2 hours ago", reviewer: "Sarah Chen", findings: 6, high: 0 },
                        { version: 2, status: "changes_requested", date: "1 day ago", reviewer: "Marcus Johnson", findings: 4, high: 1 },
                        { version: 1, status: "analyzed", date: "2 days ago", reviewer: null, findings: 3, high: 1 },
                      ].map((run, i) => {
                        const rConfig = statusConfig[run.status as keyof typeof statusConfig];
                        const RIcon = rConfig.icon;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50/50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${rConfig.bg}`}>
                                  <RIcon size={10} />
                                  {rConfig.label}
                                </span>
                                <span className="text-sm font-medium">v{run.version}</span>
                              </div>
                              <span className="text-xs text-slate-400">{run.date}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>Findings: {run.findings}</span>
                              <span>High: {run.high}</span>
                              {run.reviewer && <span>Reviewer: {run.reviewer}</span>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Create Campaign Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowCreateModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <h2 className="font-bold">Create New Campaign</h2>
                    <motion.button
                      onClick={() => setShowCreateModal(false)}
                      whileTap={{ scale: 0.9 }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X size={20} />
                    </motion.button>
                  </div>
                  <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Campaign Title</label>
                      <input
                        type="text"
                        value={newCampaignTitle}
                        onChange={(e) => setNewCampaignTitle(e.target.value)}
                        placeholder="e.g., Q1 Product Launch"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Campaign Content</label>
                      <textarea
                        value={newCampaignText}
                        onChange={(e) => setNewCampaignText(e.target.value)}
                        rows={8}
                        className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                      <motion.button
                        onClick={() => setShowCreateModal(false)}
                        whileTap={{ scale: 0.98 }}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={handleCreateCampaign}
                        disabled={loading}
                        whileTap={{ scale: 0.98 }}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {loading ? "Creating..." : "Create & Analyze"}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Export Modal */}
          <AnimatePresence>
            {showBulkExport && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowBulkExport(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="font-bold text-lg mb-2">Export All Passports</h2>
                  <p className="text-sm text-slate-500 mb-6">Download a combined markdown file with all {campaigns.length} campaign trust passports.</p>
                  <div className="flex justify-end gap-3">
                    <motion.button
                      onClick={() => setShowBulkExport(false)}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleBulkExport}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Export All
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Modal */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowSettings(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <h2 className="font-bold">Organization Settings</h2>
                    <motion.button
                      onClick={() => setShowSettings(false)}
                      whileTap={{ scale: 0.9 }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X size={20} />
                    </motion.button>
                  </div>
                  <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700">General</h3>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium">Organization: Northwind Demo Org</p>
                        <p className="text-xs text-slate-500 mt-1">Demo organization — settings are mocked</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700">Default Reviewer</h3>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium">Sarah Chen (sarah@northwind.demo)</p>
                        <p className="text-xs text-slate-500 mt-1">Auto-assigned to new campaigns</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700">Evidence Library Scope</h3>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium">Shared across organization</p>
                        <p className="text-xs text-slate-500 mt-1">All campaigns use the same approved evidence records</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700">Rules Version</h3>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium">v1.0 — Northwind Q4 Governance</p>
                        <p className="text-xs text-slate-500 mt-1">Policy-as-Code rules loaded from rules/v1/northwind-governance.yaml</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700">Members</h3>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        {["Sarah Chen (Admin)", "Marcus Johnson (Reviewer)", "Priya Patel (Reviewer)", "Demo User (Viewer)"].map((member, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{member}</span>
                            <span className="text-xs text-slate-400">Demo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Demo Guide Panel */}
          <DemoGuidePanel />
        </div>

        <footer className="pb-3 text-center text-xs text-slate-400">
          © 2026 Inkloom AI · Multi-campaign workspace · Deterministic governance · Evidence-backed decisions
        </footer>
      </motion.div>
    </ToastProvider>
  );
}

// Demo Guide Panel Component
function DemoGuidePanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Save position to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('demo-guide-position');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('demo-guide-position', JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.currentTarget !== e.target && (e.target as HTMLElement).closest?.('.step-btn, .quick-action-btn')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const steps = [
    { title: "Create or Select Campaign", action: "Click 'New Campaign' or pick existing", target: "new-campaign" },
    { title: "Run Analysis", action: "Click 'Analyze' on a campaign card", target: "analyze" },
    { title: "Review Findings", action: "Click findings → Accept/Reject/Revise", target: "findings" },
    { title: "Submit Review", action: "Click 'Submit Review' → enter name/reason", target: "review" },
    { title: "View Passport", action: "Click 'Open' → see signed Trust Passport", target: "passport" },
    { title: "Verify Cryptographically", action: "Click 'Verify' badge → client-side Ed25519 proof", target: "verify" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed z-50 transition-all duration-300 ${!isOpen ? "w-10" : "w-80"}`}
      style={{
        left: position.x,
        top: position.y,
        right: 'auto',
        bottom: 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => handleMouseMove(e.nativeEvent)}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header - Drag Handle */}
        <div
          className="w-full flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200 cursor-move select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <GripVertical size={16} className="text-slate-400 hover:text-slate-600" />
            <Sparkles size={16} className="text-amber-500" />
            <span className="hidden sm:block">Demo Guide</span>
          </div>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="text-slate-400"
          >
            <ChevronRight size={16} />
          </motion.span>
        </div>

        {/* Steps */}
        <AnimatePresence mode="popLayout">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 max-h-[400px] overflow-y-auto"
            >
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.button
                    key={step.title}
                    onClick={() => setCurrentStep(index)}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      currentStep === index
                        ? "bg-blue-50 border border-blue-200 ring-2 ring-blue-100"
                        : "bg-slate-50 border border-transparent hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentStep === index
                          ? "bg-blue-600 text-white"
                          : index < currentStep
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}>
                        {index < currentStep ? <CheckCircle2 size={14} /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${currentStep === index ? "text-blue-700" : "text-slate-700"}`}>
                          Step {index + 1}: {step.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{step.action}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                <button
                  onClick={() => window.location.href = "/evidence"}
                  className="w-full text-left p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Database size={12} /> Browse Evidence Library
                </button>
                <button
                  onClick={() => window.location.href = "/dashboard"}
                  className="w-full text-left p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <FolderOpen size={12} /> Multi-Campaign Dashboard
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('judge_mode', 'true');
                    window.location.reload();
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 flex items-center gap-2"
                >
                  <Sparkles size={12} /> Enable Judge Mode (Instant Demo)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}