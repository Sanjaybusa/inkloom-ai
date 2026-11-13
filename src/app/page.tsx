"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  Code2,
  Database,
  Zap,
  Lock,
  Eye,
  BarChart2,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Sparkles,
  Play,
  ExternalLink,
  GitBranch,
  Link2,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  // If query params are provided (e.g. from deep links, verify, or legacy bookmarks),
  // immediately redirect to the Interactive Workspace
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("run") || params.get("demo") || params.get("finding") || params.get("campaign") || params.get("view")) {
      window.location.href = `/workspace${window.location.search}`;
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Navbar */}
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur sticky top-0 z-40 px-4 md:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101b35] text-white">
              <ShieldCheck size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></span>
          </div>
          <nav className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Link href="/workspace" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
              Governance Workspace
            </Link>
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
              Campaigns
            </Link>
            <Link href="/evidence" className="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
              Evidence Library
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        {/* Subtle pattern using CSS */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iLjAzIj48cGF0aCBkPSJNNzYgMzR2LTRoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6bTAtMzBWMGgtMnY0aC00djJoNHY0aDJWNmg0VjRoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRoMnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjI0djRoMnY0aDJWNmg0VjRINnoiLz48L2c+PC9nPjwvc3ZnPg==')" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#101b35] mb-6"
            >
              <ShieldCheck className="text-white" size={32} />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Evidence-backed content governance
              <br />
              <span className="text-blue-600">with cryptographic proof</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Marketing teams ship claims daily: "40% faster," "#1 platform," "zero downtime."
              Legal reviews are manual, slow, and leave no auditable trail.
              <strong>Inkloom turns governance into a verifiable, signed process.</strong>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                onClick={() => window.location.href = "/workspace"}
              >
                Run Governance Check
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-slate-200 text-lg font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Campaigns Dashboard
              </Link>
            </div>

            {/* Demo Mode Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <Link
                href="/workspace"
                className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200 hover:bg-amber-100 transition"
              >
                <Sparkles className="inline w-4 h-4 mr-1" /> Demo Mode — No Setup Required
              </Link>
              <Link
                href="/workspace?demo=perfect"
                className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 hover:bg-emerald-100 transition"
              >
                Ed25519 Signed (Perfect Demo)
              </Link>
              <Link
                href="/workspace?demo=rejected"
                className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200 hover:bg-rose-100 transition"
              >
                Rejected Case Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">The Governance Pipeline</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From raw copy to cryptographically signed Trust Passport — every step auditable, every finding evidence-backed.
            </p>
          </motion.div>

          <div className="relative">
            {/* Pipeline Steps */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
              {[
                {
                  icon: FileText,
                  label: "Campaign Input",
                  desc: "Paste marketing copy or connect CMS",
                  color: "bg-blue-500",
                  bg: "bg-blue-50",
                  border: "border-blue-200",
                },
                {
                  icon: Zap,
                  label: "Hybrid Analysis",
                  desc: "LLM extracts claims → deterministic rules evaluate",
                  color: "bg-violet-500",
                  bg: "bg-violet-50",
                  border: "border-violet-200",
                },
                {
                  icon: Database,
                  label: "Evidence Verification",
                  desc: "Each finding linked to approved source",
                  color: "bg-emerald-500",
                  bg: "bg-emerald-50",
                  border: "border-emerald-200",
                },
                {
                  icon: ShieldCheck,
                  label: "Human Review",
                  desc: "Accept/Edit/Dispute with audit trail",
                  color: "bg-amber-500",
                  bg: "bg-amber-50",
                  border: "border-amber-200",
                },
                {
                  icon: Lock,
                  label: "Trust Passport",
                  desc: "Ed25519 signed, immutable, verifiable",
                  color: "bg-rose-500",
                  bg: "bg-rose-50",
                  border: "border-rose-200",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col items-center relative z-10 lg:flex-1"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${step.color}`}>
                    <step.icon className="text-white" size={28} />
                  </div>
                  <h3 className="text-lg font-semibold mb-1 text-center">{step.label}</h3>
                  <p className="text-sm text-slate-500 text-center max-w-xs">{step.desc}</p>

                  {/* Connecting line */}
                  {i < 4 && (
                    <div className="absolute hidden lg:block top-8 left-[calc(50%+80px)] w-[calc(100%-160px)] h-0.5 bg-gradient-to-r from-slate-200 to-slate-300" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Why Inkloom?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Not another AI wrapper. Governance built on evidence, not hallucination.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Code2,
                title: "Deterministic Rules Engine",
                desc: "15 YAML rules, zero hallucination. Same input = same findings every time. Hot-reloadable in dev, auditable in prod.",
                badge: "Policy-as-Code",
              },
              {
                icon: Database,
                title: "Evidence Versioning",
                desc: "Immutable evidence records with full version history. Findings reference specific versions. Deprecation with warnings.",
                badge: "Traceable",
              },
              {
                icon: Lock,
                title: "Ed25519 Trust Passports",
                desc: "Canonical JSON signing. Client-side verification with embedded public key. Zero server trust required.",
                badge: "Cryptographic",
              },
              {
                icon: Eye,
                title: "Public Verification",
                desc: "Anyone can verify a passport in-browser. No login, no API call. Tamper-evident by design.",
                badge: "Zero Trust",
              },
              {
                icon: BarChart2,
                title: "Compliance Scorecard",
                desc: "5-tab scorecard: Overview, Regulations, Heatmap, Evidence, Audit. Executive-ready PDF export.",
                badge: "Auditable",
              },
              {
                icon: Sparkles,
                title: "Judge Mode",
                desc: "Instant zero-API demo via localStorage flag. Evaluators test the full flow without credentials.",
                badge: "Demo Ready",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <item.icon size={24} />
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-3">
                  {item.badge}
                </span>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Walkthrough */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Try It in 3 Minutes</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              No account needed. Click through the guided demo.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { step: 1, title: "Analyze", desc: "Paste copy → click Run Governance Check → 7 findings appear instantly", icon: Zap },
              { step: 2, title: "Review", desc: "Accept findings, add alt text, dispute if needed → builds corrected copy", icon: CheckCircle2 },
              { step: 3, title: "Approve", desc: "Enter name & reason → get signed Trust Passport with Ed25519 signature", icon: ShieldCheck },
              { step: 4, title: "Verify", desc: "Open /verify page → client-side crypto proves passport untampered", icon: Eye },
              { step: 5, title: "Scorecard", desc: "5-tab compliance view → export PDF for board deck", icon: BarChart2 },
              { step: 6, title: "Evidence", desc: "Browse searchable library → see which findings cite each record", icon: Database },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.step * 0.08 }}
                className="relative rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div className="pt-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <item.icon size={24} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = "/workspace?demo=perfect"}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#101b35] text-white text-lg font-semibold hover:bg-[#1a2a4a] transition-colors"
            >
              <Play size={20} /> Start Guided Demo
            </motion.button>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Built with Modern Stack</h2>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">Next.js 16</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">React 19</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">TypeScript</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">Tailwind CSS</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">Framer Motion</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">@noble/ed25519</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">Zod</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">js-yaml</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">Supabase</span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-medium">Vercel</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#101b35] flex items-center justify-center">
                  <ShieldCheck className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold">inkloom<span className="text-blue-600">.</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Evidence-backed content governance with cryptographic proof.
                Built for teams who need to prove what they publish.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/login" className="hover:text-blue-600">Try Demo</Link></li>
                <li><Link href="https://github.com/Sanjaybusa/inkloom-ai" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-center gap-2"><GitBranch className="w-4 h-4" /> GitHub</Link></li>
                <li><Link href="/evidence" className="hover:text-blue-600">Evidence Library</Link></li>
                <li><Link href="/dashboard" className="hover:text-blue-600">Multi-Campaign Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="https://github.com/Sanjaybusa/inkloom-ai/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Documentation</Link></li>
                <li><Link href="https://github.com/Sanjaybusa/inkloom-ai/blob/main/rules/v1/northwind-governance.yaml" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Rule Pack (YAML)</Link></li>
                <li><Link href="https://github.com/Sanjaybusa/inkloom-ai/issues" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Report Issue</Link></li>
                <li><Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-center gap-2"><Link2 className="w-4 h-4" /> Updates</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
            © 2026 Inkloom AI · MIT License · Built for the Northwind Hackathon
          </div>
        </div>
      </footer>
    </div>
  );
}