import type { CheckId, CheckResult, CheckStatus, RepoMetadata, RepoTree } from "@/lib/types";

/**
 * Deterministic readiness checks. Each check inspects only GitHub metadata or file paths.
 * Add a new check by appending to CHECK_DEFINITIONS — scoring and the UI pick it up automatically.
 */

export interface CheckContext {
  repo: RepoMetadata;
  tree: RepoTree;
}

interface Outcome {
  status: CheckStatus;
  evidence: string;
  matches?: string[];
}

export interface CheckDefinition {
  id: CheckId;
  label: string;
  maxPoints: number;
  run: (ctx: CheckContext) => Outcome;
}

const MAX_MATCHES = 5;

// ---------- Path helpers ----------

/** Directories whose contents never count as the project's own files. */
const IGNORED_DIRS = /(^|\/)(node_modules|vendor|third_party|bower_components|\.venv|venv|dist|build|target)\//i;

export function projectPaths(paths: string[]): string[] {
  return paths.filter((p) => !IGNORED_DIRS.test(p));
}

function isRoot(path: string): boolean {
  return !path.includes("/");
}

/**
 * For file-based checks: a match is definitive; no match is only definitive when the full tree was read.
 */
function fileOutcome(
  tree: RepoTree,
  matches: string[],
  found: (m: string[]) => string,
  notFound: string,
): Outcome {
  if (matches.length > 0) return { status: "pass", evidence: found(matches), matches: matches.slice(0, MAX_MATCHES) };
  if (tree.status === "truncated") {
    return { status: "unknown", evidence: `${notFound.replace(/\.$/, "")} in the partial file list GitHub returned, but it may exist in the part that wasn't returned.` };
  }
  if (tree.status === "unavailable") {
    return { status: "unknown", evidence: "The repository's file list couldn't be loaded, so this couldn't be checked." };
  }
  return { status: "fail", evidence: notFound };
}

// ---------- Patterns ----------

export const README_RE = /^readme(\.(md|markdown|mdown|mkdn|rst|txt|adoc|asciidoc|asc|org|textile|rdoc|pod|creole|wiki|mediawiki))?$/i;
/** GitHub also displays a README from these folders on the repository page. */
const README_DIRS = ["", ".github/", "docs/"];

export const LICENSE_RE = /^(licen[sc]e|copying|unlicense)([-._][A-Za-z0-9.+-]*)?$/i;

const TEST_DIR_SEGMENTS = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e", "cypress", "integration-tests"]);
const TEST_FILE_PATTERNS: RegExp[] = [
  /\.(test|spec)\.[cm]?[jt]sx?$/i, // JS/TS: foo.test.ts, foo.spec.jsx
  /(^|\/)test_[^/]+\.py$/i, // Python: test_foo.py
  /_test\.py$/i, // Python: foo_test.py
  /(^|\/)conftest\.py$/i, // pytest fixtures file
  /_test\.go$/i, // Go
  /_spec\.rb$/i, // RSpec
  /_test\.rb$/i, // Minitest
  /Tests?\.(java|kt|kts|scala|cs|php|swift)$/, // JUnit, xUnit, PHPUnit, XCTest (case-sensitive suffix)
  /_test\.(dart|exs|cpp|cc|c)$/i, // Dart, Elixir, C/C++
  /\.(test|spec)\.(py|rb|php|dart)$/i,
];

export function isTestPath(path: string): boolean {
  const segments = path.split("/");
  const dirs = segments.slice(0, -1);
  if (dirs.some((d) => TEST_DIR_SEGMENTS.has(d.toLowerCase()))) return true;
  // src/test/java style is covered above; also Swift "Tests" folders like MyAppTests/
  if (dirs.some((d) => /^[A-Za-z0-9]+Tests$/.test(d))) return true;
  return TEST_FILE_PATTERNS.some((re) => re.test(path));
}

export const WORKFLOW_RE = /^\.github\/workflows\/[^/]+\.ya?ml$/i;

/** Validates the repository "homepage" field as a public-facing website. Does not check availability. */
export function parseDemoUrl(homepage: string | null, repo: Pick<RepoMetadata, "owner" | "name">): { ok: true; url: string } | { ok: false; reason: string } {
  if (!homepage) return { ok: false, reason: "No website URL is set in the repository's \"About\" section." };
  const raw = /^[a-z][a-z0-9+.-]*:\/\//i.test(homepage) ? homepage : `https://${homepage}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `The website field ("${homepage}") isn't a valid URL.` };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "The website field must be an http(s) URL." };
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) || host === "[::1]" || !host.includes(".")
  ) {
    return { ok: false, reason: `The website field points to a local or private address (${host}), which visitors can't open.` };
  }
  if (host === "github.com" || host === "www.github.com") {
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    if (path === `/${repo.owner}/${repo.name}`.toLowerCase() || path === "" || path === `/${repo.owner}`.toLowerCase()) {
      return { ok: false, reason: "The website field links back to GitHub rather than to a live demo." };
    }
  }
  return { ok: true, url: url.toString() };
}

// ---------- Check definitions ----------

export const CHECK_DEFINITIONS: CheckDefinition[] = [
  {
    id: "readme",
    label: "README",
    maxPoints: 20,
    run: ({ tree }) => {
      const matches = tree.paths.filter((p) =>
        README_DIRS.some((dir) => p.startsWith(dir) && !p.slice(dir.length).includes("/") && README_RE.test(p.slice(dir.length))),
      );
      // Prefer root README in evidence.
      matches.sort((a, b) => Number(!isRoot(a)) - Number(!isRoot(b)));
      return fileOutcome(tree, matches, (m) => `Found ${m[0]}.`, "No README file was found in the repository root, .github/ or docs/.");
    },
  },
  {
    id: "description",
    label: "Repository description",
    maxPoints: 10,
    run: ({ repo }) =>
      repo.description
        ? { status: "pass", evidence: "The repository has a description on GitHub.", matches: [repo.description] }
        : { status: "fail", evidence: "The repository's \"About\" description is empty." },
  },
  {
    id: "license",
    label: "License",
    maxPoints: 10,
    run: ({ repo, tree }) => {
      const files = tree.paths.filter((p) => isRoot(p) && LICENSE_RE.test(p));
      if (repo.license) {
        const name = repo.license.spdxId && repo.license.spdxId !== "NOASSERTION" ? repo.license.spdxId : repo.license.name;
        return {
          status: "pass",
          evidence: `GitHub detected a license: ${name}.`,
          matches: [name, ...files].slice(0, MAX_MATCHES),
        };
      }
      return fileOutcome(tree, files, (m) => `Found ${m[0]}.`, "No license file was found and GitHub doesn't report a license.");
    },
  },
  {
    id: "gitignore",
    label: ".gitignore",
    maxPoints: 10,
    run: ({ tree }) => {
      const matches = tree.paths.filter((p) => p === ".gitignore");
      return fileOutcome(tree, matches, () => "Found .gitignore in the repository root.", "No .gitignore file was found in the repository root.");
    },
  },
  {
    id: "tests",
    label: "Tests",
    maxPoints: 20,
    run: ({ tree }) => {
      const matches = projectPaths(tree.paths).filter(isTestPath);
      return fileOutcome(
        tree,
        matches,
        (m) => `Found ${m.length} test-related file${m.length === 1 ? "" : "s"}. This shows tests exist, not that they pass.`,
        "No test files or test folders matching common conventions were found.",
      );
    },
  },
  {
    id: "ci",
    label: "CI workflow",
    maxPoints: 15,
    run: ({ tree }) => {
      const matches = tree.paths.filter((p) => WORKFLOW_RE.test(p));
      return fileOutcome(
        tree,
        matches,
        (m) => `Found ${m.length} GitHub Actions workflow${m.length === 1 ? "" : "s"} in .github/workflows/.`,
        "No GitHub Actions workflow files were found in .github/workflows/.",
      );
    },
  },
  {
    id: "demo",
    label: "Live demo URL",
    maxPoints: 15,
    run: ({ repo }) => {
      const parsed = parseDemoUrl(repo.homepage, repo);
      return parsed.ok
        ? { status: "pass", evidence: "A website URL is set in the repository's \"About\" section. Its availability was not verified.", matches: [parsed.url] }
        : { status: "fail", evidence: parsed.reason };
    },
  },
];

export function runChecks(ctx: CheckContext, definitions: CheckDefinition[] = CHECK_DEFINITIONS): CheckResult[] {
  return definitions.map((def) => {
    const outcome = def.run(ctx);
    return {
      id: def.id,
      label: def.label,
      status: outcome.status,
      maxPoints: def.maxPoints,
      points: outcome.status === "pass" ? def.maxPoints : 0,
      evidence: outcome.evidence,
      matches: outcome.matches ?? [],
    };
  });
}
