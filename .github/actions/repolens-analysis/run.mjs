import { appendFile } from "node:fs/promises";

const repositoryInput = process.env.REPOLENS_REPOSITORY || process.env.GITHUB_REPOSITORY || "";
const minimumInput = process.env.REPOLENS_MINIMUM_SCORE || "";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const apiOrigin = "https://api.github.com";

function fail(message) {
  console.error(`::error::${String(message).replace(/[\r\n]/g, " ")}`);
  process.exitCode = 1;
}

function normalizeRepository(value) {
  const raw = value.trim();
  const match = raw.match(/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/i);
  if (!match || match[2] === "." || match[2] === "..") {
    throw new Error("Use a public GitHub repository in owner/name or https://github.com/owner/name format.");
  }
  return { owner: match[1], name: match[2].replace(/\.git$/i, "") };
}

function markdownCell(value) {
  return String(value ?? "").replace(/[|\r\n]/g, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function github(path) {
  const response = await fetch(`${apiOrigin}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "RepoLens-GitHub-Action",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) throw new Error("Repository or its default branch was not found. Check that it is public and the URL is correct.");
    if (response.status === 403 || response.status === 429) throw new Error("GitHub's API limit was reached. Wait a while, then run the workflow again.");
    if (response.status >= 500) throw new Error("GitHub's API is temporarily unavailable. Run the workflow again later.");
    throw new Error(payload.message || `GitHub's API returned HTTP ${response.status}.`);
  }
  return payload;
}

const README_RE = /^readme(\.(md|markdown|mdown|mkdn|rst|txt|adoc|asciidoc|asc|org|textile|rdoc|pod|creole|wiki|mediawiki))?$/i;
const LICENSE_RE = /^(licen[sc]e|copying|unlicense)([-._][A-Za-z0-9.+-]*)?$/i;
const IGNORED_DIRS = /(^|\/)(node_modules|vendor|third_party|bower_components|\.venv|venv|dist|build|target)\//i;
const TEST_DIRS = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e", "cypress", "integration-tests"]);
const TEST_PATTERNS = [
  /\.(test|spec)\.[cm]?[jt]sx?$/i, /(^|\/)test_[^/]+\.py$/i, /_test\.py$/i,
  /(^|\/)conftest\.py$/i, /_test\.go$/i, /_spec\.rb$/i, /_test\.rb$/i,
  /Tests?\.(java|kt|kts|scala|cs|php|swift)$/, /_test\.(dart|exs|cpp|cc|c)$/i,
  /\.(test|spec)\.(py|rb|php|dart)$/i,
];

function isTestPath(path) {
  const segments = path.split("/");
  const dirs = segments.slice(0, -1);
  return dirs.some((dir) => TEST_DIRS.has(dir.toLowerCase()) || /^[A-Za-z0-9]+Tests$/.test(dir)) || TEST_PATTERNS.some((pattern) => pattern.test(path));
}

function fileCheck(id, label, maxPoints, matches, treeStatus, passEvidence, failEvidence) {
  let status = "fail";
  let evidence = failEvidence;
  if (matches.length) {
    status = "pass";
    evidence = passEvidence(matches);
  } else if (treeStatus === "truncated") {
    status = "unknown";
    evidence = `${failEvidence.replace(/\.$/, "")} in GitHub's partial file list; it may exist in the part that wasn't returned.`;
  } else if (treeStatus === "unavailable") {
    status = "unknown";
    evidence = "The repository's file list couldn't be loaded, so this couldn't be checked.";
  }
  return { id, label, maxPoints, status, points: status === "pass" ? maxPoints : 0, evidence, matches: matches.slice(0, 5) };
}

function demoIsPublic(homepage, owner, name) {
  if (!homepage) return false;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(homepage) ? homepage : `https://${homepage}`);
    const host = url.hostname.toLowerCase();
    if (!new Set(["https:", "http:"]).has(url.protocol) || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) || host === "[::1]" || !host.includes(".")) return false;
    if (host === "github.com" || host === "www.github.com") {
      const path = url.pathname.replace(/\/+$/, "").toLowerCase();
      if ([`/${owner}/${name}`, "", `/${owner}`].some((value) => path === value.toLowerCase())) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function analyze({ owner, name }) {
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const repository = await github(repoPath);
  if (repository.private) throw new Error("RepoLens only analyzes public repositories.");

  let paths = [];
  let treeStatus = "complete";
  try {
    let treeRef = repository.default_branch;
    if (treeRef.includes("/")) {
      const branch = await github(`${repoPath}/branches/${treeRef.split("/").map(encodeURIComponent).join("/")}`);
      treeRef = branch.commit.commit.tree.sha;
    }
    const tree = await github(`${repoPath}/git/trees/${encodeURIComponent(treeRef)}?recursive=1`);
    paths = tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
    if (tree.truncated) treeStatus = "truncated";
  } catch {
    if (repository.size === 0) throw new Error("This repository is empty and has no files to analyze.");
    treeStatus = "unavailable";
  }

  const readmes = paths.filter((path) => ["", ".github/", "docs/"].some((dir) => path.startsWith(dir) && !path.slice(dir.length).includes("/") && README_RE.test(path.slice(dir.length))));
  readmes.sort((a, b) => Number(a.includes("/")) - Number(b.includes("/")));
  const licenseFiles = paths.filter((path) => !path.includes("/") && LICENSE_RE.test(path));
  const tests = paths.filter((path) => !IGNORED_DIRS.test(path) && isTestPath(path));
  const workflows = paths.filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path));

  const checks = [
    fileCheck("readme", "README", 20, readmes, treeStatus, (items) => `Found ${items[0]}.`, "No README file was found in the repository root, .github/ or docs/."),
    repository.description?.trim()
      ? { id: "description", label: "Repository description", maxPoints: 10, status: "pass", points: 10, evidence: "The repository has a description on GitHub.", matches: [repository.description.trim()] }
      : { id: "description", label: "Repository description", maxPoints: 10, status: "fail", points: 0, evidence: "The repository's \"About\" description is empty.", matches: [] },
    repository.license
      ? { id: "license", label: "License", maxPoints: 10, status: "pass", points: 10, evidence: `GitHub detected a license: ${repository.license.spdx_id && repository.license.spdx_id !== "NOASSERTION" ? repository.license.spdx_id : repository.license.name}.`, matches: licenseFiles.slice(0, 5) }
      : fileCheck("license", "License", 10, licenseFiles, treeStatus, (items) => `Found ${items[0]}.`, "No license file was found and GitHub doesn't report a license."),
    fileCheck("gitignore", ".gitignore", 10, paths.filter((path) => path === ".gitignore"), treeStatus, () => "Found .gitignore in the repository root.", "No .gitignore file was found in the repository root."),
    fileCheck("tests", "Tests", 20, tests, treeStatus, (items) => `Found ${items.length} test-related file${items.length === 1 ? "" : "s"}. This shows tests exist, not that they pass.`, "No test files or test folders matching common conventions were found."),
    fileCheck("ci", "CI workflow", 15, workflows, treeStatus, (items) => `Found ${items.length} GitHub Actions workflow${items.length === 1 ? "" : "s"} in .github/workflows/.`, "No GitHub Actions workflow files were found in .github/workflows/."),
    demoIsPublic(repository.homepage, repository.owner.login, repository.name)
      ? { id: "demo", label: "Live demo URL", maxPoints: 15, status: "pass", points: 15, evidence: "A website URL is set in the repository's About section. Its availability was not verified.", matches: [repository.homepage] }
      : { id: "demo", label: "Live demo URL", maxPoints: 15, status: "fail", points: 0, evidence: repository.homepage ? "The website field does not contain a usable public demo URL." : "No website URL is set in the repository's \"About\" section.", matches: [] },
  ];
  const possible = checks.reduce((sum, check) => sum + check.maxPoints, 0);
  const earned = checks.reduce((sum, check) => sum + check.points, 0);
  const unknownPoints = checks.reduce((sum, check) => sum + (check.status === "unknown" ? check.maxPoints : 0), 0);
  return { repository, checks, score: unknownPoints ? null : Math.round((earned / possible) * 100), complete: unknownPoints === 0 };
}

async function main() {
  if (!summaryPath) throw new Error("GitHub Actions did not provide a workflow summary file.");
  const repository = normalizeRepository(repositoryInput);
  let minimumScore = null;
  if (minimumInput.trim()) {
    minimumScore = Number(minimumInput);
    if (!Number.isInteger(minimumScore) || minimumScore < 0 || minimumScore > 100) {
      throw new Error("minimum-score must be a whole number from 0 to 100.");
    }
  }

  const analysis = await analyze(repository);
  const displayName = analysis.repository.full_name;
  const repositoryUrl = `https://github.com/${encodeURIComponent(analysis.repository.owner.login)}/${encodeURIComponent(analysis.repository.name)}`;
  const scoreLabel = analysis.complete ? `${analysis.score}/100` : "Incomplete";
  const lines = [
    `## RepoLens analysis: [${markdownCell(displayName)}](${repositoryUrl})`,
    "",
    `**Portfolio readiness:** ${scoreLabel}  `,
    `**Language:** ${markdownCell(analysis.repository.language || "Not specified")} · **Stars:** ${analysis.repository.stargazers_count}`,
    "",
    "| Check | Result | Points | Evidence |",
    "|---|---|---:|---|",
    ...analysis.checks.map((check) => {
      const status = check.status === "pass" ? "✅ Pass" : check.status === "fail" ? "❌ Needs work" : "⚪ Unverified";
      return `| ${markdownCell(check.label)} | ${status} | ${check.points}/${check.maxPoints} | ${markdownCell(check.evidence)} |`;
    }),
  ];
  lines.push("", "_RepoLens checks portfolio presentation signals from public GitHub data. It does not measure code quality or security, and detected tests are not run._", "");
  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `score=${analysis.score ?? ""}\ncomplete=${analysis.complete}\n`, "utf8");

  console.log(`RepoLens published the ${scoreLabel} summary for ${displayName}.`);
  if (minimumScore !== null && (analysis.score === null || analysis.score < minimumScore)) {
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
