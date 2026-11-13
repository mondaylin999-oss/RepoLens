import "server-only";
import { createHash } from "node:crypto";
import type { RepoMetadata, RepoTree } from "@/lib/types";
import { GitHubError } from "./errors";

/**
 * Minimal GitHub REST client. Every request targets the fixed API origin below and is built
 * only from validated owner/repo values — user-supplied URLs are never fetched.
 */
const API_ORIGIN = "https://api.github.com";
const TIMEOUT_MS = 10_000;

type FetchLike = typeof fetch;

interface SharedRequestResult {
  data?: unknown;
  error?: GitHubError;
}

const inFlightRequests = new WeakMap<FetchLike, Map<string, Promise<SharedRequestResult>>>();

export interface GitHubClientOptions {
  token?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

interface RawRepo {
  private: boolean;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string; html_url: string };
  description: string | null;
  language: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
  topics?: string[];
  default_branch: string;
  license: { spdx_id: string | null; name: string } | null;
  archived: boolean;
  fork: boolean;
  size: number;
}

interface RawTree {
  sha: string;
  truncated: boolean;
  tree: { path: string; type: "blob" | "tree" | "commit" }[];
}

export class GitHubClient {
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(opts: GitHubClientOptions = {}) {
    this.token = opts.token;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  }

  async getRepository(owner: string, repo: string): Promise<RepoMetadata> {
    const raw = await this.request<RawRepo>(`/repos/${enc(owner)}/${enc(repo)}`, "repository");
    if (raw.private) throw new GitHubError("INACCESSIBLE", "RepoLens only analyzes public repositories.", 403);
    return mapRepo(raw);
  }

  /**
   * Fetches the recursive file tree of the repository's actual default branch.
   * Never throws for tree problems other than an empty repository: returns status "unavailable" instead,
   * so the metadata-based checks can still be shown.
   */
  async getTree(owner: string, repo: string, meta: RepoMetadata): Promise<RepoTree> {
    try {
      const treeSha = await this.resolveTreeRef(owner, repo, meta.defaultBranch);
      const raw = await this.request<RawTree>(
        `/repos/${enc(owner)}/${enc(repo)}/git/trees/${enc(treeSha)}?recursive=1`,
        "tree",
      );
      const paths = raw.tree.filter((e) => e.type === "blob").map((e) => e.path);
      return raw.truncated
        ? {
            status: "truncated",
            paths,
            reason: "This repository is very large, so GitHub returned only part of its file list.",
          }
        : { status: "complete", paths };
    } catch (err) {
      if (err instanceof GitHubError) {
        if (err.code === "EMPTY_REPOSITORY") throw err;
        if (err.code === "NOT_FOUND" && meta.sizeKb === 0) {
          throw new GitHubError("EMPTY_REPOSITORY", emptyMessage, 422);
        }
        return { status: "unavailable", paths: [], reason: `The file list couldn't be loaded: ${err.message}` };
      }
      return { status: "unavailable", paths: [], reason: "The file list couldn't be loaded." };
    }
  }

  /** Branch names may contain '/', which the trees endpoint can't take directly — resolve those to a SHA. */
  private async resolveTreeRef(owner: string, repo: string, branch: string): Promise<string> {
    if (!branch.includes("/")) return branch;
    const data = await this.request<{ commit: { commit: { tree: { sha: string } } } }>(
      `/repos/${enc(owner)}/${enc(repo)}/branches/${branch.split("/").map(enc).join("/")}`,
      "branch",
    );
    return data.commit.commit.tree.sha;
  }

  private async request<T>(path: string, what: "repository" | "tree" | "branch"): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "RepoLens/1.0",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const url = `${API_ORIGIN}${path}`;
    const authKey = this.token ? createHash("sha256").update(this.token).digest("hex") : "public";
    const key = `${authKey}:${url}`;
    let pending = inFlightRequests.get(this.fetchImpl);
    if (!pending) {
      pending = new Map();
      inFlightRequests.set(this.fetchImpl, pending);
    }

    let request = pending.get(key);
    if (!request) {
      // Share only concurrent requests. Successful public responses also reuse Next's
      // short fetch cache below; request tokens are represented by a one-way digest.
      request = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const res = await this.fetchImpl(url, {
            headers,
            signal: controller.signal,
            cache: "no-store",
          } as RequestInit);
          if (res.ok) return { data: await res.json() };
          return { error: await toError(res, what, Boolean(this.token)) };
        } catch (err) {
          if (isAbort(err)) {
            return { error: new GitHubError("TIMEOUT", "GitHub took too long to respond. Please try again.", 504) };
          }
          return { error: new GitHubError("NETWORK_ERROR", "Couldn't reach GitHub. Check your connection and try again.", 502) };
        } finally {
          clearTimeout(timer);
          pending?.delete(key);
        }
      })();
      pending.set(key, request);
    }

    const result = await request;
    if (result.error) throw result.error;
    return result.data as T;
  }
}

const emptyMessage = "This repository is empty — push some code to it, then analyze it again.";

async function toError(res: Response, what: string, authenticated: boolean): Promise<GitHubError> {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");
  let body = "";
  try {
    body = ((await res.json()) as { message?: string }).message ?? "";
  } catch {
    /* body is optional */
  }

  if (res.status === 429 || (res.status === 403 && (remaining === "0" || /rate limit/i.test(body)))) {
    let retryAt: string | undefined;
    if (reset && /^\d+$/.test(reset)) retryAt = new Date(Number(reset) * 1000).toISOString();
    else if (retryAfter && /^\d+$/.test(retryAfter)) retryAt = new Date(Date.now() + Number(retryAfter) * 1000).toISOString();
    return new GitHubError(
      "RATE_LIMITED",
      "GitHub's API rate limit has been reached. Please wait until it resets before trying again.",
      429,
      retryAt,
    );
  }
  if (res.status === 409 && what === "tree") return new GitHubError("EMPTY_REPOSITORY", emptyMessage, 422);
  if (res.status === 404) {
    return new GitHubError(
      "NOT_FOUND",
      what === "repository"
        ? "Repository not found. Check the URL — private repositories can't be analyzed."
        : `GitHub couldn't find the repository's ${what}.`,
      404,
    );
  }
  if (res.status === 401 && authenticated) {
    return new GitHubError("INACCESSIBLE", "GitHub rejected the token. Check it or clear it and retry without one.", 403);
  }
  if (res.status === 401 || res.status === 403 || res.status === 451) {
    return new GitHubError("INACCESSIBLE", "This repository isn't publicly accessible.", 403);
  }
  if (res.status >= 500) {
    return new GitHubError("UPSTREAM_UNAVAILABLE", "GitHub's API is temporarily unavailable. Please try again shortly.", 503);
  }
  return new GitHubError("UPSTREAM_UNAVAILABLE", "GitHub returned an unexpected response.", 502);
}

function mapRepo(r: RawRepo): RepoMetadata {
  return {
    owner: r.owner.login,
    ownerAvatarUrl: r.owner.avatar_url,
    ownerUrl: r.owner.html_url,
    name: r.name,
    fullName: r.full_name,
    description: r.description?.trim() || null,
    language: r.language,
    htmlUrl: r.html_url,
    homepage: r.homepage?.trim() || null,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    pushedAt: r.pushed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    topics: r.topics ?? [],
    defaultBranch: r.default_branch,
    license: r.license ? { spdxId: r.license.spdx_id, name: r.license.name } : null,
    archived: r.archived,
    isFork: r.fork,
    sizeKb: r.size,
  };
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}
