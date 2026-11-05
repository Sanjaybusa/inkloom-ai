
"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Finding = {
  id: number;
  title: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  status: string;
  claim: string;
  explanation: string;
  evidence: string;
  recommendation: string;
};

const sampleContent = {
  title: "Northwind Q4 Campaign",
  version: "v3",
  text: `
    Northwind Analytics helps customers make better business decisions.
    Northwind Insights is the world's fastest analytics platform.
    It connects to 5 data sources.
    Our clients use our platform to improve reporting.
  `,
  image: {
    contrastRatio: 2.5,
    altText: "",
  },
};

type CampaignSnapshot = {
  schemaVersion: "1.0";
  runId: string;
  campaignTitle: string;
  campaignText: string;
  analyzedAt: string | null;
  status: "pending" | "analyzed" | "approved";
  findings: Finding[];
  selectedFindingId: number | null;
  approval: {
    approved: boolean;
    approvedAt: string | null;
  };
};

const passportRulesVersion = "1.0";
const passportEvidenceLibraryVersion = "northwind-demo-v2";

function escapeMarkdownText(value: string): string {
  const escaped = value
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`/g, "\\`")
    .replace(/([*_{}\[\]()#+.!|~])/g, "\\$1");

  return escaped
    .split("\n")
    .map((line) => line
      .replace(/^(\s*)([-+>#=])/g, "$1\\$2")
      .replace(/^(\s*)(\d+)([.)])/g, "$1$2\\$3"))
    .join("\n");
}

function safePassportFilename(campaignTitle: string): string {
  const slug = campaignTitle
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/g, "");

  return `${slug || "campaign"}-passport-v1.0.md`;
}

function extractClaim(text: string, phrase: string, fallback: string): string {
  const matchingSentence = text
    .split(/[.!?]+|\n+/)
    .map((sentence) => sentence.trim())
    .find((sentence) => sentence.toLowerCase().includes(phrase.toLowerCase()));

  return matchingSentence?.slice(0, 240) || fallback;
}

function analyzeText(text: string, isSample: boolean): Finding[] {
  const content = text.toLowerCase();
  const findings: Finding[] = [];

  if (content.includes("80%")) {
    findings.push({
      id: 6,
      title: "Unsupported savings claim",
      category: "Claim verification",
      severity: "High",
      status: "Unverified",
      claim: extractClaim(
        text,
        "80%",
        "Our platform reduces costs by 80%."
      ),
      explanation:
        "The campaign contains a specific 80% savings claim, but the approved evidence library contains no source validating this figure.",
      evidence:
        "No approved source found in the campaign claim library.",
      recommendation:
        "Remove the numerical claim or attach an approved study that supports the 80% figure.",
    });
  }

  if (
    content.includes("world's fastest") ||
    content.includes("world\u2019s fastest") ||
    content.includes("world fastest")
  ) {
    findings.push({
      id: 1,
      title: "Unsupported superlative claim",
      category: "Claim verification",
      severity: "High",
      status: "Unverified",
      claim: extractClaim(
        text,
        "world's fastest",
        "Northwind Insights is the world's fastest analytics platform."
      ),
      explanation:
        "The campaign uses a market-wide superlative, but the approved claim library contains no dated third-party evidence supporting it.",
      evidence:
        "Claim Policy 3.2 · Superlatives require dated third-party evidence. No matching approved record is in the claim library.",
      recommendation:
        "Remove the superlative or replace it with a supported benchmark and cite the approved evidence.",
    });
  }

  if (content.includes("5 data sources")) {
    findings.push({
      id: 2,
      title: "Outdated product information",
      category: "Fact verification",
      severity: "High",
      status: "Outdated",
      claim: extractClaim(
        text,
        "5 data sources",
        "Connects to 5 data sources."
      ),
      explanation:
        "The Northwind campaign says 5 integrations, while Northwind Product Fact Sheet v3.2 specifies 12 supported data sources.",
      evidence:
        "Northwind Product Fact Sheet · v3.2 · Reviewed this quarter · Approved fact: 12 data sources.",
      recommendation:
        "Replace 5 with 12 after confirming the current approved product fact sheet.",
    });
  }

  if (content.includes("clients")) {
    findings.push({
      id: 3,
      title: "Unapproved brand terminology",
      category: "Brand consistency",
      severity: "Medium",
      status: "Brand violation",
      claim: extractClaim(
        text,
        "clients",
        "Our clients use our platform."
      ),
      explanation:
        "The Northwind brand terminology guide uses customers rather than clients, and Northwind Insights is the approved product name.",
      evidence:
        "Northwind Brand Guide · Terminology rule: use customers, not clients; approved product name: Northwind Insights.",
      recommendation:
        "Replace clients with customers.",
    });
  }

  if (isSample && sampleContent.image.contrastRatio < 4.5) {
    findings.push({
      id: 4,
      title: "Low text contrast",
      category: "Accessibility",
      severity: "Medium",
      status: "Needs correction",
      claim: "Campaign banner text contrast",
      explanation:
        `The Northwind banner has a contrast ratio of ${sampleContent.image.contrastRatio}:1. Normal text needs at least 4.5:1 for WCAG AA.`,
      evidence:
        "WCAG 2.2 AA 1.4.3 and Northwind Brand Guide 5.1 · Normal text requires 4.5:1 contrast.",
      recommendation:
        "Use approved dark grey #374151 against white, about 10:1, then recalculate the contrast ratio.",
    });
  }

  if (isSample && !sampleContent.image.altText.trim()) {
    findings.push({
      id: 5,
      title: "Missing image alternative text",
      category: "Accessibility",
      severity: "High",
      status: "Needs correction",
      claim: "Campaign banner image",
      explanation:
        "The campaign banner has no alternative text. Screen-reader users may miss its meaningful content.",
      evidence:
        "WCAG 2.2 AA 1.1.1 and Northwind Brand Guide 7.4 · Meaningful images need an appropriate text alternative.",
      recommendation:
        'Add concise alternative text such as: "Dashboard showing monthly revenue trends."',
    });
  }

  return findings;
}

export default function Home() {
  const [campaignEditor, setCampaignEditor] = useState(sampleContent.text.trim());
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CampaignSnapshot>({
    schemaVersion: "1.0",
    runId: "",
    campaignTitle: sampleContent.title,
    campaignText: sampleContent.text.trim(),
    analyzedAt: null,
    status: "pending",
    findings: [],
    selectedFindingId: null,
    approval: {
      approved: false,
      approvedAt: null,
    },
  });
  const [passportPreviewOpen, setPassportPreviewOpen] = useState(false);

  const findings = snapshot.findings;
  const selectedId = snapshot.selectedFindingId;
  const analyzed = snapshot.status !== "pending";
  const approved = snapshot.approval.approved;
  const selectedFinding =
    findings.find((finding) => finding.id === selectedId) ??
    undefined;

  const highCount = findings.filter(
    (finding) => finding.severity === "High"
  ).length;
  const claimsChecked = !analyzed
    ? 0
    : snapshot.campaignTitle === sampleContent.title
      ? 5
      : Math.max(
          1,
          snapshot.campaignText
            .split(/[.!?]+|\n+/)
            .map((claim) => claim.trim())
            .filter(Boolean).length
        );

  function runAnalysis() {
    const submittedText = campaignEditor.trim();

    if (!submittedText) {
      setCampaignError("Campaign content is required. Enter text before running analysis.");
      return;
    }

    if (campaignEditor.length > 2000) {
      setCampaignError("Campaign text must be 2,000 characters or fewer.");
      return;
    }

    const isSample = submittedText === sampleContent.text.trim();
    const results = analyzeText(submittedText, isSample);
    const runId = `inkloom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const nextSnapshot: CampaignSnapshot = {
      schemaVersion: "1.0",
      runId,
      campaignTitle: isSample ? sampleContent.title : "Custom Campaign",
      campaignText: submittedText,
      analyzedAt: new Date().toISOString(),
      status: "analyzed",
      findings: results,
      selectedFindingId: results[0]?.id ?? null,
      approval: {
        approved: false,
        approvedAt: null,
      },
    };

    setCampaignError(null);
    setSnapshot(nextSnapshot);
    setPassportPreviewOpen(false);
  }

  function approveReview() {
    if (snapshot.status === "analyzed" && selectedFinding && findings.length > 0) {
      setSnapshot((current) => ({
        ...current,
        status: "approved",
        approval: {
          approved: true,
          approvedAt: new Date().toISOString(),
        },
      }));
      setPassportPreviewOpen(false);
    }
  }

  const passportExportApproved =
    snapshot.status === "approved" &&
    snapshot.approval.approved === true &&
    Boolean(snapshot.approval.approvedAt);

  function downloadEvidencePassport() {
    if (
      snapshot.status !== "approved" ||
      snapshot.approval.approved !== true ||
      !snapshot.approval.approvedAt
    ) {
      return;
    }

    const current = snapshot;
    const lines = [
      "# Evidence Passport",
      "",
      "## Campaign Summary",
      "",
      `- Campaign title: ${escapeMarkdownText(current.campaignTitle)}`,
      `- Campaign text: ${escapeMarkdownText(current.campaignText)}`,
      `- Run ID: ${escapeMarkdownText(current.runId)}`,
      `- Analysis timestamp: ${escapeMarkdownText(current.analyzedAt ?? "")}`,
      `- Status: ${escapeMarkdownText(current.status)}`,
      `- Schema version: ${escapeMarkdownText(current.schemaVersion)}`,
      `- Rules version: ${escapeMarkdownText(passportRulesVersion)}`,
      `- Evidence library version: ${escapeMarkdownText(passportEvidenceLibraryVersion)}`,
      "",
      "## Approval Decision",
      "",
      `- Approval outcome: ${escapeMarkdownText(current.approval.approved ? "Approved" : "Not approved")}`,
      `- Approval timestamp: ${escapeMarkdownText(current.approval.approvedAt ?? "")}`,
      "",
      "## Findings and Evidence",
      "",
    ];

    if (current.findings.length === 0) {
      lines.push("No findings were generated for this approved snapshot.");
    } else {
      current.findings.forEach((finding, index) => {
        lines.push(
          `### Finding ${index + 1}`,
          "",
          `- Finding ID: ${escapeMarkdownText(String(finding.id))}`,
          `- Title: ${escapeMarkdownText(finding.title)}`,
          `- Category: ${escapeMarkdownText(finding.category)}`,
          `- Severity: ${escapeMarkdownText(finding.severity)}`,
          `- Status: ${escapeMarkdownText(finding.status)}`,
          `- Claim: ${escapeMarkdownText(finding.claim)}`,
          `- Explanation: ${escapeMarkdownText(finding.explanation)}`,
          `- Evidence: ${escapeMarkdownText(finding.evidence)}`,
          `- Recommendation / correction: ${escapeMarkdownText(finding.recommendation)}`,
          ""
        );
      });
    }

    const markdown = `${lines.join("\n").trimEnd()}\n`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = safePassportFilename(current.campaignTitle);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  const navigation = [
    { name: "Campaign", icon: LayoutDashboard, href: "#campaign" },
    { name: "Findings", icon: Search, href: "#findings" },
    { name: "Review", icon: ClipboardCheck, href: "#review" },
    { name: "Evidence Passport", icon: FileCheck2, href: "#passport" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 flex-col bg-[#101b35] text-white lg:flex">
          <div className="flex h-[82px] items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <ShieldCheck size={23} />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">inkloom<span className="text-blue-400">.</span></div>
              <div className="text-[10px] tracking-[2px] text-slate-400">CONTENT GOVERNANCE</div>
            </div>
          </div>

          <div className="px-5 pt-7">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[2px] text-slate-500">
              Workspace
            </p>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <Activity size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Northwind Analytics</p>
                <p className="text-xs text-slate-400">Public review</p>
              </div>
            </div>

            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[2px] text-slate-500">
              Menu
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon size={18} />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-5">
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-200">
                <Sparkles size={16} />
                Review workspace
              </div>
              <p className="text-xs leading-5 text-slate-400">
                Move from campaign copy to evidence-backed decisions.
              </p>
            </div>
            <p className="mt-5 text-center text-[10px] text-slate-600">
              INKLOOM AI · CONTENT GOVERNANCE
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
            <div>
              <p className="text-xs text-slate-400">Northwind Analytics / Q4 Campaign</p>
              <h1 className="text-lg font-bold">Content Governance</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:inline-flex">
                <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                Public workspace
              </span>
            </div>
          </header>

          <nav aria-label="Workspace sections" className="grid grid-cols-4 border-b border-slate-200 bg-white lg:hidden">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="min-w-0 border-r border-slate-100 px-1 py-3 text-center text-[10px] font-semibold text-slate-600 last:border-r-0 hover:bg-slate-50"
              >
                {item.name === "Evidence Passport" ? "Passport" : item.name}
              </a>
            ))}
          </nav>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[1.5px] text-blue-600">
                  <Sparkles size={14} />
                  Your content trust workspace
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Every claim. Every source. Every decision.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Check brand content against approved evidence, detect risks,
                  and make confident publication decisions.
                </p>
              </div>

              <button
                onClick={runAnalysis}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <Play size={16} fill="currentColor" />
                {analyzed ? "Run Analysis Again" : "Run Analysis"}
              </button>
            </div>

            <div id="campaign" className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <label htmlFor="campaign-text" className="font-bold">
                    Campaign copy
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    Replace the sample copy or use it as your starting point.
                  </p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    campaignEditor.length > 1900 ? "text-amber-700" : "text-slate-400"
                  }`}
                  aria-live="polite"
                >
                  {campaignEditor.length} / 2,000 characters
                </span>
              </div>
              <textarea
                id="campaign-text"
                value={campaignEditor}
                maxLength={2000}
                onChange={(event) => {
                  const value = event.target.value;
                  setCampaignEditor(value);
                  setPassportPreviewOpen(false);
                  setSnapshot((current) => ({
                    ...current,
                    status: "pending",
                    findings: [],
                    selectedFindingId: null,
                    approval: {
                      approved: false,
                      approvedAt: null,
                    },
                  }));
                  if (value.trim()) {
                    setCampaignError(value.length > 2000
                      ? "Campaign text must be 2,000 characters or fewer."
                      : null);
                  } else {
                    setCampaignError(null);
                  }
                }}
                aria-invalid={Boolean(campaignError)}
                aria-describedby="campaign-limit campaign-error"
                rows={7}
                className={`mt-3 w-full resize-y rounded-xl border px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:ring-4 ${
                  campaignError
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                }`}
                spellCheck="true"
              />
              <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row">
                <p id="campaign-limit" className="text-xs text-slate-400">
                  Maximum 2,000 characters. Campaign text stays in this workspace.
                </p>
                {campaignError && (
                  <p id="campaign-error" role="alert" className="text-xs font-semibold text-rose-700">
                    {campaignError}
                  </p>
                )}
                {!campaignError && campaignEditor.length >= 2000 && (
                  <p role="status" className="text-xs font-semibold text-amber-700">
                    Character limit reached.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Claims checked",
                  value: analyzed ? claimsChecked.toString() : "—",
                  note: snapshot.campaignTitle,
                  icon: FileText,
                  color: "blue",
                },
                {
                  label: "Unverified / outdated",
                  value: findings.filter((f) => ["Unverified", "Outdated"].includes(f.status)).length.toString(),
                  note: "Evidence review needed",
                  icon: CircleAlert,
                  color: "amber",
                },
                {
                  label: "High-priority findings",
                  value: highCount.toString(),
                  note: "Require attention",
                  icon: Activity,
                  color: "rose",
                },
                {
                  label: "Review status",
                  value: approved ? "Approved" : "Pending",
                  note: approved ? "Reviewer decision recorded" : "Human approval required",
                  icon: ClipboardCheck,
                  color: "violet",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                const colors: Record<string, string> = {
                  blue: "bg-blue-50 text-blue-600",
                  amber: "bg-amber-50 text-amber-600",
                  rose: "bg-rose-50 text-rose-600",
                  violet: "bg-violet-50 text-violet-600",
                };

                return (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <div className={`rounded-xl p-2.5 ${colors[stat.color]}`}>
                        <Icon size={19} />
                      </div>
                    </div>
                    <p className="mt-4 text-3xl font-bold tracking-tight">{stat.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{stat.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[1.45fr_0.85fr]">
              <div className="space-y-5">
                <div id="findings" className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-bold">Content review</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {analyzed ? "Submitted campaign" : "Current campaign"} · {snapshot.campaignTitle}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      {approved
                        ? "Review approved"
                        : analyzed && findings.length === 0
                          ? "Valid · No findings"
                          : analyzed
                            ? "Review required"
                            : "Awaiting analysis"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><FileText size={14}/> {snapshot.campaignTitle}</span>
                    <span>•</span>
                    <span>{snapshot.runId ? snapshot.runId.slice(0, 18) : sampleContent.version}</span>
                    <span>•</span>
                    <span>{findings.length} findings</span>
                  </div>

                  {analyzed && (
                    <div className="border-b border-slate-100 px-5 py-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Submitted campaign text
                      </p>
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                        {snapshot.campaignText}
                      </p>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {findings.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <BadgeCheck size={22} />
                        </div>
                        <p className="mt-3 text-sm font-semibold">
                          {analyzed ? "Valid · No findings detected" : "Ready for analysis"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {analyzed
                            ? "The submitted text matched no governed phrases. Approval remains unavailable."
                            : "Run analysis to check the current campaign copy against the governing rules."}
                        </p>
                      </div>
                    ) : (
                      findings.map((finding) => (
                        <button
                          key={finding.id}
                          onClick={() => setSnapshot((current) => ({
                            ...current,
                            selectedFindingId: finding.id,
                          }))}
                          aria-pressed={selectedId === finding.id}
                          className={`flex w-full flex-col gap-3 px-5 py-4 text-left transition sm:flex-row sm:items-center ${
                            selectedId === finding.id
                              ? "bg-blue-50/70"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            finding.severity === "High"
                              ? "bg-rose-50 text-rose-600"
                              : finding.severity === "Medium"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-slate-100 text-slate-600"
                          }`}>
                            <CircleAlert size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{finding.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{finding.category}</p>
                          </div>
                          <div className="flex items-center gap-2 pl-12 sm:pl-0">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              finding.severity === "High"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {finding.severity}
                            </span>
                            <span className="max-w-[120px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                              {finding.status}
                            </span>
                            <ArrowUpRight size={16} className="text-slate-400" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-400">
                    Findings are generated deterministically from the submitted campaign text.
                  </div>
                </div>

                <div id="review" className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Review workflow</h3>
                      <p className="mt-1 text-xs text-slate-400">Human decision comes before publication.</p>
                    </div>
                    <ShieldCheck className="text-blue-600" size={22} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-blue-50 p-3">
                      <Search className="mb-2 text-blue-600" size={18}/>
                      <p className="text-xs font-semibold">1. Analyze</p>
                      <p className="mt-1 text-[11px] text-slate-500">Check claims and rules.</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3">
                      <BookOpen className="mb-2 text-violet-600" size={18}/>
                      <p className="text-xs font-semibold">2. Review</p>
                      <p className="mt-1 text-[11px] text-slate-500">Inspect evidence and fixes.</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <BadgeCheck className="mb-2 text-emerald-600" size={18}/>
                      <p className="text-xs font-semibold">3. Approve</p>
                      <p className="mt-1 text-[11px] text-slate-500">Record human decision.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Claim Detective</p>
                      <h3 className="mt-1 font-bold">Finding details</h3>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Search size={18}/>
                    </div>
                  </div>
                </div>

                {selectedFinding ? (
                  <div className="space-y-5 p-5">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700">
                          {selectedFinding.severity} priority
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                          {selectedFinding.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold">{selectedFinding.title}</h4>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Content under review</p>
                      <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-sm leading-6 text-slate-700">
                        “{selectedFinding.claim}”
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Why it was flagged</p>
                      <p className="text-sm leading-6 text-slate-600">{selectedFinding.explanation}</p>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-800">
                        <BookOpen size={15}/>
                        Evidence / rule reference
                      </div>
                      <p className="text-xs leading-5 text-slate-600">{selectedFinding.evidence}</p>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested action</p>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                          <Sparkles size={14}/>
                          Recommended correction
                        </div>
                        <p className="text-sm leading-6 text-slate-700">{selectedFinding.recommendation}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <button
                        onClick={approveReview}
                        disabled={!analyzed || approved || !selectedFinding}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#101b35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-emerald-700"
                      >
                        {approved ? <Check size={17}/> : <CheckCircle2 size={17}/>}
                        {approved ? "Review approved" : "Approve review"}
                      </button>
                      <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
                        {approved
                          ? "Approved for the current campaign snapshot."
                          : analyzed
                            ? "Review the evidence, then approve the decision once."
                            : "Run campaign analysis before approving this review."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Search size={22} />
                    </div>
                    <p className="mt-3 text-sm font-semibold">No finding selected</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {analyzed
                        ? "The submitted text has no governed findings, so there is no review item to approve."
                        : "Run analysis to generate findings from the campaign copy."}
                    </p>
                    {analyzed && (
                      <button
                        type="button"
                        disabled
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        <CheckCircle2 size={17} />
                        Approval unavailable
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div id="passport" className="scroll-mt-32 overflow-hidden rounded-2xl bg-[#101b35] text-white">
              <div className="p-6 md:flex md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/10 p-3">
                    <FileCheck2 size={24}/>
                  </div>
                  <div>
                    <p className="text-lg font-bold">Evidence Passport</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                      A transparent record of checked claims, findings, evidence,
                      and human review decisions.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 md:mt-0">
                  {passportExportApproved && (
                    <button
                      type="button"
                      onClick={downloadEvidencePassport}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#101b35] transition hover:bg-emerald-300"
                    >
                      <FileCheck2 size={16}/>
                      Download Passport
                    </button>
                  )}
                  {snapshot.status !== "pending" ||
                    snapshot.campaignText.trim() === campaignEditor.trim() ? (
                  <button
                    onClick={() => setPassportPreviewOpen((open) => !open)}
                    aria-expanded={passportPreviewOpen}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#101b35] transition hover:bg-blue-50"
                  >
                    <FileCheck2 size={16}/>
                    {passportPreviewOpen ? "Close Preview" : "Preview Passport"}
                    <ArrowUpRight size={15}/>
                  </button>
                  ) : null}
                </div>
              </div>

              {passportPreviewOpen && (
                <div className="border-t border-white/10 bg-white p-5 text-slate-900 md:p-6">
                  {!passportExportApproved ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                      <p className="text-sm font-semibold text-amber-900">Complete the review first</p>
                      <p className="mt-1 text-xs leading-5 text-amber-800">
                        Select a finding, review its evidence, and approve the review before previewing the passport.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Evidence Passport Preview</p>
                          <h3 className="mt-1 text-xl font-bold">{snapshot.campaignTitle}</h3>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={14} />
                          Approved
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Campaign</p>
                          <p className="mt-2 text-sm font-semibold">{snapshot.campaignTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">Run {snapshot.runId.slice(0, 18)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Findings</p>
                          <p className="mt-2 text-2xl font-bold">{findings.length}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {highCount} high priority
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval outcome</p>
                          <p className="mt-2 text-sm font-semibold text-emerald-700">Approved by reviewer</p>
                          <p className="mt-1 text-xs text-slate-500">Recorded for this review snapshot</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                        <p className="text-xs font-bold text-blue-800">Evidence summary</p>
                        {findings.length === 0 ? (
                          <p className="mt-2 text-xs leading-5 text-slate-600">
                            No findings were generated, so no evidence exceptions were recorded.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {findings.map((finding) => (
                              <li key={finding.id} className="text-xs leading-5 text-slate-600">
                                <span className="font-semibold text-slate-800">{finding.title}:</span>{" "}
                                {finding.evidence}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="flex flex-col justify-between gap-2 pb-3 text-xs text-slate-400 sm:flex-row">
              <p>© 2026 Inkloom AI · Every claim checked, every asset on-brand.</p>
              <p>Northwind campaign governance workspace</p>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
