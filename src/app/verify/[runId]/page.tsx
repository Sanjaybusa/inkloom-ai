"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Shield,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { verifyPassportWithPublicKey } from "@/lib/signing";

const SAMPLE_TEXT = `Northwind Analytics helps customers make better business decisions.
Northwind Insights is the world's fastest analytics platform.
It connects to 5 data sources.
Our clients use our platform to improve reporting.`;

// EMBED YOUR PUBLIC KEY HERE (32 bytes = 64 hex chars)
// Generate with: node -e "const {ed25519}=require('@noble/ed25519'); const {sha512}=require('@noble/hashes/sha512'); ed25519.etc.sha512=(...a)=>sha512(...a); const pk=ed25519.utils.randomPrivateKey(); console.log(Buffer.from(ed25519.getPublicKey(pk)).toString('hex'))"
// Embedded public key for client-side verification
// Replace this with your actual public key from keypair generation
const EMBEDDED_PUBLIC_KEY = "1f6a59d964cfdf15e83abc64a189205f8c3086d2d46dc81371eb5ab30ce4ca1c";
const USE_EMBEDDED_KEY = true; // Set to false if using fallback to passport's public key

type Passport = {
  schemaVersion: string;
  campaignTitle: string;
  contentId: string;
  runId: string;
  status: string;
  claimsChecked: number;
  supported: number;
  outdated: number;
  unverified: number;
  accessibilityIssues: number;
  resolvedAccessibility: number;
  findingsCount: number;
  highPriorityFindings: number;
  reviewer: string | null;
  decision: string | null;
  reason: string | null;
  approvedAt: string | null;
  aiAssistance: string;
  rulesVersion: string;
  evidenceVersion: string;
  auditTrailComplete: boolean;
  auditEvents: number;
  generatedAt: string;
};

type SignedPassport = {
  passport: Passport;
  signature: string;
  publicKey: string;
  algorithm: string;
  signedAt: string;
};

export default function VerifyPage({ params }: { params: Promise<{ runId: string }> }) {
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(true);
  const [signedPassport, setSignedPassport] = useState<SignedPassport | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setRunId(p.runId);
      fetchSignedPassport(p.runId);
    });
  }, []);

  const fetchSignedPassport = async (id: string) => {
    try {
      const response = await fetch(`/api/passport/${encodeURIComponent(id)}?format=json&signed=true`);
      if (!response.ok) {
        throw new Error(`Failed to fetch passport: ${response.status}`);
      }
      const data = await response.json();
      setSignedPassport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load passport");
    } finally {
      setLoading(false);
    }
  };

  const verify = () => {
    if (!signedPassport) return;

    const isValid = verifyPassportWithPublicKey(
      signedPassport.passport,
      signedPassport.signature,
      USE_EMBEDDED_KEY ? EMBEDDED_PUBLIC_KEY : signedPassport.publicKey
    );

    setVerificationResult({
      valid: isValid,
      message: isValid
        ? "Signature valid. Audit trail intact. This passport has not been tampered with."
        : "Signature INVALID. This passport has been modified or the key does not match.",
      details: isValid
        ? `Verified against ${USE_EMBEDDED_KEY ? "embedded" : "passport"} public key. Algorithm: Ed25519. Signed at: ${signedPassport.signedAt}`
        : "The cryptographic signature does not match the passport content. Do not trust this document.",
    });
  };

  const copyVerificationUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <XCircle className="mx-auto text-rose-600" size={48} />
          <h1 className="mt-4 text-xl font-bold">Verification Failed</h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <p className="mt-4 text-sm text-slate-500">Run ID: {runId}</p>
        </motion.div>
      </div>
    );
  }

  if (!signedPassport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <FileText className="mx-auto text-slate-400" size={48} />
          <h1 className="mt-4 text-xl font-bold">No Passport Found</h1>
          <p className="mt-2 text-slate-600">Run ID: {runId}</p>
        </motion.div>
      </div>
    );
  }

  const p = signedPassport.passport;
  const isApproved = p.status === "approved";

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101b35] text-white">
              <Shield className="text-2xl" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">inkloom<span className="text-blue-600">.</span></p>
              <p className="text-[10px] font-semibold tracking-[2px] text-slate-400">TRUST PASSPORT VERIFICATION</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Public Verification
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* Status Header */}
          <div className={`p-6 border-b border-slate-200 ${isApproved ? "bg-emerald-50" : "bg-slate-50"}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Trust Passport Verification</p>
                <h1 className="mt-1 text-2xl font-bold">{p.campaignTitle}</h1>
                <p className="mt-1 text-sm text-slate-500">Run: <code className="font-mono">{p.runId}</code></p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {isApproved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {p.status}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Result */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cryptographic Verification</p>
                <h2 className="mt-1 text-lg font-bold">Ed25519 Signature Check</h2>
              </div>
              <motion.button
                onClick={verify}
                disabled={!!verificationResult}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Verify Signature
              </motion.button>
            </div>

            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`mt-4 rounded-xl p-4 ${verificationResult.valid ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}
              >
                <div className="flex items-start gap-3">
                  {verificationResult.valid ? (
                    <CheckCircle2 className="text-emerald-600 mt-0.5" size={24} />
                  ) : (
                    <XCircle className="text-rose-600 mt-0.5" size={24} />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${verificationResult.valid ? "text-emerald-800" : "text-rose-800"}`}>
                      {verificationResult.message}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{verificationResult.details}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {!verificationResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600">
                  Click "Verify Signature" to cryptographically prove this passport has not been tampered with since signing.
                  The Ed25519 signature covers the entire passport JSON (canonicalized with sorted keys).
                </p>
              </div>
            )}
          </div>

          {/* Passport Details */}
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Campaign Details</h3>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                <div><dt className="text-slate-500">Content ID</dt><dd className="font-mono text-slate-800">{p.contentId}</dd></div>
                <div><dt className="text-slate-500">Claims Checked</dt><dd className="font-bold">{p.claimsChecked}</dd></div>
                <div><dt className="text-slate-500">Findings</dt><dd className="font-bold">{p.findingsCount}</dd></div>
                <div><dt className="text-slate-500">High Priority</dt><dd className="font-bold text-rose-600">{p.highPriorityFindings}</dd></div>
                <div><dt className="text-slate-500">Supported</dt><dd className="font-bold text-emerald-600">{p.supported}</dd></div>
                <div><dt className="text-slate-500">Outdated</dt><dd className="font-bold text-amber-600">{p.outdated}</dd></div>
                <div><dt className="text-slate-500">Unverified</dt><dd className="font-bold text-rose-600">{p.unverified}</dd></div>
                <div><dt className="text-slate-500">Accessibility Issues</dt><dd className="font-bold">{p.accessibilityIssues}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Review Decision</h3>
              <dl className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div><dt className="text-slate-500">Reviewer</dt><dd className="font-medium">{p.reviewer ?? "Not recorded"}</dd></div>
                <div><dt className="text-slate-500">Decision</dt><dd className="font-bold">{p.decision ?? "Pending"}</dd></div>
                <div><dt className="text-slate-500">Reason</dt><dd className="font-medium break-words">{p.reason ?? "Not recorded"}</dd></div>
                <div className="md:col-span-3"><dt className="text-slate-500">Approved At</dt><dd className="font-medium">{p.approvedAt ? formatDate(p.approvedAt) : "Not recorded"}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Versions & Audit</h3>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                <div><dt className="text-slate-500">Rules Version</dt><dd className="font-mono text-slate-700">{p.rulesVersion}</dd></div>
                <div><dt className="text-slate-500">Evidence Version</dt><dd className="font-mono text-slate-700">{p.evidenceVersion}</dd></div>
                <div><dt className="text-slate-500">AI Assistance</dt><dd className="font-medium">{p.aiAssistance}</dd></div>
                <div><dt className="text-slate-500">Audit Events</dt><dd className="font-bold">{p.auditEvents}</dd></div>
                <div><dt className="text-slate-500">Audit Complete</dt><dd className="font-medium">{p.auditTrailComplete ? "Yes" : "No"}</dd></div>
                <div><dt className="text-slate-500">Generated At</dt><dd className="font-medium">{formatDate(p.generatedAt)}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Signature Details</h3>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                <div><dt className="text-slate-500">Algorithm</dt><dd className="font-mono text-slate-700">{signedPassport.algorithm}</dd></div>
                <div><dt className="text-slate-500">Signed At</dt><dd className="font-medium">{formatDate(signedPassport.signedAt)}</dd></div>
                <div className="md:col-span-2"><dt className="text-slate-500">Public Key</dt><dd className="font-mono text-xs break-all">{signedPassport.publicKey}</dd></div>
                <div className="md:col-span-2"><dt className="text-slate-500">Signature</dt><dd className="font-mono text-xs break-all">{signedPassport.signature}</dd></div>
              </dl>
            </section>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-3">
            <button
              onClick={copyVerificationUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white"
            >
              <Copy size={16} />
              {copied ? <Check size={16} className="text-emerald-600" /> : "Copy Verification URL"}
            </button>
            <a
              href={`/?run=${p.runId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <ExternalLink size={16} />
              View in Workspace
            </a>
          </div>
        </motion.div>

        <footer className="mt-6 text-center text-xs text-slate-400">
          <p>Inkloom AI · Trust Passport Verification · Ed25519 signatures · Immutable audit trail</p>
          <p className="mt-1">This verification page is public and stateless. No data is stored.</p>
        </footer>
      </main>
    </div>
  );
}