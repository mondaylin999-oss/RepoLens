/**
 * Parses and validates user-supplied GitHub repository URLs.
 * Pure and isomorphic: used by both the browser (instant feedback) and the API route (authoritative check).
 * Only owner/repo are extracted — the raw URL is never fetched.
 */

export interface ParsedRepo {
  owner: string;
  repo: string;
  /** Canonical form: https://github.com/owner/repo */
  normalizedUrl: string;
}

export type ParseResult = { ok: true; value: ParsedRepo } | { ok: false; error: string };

const MAX_INPUT_LENGTH = 300;

// GitHub usernames: 1–39 chars, alphanumeric or single hyphens, cannot start/end with a hyphen.
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
// Repository names: letters, digits, '.', '-', '_' up to 100 chars.
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

/** First path segments that are GitHub site pages, not users or organisations. */
const RESERVED_OWNERS = new Set([
  "about", "apps", "codespaces", "collections", "contact", "customer-stories", "enterprise", "events",
  "explore", "features", "issues", "join", "login", "logout", "marketplace", "new", "notifications",
  "orgs", "organizations", "pricing", "pulls", "search", "security", "settings", "site", "sponsors",
  "team", "topics", "trending", "users",
]);

const ALLOWED_HOSTS = new Set(["github.com", "www.github.com"]);

/** Sub-pages of a repository that we accept and strip (e.g. a link copied from a file view). */
const ALLOWED_SUBPATHS = new Set(["tree", "blob", "issues", "pulls", "actions", "wiki", "releases", "commits"]);

export function parseGitHubRepoUrl(input: string): ParseResult {
  if (typeof input !== "string") return fail("Enter a GitHub repository URL.");
  const trimmed = input.trim();
  if (!trimmed) return fail("Enter a GitHub repository URL.");
  if (trimmed.length > MAX_INPUT_LENGTH) return fail("That URL is too long to be a GitHub repository URL.");
  if (/\s/.test(trimmed)) return fail("URLs cannot contain spaces.");

  // Allow "github.com/owner/repo" without a scheme for convenience.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return fail("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fail("Only http(s) GitHub URLs are supported.");
  }
  if (url.username || url.password) return fail("URLs containing credentials are not allowed.");
  if (url.port) return fail("URLs with a custom port are not supported.");
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    return fail("Only github.com repository URLs are supported, e.g. https://github.com/owner/repository.");
  }

  let segments: string[];
  try {
    segments = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  } catch {
    return fail("That URL contains invalid characters.");
  }

  if (segments.length < 2) {
    return fail("Include both the owner and repository name, e.g. https://github.com/owner/repository.");
  }
  if (segments.length > 2 && !ALLOWED_SUBPATHS.has(segments[2].toLowerCase())) {
    return fail("That URL points to a GitHub page that isn't a repository.");
  }

  const owner = segments[0];
  let repo = segments[1];
  if (repo.toLowerCase().endsWith(".git")) repo = repo.slice(0, -4);

  if (RESERVED_OWNERS.has(owner.toLowerCase())) {
    return fail("That URL points to a GitHub page, not a repository.");
  }
  if (!OWNER_RE.test(owner)) return fail("The repository owner in that URL isn't a valid GitHub username.");
  if (!REPO_RE.test(repo) || repo === "." || repo === "..") {
    return fail("The repository name in that URL isn't valid.");
  }

  return { ok: true, value: { owner, repo, normalizedUrl: `https://github.com/${owner}/${repo}` } };
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}
