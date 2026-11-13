import { appendFile } from "node:fs/promises";

const repositoryInput = process.env.REPOLENS_REPOSITORY || process.env.GITHUB_REPOSITORY || "";
const apiUrl = process.env.REPOLENS_API_URL || "https://repo-lens-free-frame.vercel.app/api/v1/analyze";
const minimumInput = process.env.REPOLENS_MINIMUM_SCORE || "";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

function fail(message) {
  coreError(message);
  process.exitCode = 1;
}

function coreError(message) {
  console.error(`::error::${String(message).replace(/[\r\n]/g, " ")}`);
}

function normalizeRepository(value) {
  const raw = value.trim();
  const match = raw.match(/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/i);
  if (!match || match[2] === "." || match[2] === "..") {
    throw new Error("Use a public GitHub repository in owner/name or https://github.com/owner/name format.");
  }
  return `https://github.com/${match[1]}/${match[2].replace(/\.git$/i, "")}`;
}

function markdownCell(value) {
  return String(value ?? "").replace(/[|\r\n]/g, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function statusLabel(status) {
  if (status === "pass") return "✅ Pass";
  if (status === "fail") return "❌ Needs work";
  return "⚪ Unverified";
}

async function main() {
  if (!summaryPath) throw new Error("GitHub Actions did not provide a workflow summary file.");

  const repositoryUrl = normalizeRepository(repositoryInput);
  const endpoint = new URL(apiUrl);
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "repo-lens-free-frame.vercel.app") {
    throw new Error("The API URL must use HTTPS on repo-lens-free-frame.vercel.app.");
  }
  endpoint.searchParams.set("url", repositoryUrl);

  let minimumScore = null;
  if (minimumInput.trim()) {
    minimumScore = Number(minimumInput);
    if (!Number.isInteger(minimumScore) || minimumScore < 0 || minimumScore > 100) {
      throw new Error("minimum-score must be a whole number from 0 to 100.");
    }
  }

  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok || !result.data) {
    throw new Error(result?.error?.message || `RepoLens could not analyze this repository (HTTP ${response.status}).`);
  }

  const analysis = result.data;
  const score = analysis.score.score;
  const scoreLabel = analysis.score.complete && score !== null ? `${score}/100` : "Incomplete";
  const lines = [
    `## RepoLens analysis: [${markdownCell(analysis.repo.fullName)}](${repositoryUrl})`,
    "",
    `**Portfolio readiness:** ${scoreLabel}  `,
    `**Language:** ${markdownCell(analysis.repo.language || "Not specified")} · **Stars:** ${analysis.repo.stars}`,
    "",
    "| Check | Result | Points | Evidence |",
    "|---|---|---:|---|",
    ...analysis.checks.map((check) => `| ${markdownCell(check.label)} | ${statusLabel(check.status)} | ${check.points}/${check.maxPoints} | ${markdownCell(check.evidence)} |`),
  ];

  if (analysis.recommendations.length) {
    lines.push("", "### Suggested next steps", "", ...analysis.recommendations.slice(0, 5).map((item) => `- **${markdownCell(item.title)}** (+${item.potentialPoints} points): ${markdownCell(item.whatIsMissing)}`));
  }

  lines.push("", "_RepoLens checks portfolio presentation signals from public GitHub data. It does not measure code quality or security, and detected tests are not run._", "");
  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `score=${score ?? ""}\ncomplete=${analysis.score.complete}\n`, "utf8");
  }

  console.log(`RepoLens published the ${scoreLabel} summary for ${analysis.repo.fullName}.`);
  if (minimumScore !== null && (score === null || score < minimumScore)) {
    fail(`Repository score did not meet the configured minimum of ${minimumScore}/100.`);
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : "RepoLens analysis failed.";
  if (summaryPath) {
    await appendFile(summaryPath, `## RepoLens analysis\n\nAnalysis could not be completed: ${markdownCell(message)}\n`, "utf8").catch(() => {});
  }
  fail(message);
});
