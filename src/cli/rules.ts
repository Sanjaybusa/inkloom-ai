#!/usr/bin/env node
/**
 * Inkloom CLI - Policy-as-Code tooling
 * Usage:
 *   npx inkloom rules validate
 *   npx inkloom rules test --text "Your campaign text here"
 *   npx inkloom rules test --file path/to/text.txt
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RULES_PATH = path.join(__dirname, "..", "..", "rules", "v1", "northwind-governance.yaml");
const PROJECT_ROOT = path.join(__dirname, "..", "..");

interface RulePack {
  rulesVersion: string;
  description: string;
  author: string;
  createdAt: string;
  rules: Array<{
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
  }>;
}

function loadRulePack(): RulePack {
  if (!fs.existsSync(RULES_PATH)) {
    console.error(`❌ Rule pack not found at: ${RULES_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(RULES_PATH, "utf-8");
  return yaml.load(content) as RulePack;
}

function validateRulePack(rulePack: RulePack): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rulePack.rulesVersion) errors.push("Missing rulesVersion");
  if (!rulePack.rules || !Array.isArray(rulePack.rules)) errors.push("Missing or invalid rules array");

  for (let i = 0; i < (rulePack.rules?.length ?? 0); i++) {
    const rule = rulePack.rules[i];
    if (!rule.id) errors.push(`Rule ${i}: missing id`);
    if (!rule.name) errors.push(`Rule ${i}: missing name`);
    if (!rule.category) errors.push(`Rule ${i}: missing category`);
    if (!rule.severity || !["High", "Medium", "Low"].includes(rule.severity)) {
      errors.push(`Rule ${i}: invalid severity (must be High, Medium, or Low)`);
    }
    if (!rule.pattern || rule.pattern.type !== "regex" || !rule.pattern.value) {
      errors.push(`Rule ${i}: invalid pattern (must be regex with value)`);
    }
    if (!rule.evidenceIds || !Array.isArray(rule.evidenceIds) || rule.evidenceIds.length === 0) {
      errors.push(`Rule ${i}: missing evidenceIds`);
    }
    if (!rule.explanationTemplate) errors.push(`Rule ${i}: missing explanationTemplate`);
    if (!rule.recommendationTemplate) errors.push(`Rule ${i}: missing recommendationTemplate`);

    // Test regex compiles
    try {
      new RegExp(rule.pattern?.value ?? "");
    } catch (e) {
      errors.push(`Rule ${i}: invalid regex pattern - ${e instanceof Error ? e.message : "unknown error"}`);
    }

    // Validate conditions
    for (let j = 0; j < (rule.conditions?.length ?? 0); j++) {
      const cond = rule.conditions[j];
      if (!cond.field) errors.push(`Rule ${i} condition ${j}: missing field`);
      if (!cond.operator || !["contains_any", "not_contains_any", "matches_regex"].includes(cond.operator)) {
        errors.push(`Rule ${i} condition ${j}: invalid operator`);
      }
      if (!cond.value || !Array.isArray(cond.value)) {
        errors.push(`Rule ${i} condition ${j}: missing or invalid value array`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateCommand(): void {
  console.log("🔍 Validating rule pack...\n");

  const rulePack = loadRulePack();
  const { valid, errors } = validateRulePack(rulePack);

  console.log(`📦 Rule Pack: ${rulePack.description}`);
  console.log(`📝 Version: ${rulePack.rulesVersion}`);
  console.log(`👤 Author: ${rulePack.author}`);
  console.log(`📅 Created: ${rulePack.createdAt}`);
  console.log(`📋 Rules: ${rulePack.rules.length}\n`);

  if (valid) {
    console.log("✅ Rule pack is valid!");
    console.log("\n📋 Rules summary:");
    for (const rule of rulePack.rules) {
      const severityColor = rule.severity === "High" ? "🔴" : rule.severity === "Medium" ? "🟡" : "🟢";
      console.log(`  ${severityColor} ${rule.id} — ${rule.name} (${rule.category})`);
      console.log(`     Pattern: /${rule.pattern.value}/`);
      console.log(`     Evidence: ${rule.evidenceIds.join(", ")}`);
    }
    process.exit(0);
  } else {
    console.log("❌ Rule pack validation failed:");
    for (const error of errors) {
      console.log(`  • ${error}`);
    }
    process.exit(1);
  }
}

interface Claim {
  text: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  suggestedEvidenceId?: string;
}

// Simple claim extractor for CLI testing (deterministic, no LLM)
function extractClaims(text: string): Claim[] {
  const claims: Claim[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    // Heuristic categorization
    let category = "Claim verification";
    let severity: "High" | "Medium" | "Low" = "Medium";

    const lower = trimmed.toLowerCase();
    if (/\d+%/.test(trimmed) || /\d+\s*(data source|integration|connector)/.test(trimmed)) {
      category = "Fact verification";
      severity = "High";
    } else if (/(world's|#1|best in class|fastest|leading)/.test(lower)) {
      category = "Claim verification";
      severity = "High";
    } else if (/(client|customer)/.test(lower)) {
      category = "Brand consistency";
      severity = "Medium";
    } else if (/(wcag|accessib|contrast|alt text|screen reader)/.test(lower)) {
      category = "Accessibility";
      severity = "High";
    } else if (/(soc 2|iso|gdpr|hipaa|compliant|certified)/.test(lower)) {
      category = "Fact verification";
      severity = "High";
    }

    claims.push({
      text: trimmed,
      category,
      severity,
    });
  }

  return claims;
}

function claimMatchesRule(claim: Claim, rule: RulePack["rules"][0]): { matched: boolean; matchedText?: string; matchedNumber?: number } {
  const regex = new RegExp(rule.pattern.value, "gi");
  const match = claim.text.match(regex);

  if (!match) return { matched: false };

  const matchedText = match[0];

  for (const condition of rule.conditions) {
    const fieldValue = condition.field === "claim.text" ? claim.text : "";
    const values = condition.value;

    switch (condition.operator) {
      case "contains_any": {
        const hasMatch = values.some(v => fieldValue.toLowerCase().includes(v.toLowerCase()));
        if (!hasMatch) return { matched: false };
        break;
      }
      case "not_contains_any": {
        const hasMatch = values.some(v => fieldValue.toLowerCase().includes(v.toLowerCase()));
        if (hasMatch) return { matched: false };
        break;
      }
      case "matches_regex": {
        const hasMatch = values.some(v => new RegExp(v, "i").test(fieldValue));
        if (!hasMatch) return { matched: false };
        break;
      }
    }
  }

  const numberMatch = claim.text.match(/\d+/);
  const matchedNumber = numberMatch ? parseInt(numberMatch[0], 10) : undefined;

  return { matched: true, matchedText, matchedNumber };
}

function getApprovedNumber(evidenceIds: string[]): number | null {
  if (evidenceIds.includes("northwind-integrations")) return 12;
  return null;
}

function renderTemplate(template: string, context: Record<string, string | number | string[]>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = context[key];
    if (Array.isArray(value)) return value.join(", ");
    return String(value ?? "");
  });
}

interface Finding {
  id: string;
  title: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  status: string;
  claim: string;
  explanation: string;
  evidence: string;
  evidenceId?: string;
  recommendation: string;
}

function makeFinding(
  id: string,
  title: string,
  category: string,
  severity: "High" | "Medium" | "Low",
  status: string,
  claim: string,
  explanation: string,
  evidence: string,
  recommendation: string,
  evidenceId?: string
): Finding {
  return { id, title, category, severity, status, claim, explanation, evidence, evidenceId, recommendation };
}

function applyRule(claim: Claim, rule: RulePack["rules"][0], fullText: string, isSample: boolean, index: number): Finding | null {
  const match = claimMatchesRule(claim, rule);
  if (!match.matched) return null;

  if (rule.id === "product-spec-mismatch" && match.matchedNumber !== undefined) {
    const approvedNumber = getApprovedNumber(rule.evidenceIds);
    if (approvedNumber !== null && match.matchedNumber !== approvedNumber) {
      return makeFinding(
        `spec-${index}`,
        rule.name,
        rule.category,
        rule.severity,
        "Outdated",
        claim.text,
        renderTemplate(rule.explanationTemplate, {
          matched_number: match.matchedNumber,
          approved_number: approvedNumber,
        }),
        `Northwind Product Fact Sheet · v3.2 · Approved fact: ${approvedNumber} supported data sources.`,
        renderTemplate(rule.recommendationTemplate, {
          matched_number: match.matchedNumber,
          approved_number: approvedNumber,
        }),
        rule.evidenceIds[0]
      );
    }
    return null;
  }

  const context = {
    matched_text: match.matchedText || "",
    matched_number: match.matchedNumber ?? "",
    evidence_sources: rule.evidenceIds,
  };

  return makeFinding(
    `${rule.id}-${index}`,
    rule.name,
    rule.category,
    rule.severity,
    "Unverified",
    claim.text,
    renderTemplate(rule.explanationTemplate, context),
    `Approved evidence: ${rule.evidenceIds.join(", ")}`,
    renderTemplate(rule.recommendationTemplate, context),
    rule.evidenceIds[0]
  );
}

function evaluateClaims(claims: Claim[], fullText: string, isSample: boolean, rules: RulePack["rules"]): Finding[] {
  const findings: Finding[] = [];
  let findingIndex = 0;

  for (const claim of claims) {
    let matched = false;

    for (const rule of rules) {
      const finding = applyRule(claim, rule, fullText, isSample, findingIndex);
      if (finding) {
        findings.push(finding);
        findingIndex++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      findings.push(makeFinding(
        `claim-${findingIndex}`,
        `Unverified claim: ${claim.text.slice(0, 50)}...`,
        claim.category,
        claim.severity,
        "Unverified",
        claim.text,
        "This claim was extracted but no deterministic rule applies. Manual evidence review required.",
        "No approved source was found in the claim library.",
        "Attach approved supporting evidence or remove the claim.",
        claim.suggestedEvidenceId
      ));
      findingIndex++;
    }
  }

  if (isSample) {
    findings.push(
      makeFinding(
        "contrast",
        "Low text contrast",
        "Accessibility",
        "Medium",
        "Needs correction",
        "Campaign banner text contrast",
        "The demo banner has a 2.5:1 contrast ratio. Normal text needs at least 4.5:1 for WCAG AA.",
        "WCAG 2.2 AA 1.4.3 and Northwind Brand Guide 5.1 · Normal text requires 4.5:1 contrast.",
        "Use approved dark grey #374151 on white, approximately 10:1, and recalculate contrast.",
        "wcag-contrast"
      ),
      makeFinding(
        "missing-alt-text",
        "Missing image alternative text",
        "Accessibility",
        "High",
        "Needs correction",
        "Campaign banner image",
        "The campaign banner has no alternative text, so meaningful visual content may be inaccessible.",
        "WCAG 2.2 AA 1.1.1 and Northwind Brand Guide 7.4 · Meaningful images require concise alternative text.",
        'Add: "Dashboard showing monthly revenue trends."',
        "wcag-alt-text"
      )
    );
  }

  return findings;
}

function testCommand(args: string[]): void {
  let text = "";
  let filePath = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && i + 1 < args.length) {
      text = args[i + 1];
      i++;
    } else if (args[i] === "--file" && i + 1 < args.length) {
      filePath = args[i + 1];
      i++;
    }
  }

  if (!text && !filePath) {
    console.error("❌ Provide --text \"your text\" or --file path/to/file.txt");
    process.exit(1);
  }

  if (filePath) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }
    text = fs.readFileSync(fullPath, "utf-8");
  }

  console.log("🧪 Testing rules against provided text...\n");
  console.log("📝 Input text:");
  console.log(text);
  console.log("");

  const rulePack = loadRulePack();
  const claims = extractClaims(text);

  console.log(`🔍 Extracted ${claims.length} claims:`);
  for (const claim of claims) {
    console.log(`  • [${claim.severity}] ${claim.category}: "${claim.text.slice(0, 80)}${claim.text.length > 80 ? "..." : ""}"`);
  }
  console.log("");

  const findings = evaluateClaims(claims, text, true, rulePack.rules);

  console.log(`📊 Results: ${findings.length} findings\n`);

  const bySeverity = { High: 0, Medium: 0, Low: 0 };
  for (const finding of findings) {
    bySeverity[finding.severity]++;
  }

  console.log("Severity breakdown:");
  console.log(`  🔴 High: ${bySeverity.High}`);
  console.log(`  🟡 Medium: ${bySeverity.Medium}`);
  console.log(`  🟢 Low: ${bySeverity.Low}`);
  console.log("");

  for (const finding of findings) {
    const severityIcon = finding.severity === "High" ? "🔴" : finding.severity === "Medium" ? "🟡" : "🟢";
    const statusIcon = finding.status === "Supported" ? "✅" : finding.status === "Outdated" ? "⚠️" : "❓";

    console.log(`${severityIcon} ${statusIcon} ${finding.title} (${finding.category})`);
    console.log(`    Claim: "${finding.claim}"`);
    console.log(`    Why: ${finding.explanation}`);
    console.log(`    Fix: ${finding.recommendation}`);
    console.log(`    Evidence: ${finding.evidenceId || "N/A"}`);
    console.log("");
  }

  // Exit code: 1 if any High severity findings
  if (bySeverity.High > 0) {
    console.log("⚠️  High severity findings detected — CI would fail");
    process.exit(1);
  } else {
    console.log("✅ All findings are Medium or Low — CI would pass");
    process.exit(0);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📦 Inkloom CLI — Policy-as-Code Tooling

Usage:
  npx inkloom rules validate          # Validate rule pack syntax
  npx inkloom rules test --text "..." # Test rules against text
  npx inkloom rules test --file path  # Test rules against file

Examples:
  npx inkloom rules validate
  npx inkloom rules test --text "Northwind is the world's fastest platform with 5 data sources."
  npx inkloom rules test --file ./campaign.txt
`);
    process.exit(0);
  }

  const command = args[0];
  const subArgs = args.slice(1);

  switch (command) {
    case "rules":
      if (subArgs[0] === "validate") {
        validateCommand();
      } else if (subArgs[0] === "test") {
        testCommand(subArgs.slice(1));
      } else {
        console.error(`❌ Unknown rules command: ${subArgs[0]}`);
        console.error("Use: validate | test");
        process.exit(1);
      }
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error("Use: rules");
      process.exit(1);
  }
}

main();