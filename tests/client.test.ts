import { describe, expect, it, vi } from "vitest";
import { GitHubClient } from "@/lib/github/client";
import { GitHubError } from "@/lib/github/errors";
import { makeRepo } from "./fixtures";

const rawRepo = {
  name: "demo-app",
  full_name: "octo/demo-app",
  owner: { login: "octo", avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/octo" },
  description: "Demo",
  language: "TypeScript",
  html_url: "https://github.com/octo/demo-app",
  homepage: "",
  stargazers_count: 5,
  forks_count: 2,
  open_issues_count: 1,
  pushed_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  topics: ["react"],
  default_branch: "develop",
  license: null,
  archived: false,
  fork: false,
  size: 100,
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

describe("GitHubClient", () => {
  it("maps repository metadata and only calls api.github.com", async () => {
    const fetchImpl = vi.fn(async () => json(rawRepo));
    const meta = await new GitHubClient({ fetchImpl, token: "t" }).getRepository("octo", "demo-app");
    expect(meta).toMatchObject({ owner: "octo", stars: 5, defaultBranch: "develop", homepage: null, license: null });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/octo/demo-app");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("uses the actual default branch for the tree", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(async () => json({ sha: "x", truncated: false, tree: [{ path: "README.md", type: "blob" }, { path: "src", type: "tree" }] }));
    const tree = await new GitHubClient({ fetchImpl: fetchImpl as unknown as typeof fetch }).getTree("octo", "demo-app", makeRepo({ defaultBranch: "develop" }));
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.github.com/repos/octo/demo-app/git/trees/develop?recursive=1");
    expect(tree).toEqual({ status: "complete", paths: ["README.md"] });
  });

  it("resolves branch names containing slashes to a tree SHA", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ commit: { commit: { tree: { sha: "abc123" } } } }))
      .mockResolvedValueOnce(json({ sha: "abc123", truncated: false, tree: [] }));
    await new GitHubClient({ fetchImpl }).getTree("octo", "demo-app", makeRepo({ defaultBranch: "release/v1" }));
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.github.com/repos/octo/demo-app/branches/release/v1");
    expect(fetchImpl.mock.calls[1][0]).toBe("https://api.github.com/repos/octo/demo-app/git/trees/abc123?recursive=1");
  });

  it("reports truncated trees", async () => {
    const fetchImpl = vi.fn(async () => json({ sha: "x", truncated: true, tree: [{ path: "a.ts", type: "blob" }] }));
    const tree = await new GitHubClient({ fetchImpl }).getTree("o", "r", makeRepo());
    expect(tree.status).toBe("truncated");
  });

  it("returns an unavailable tree instead of failing on server errors", async () => {
    const fetchImpl = vi.fn(async () => json({ message: "boom" }, 502));
    const tree = await new GitHubClient({ fetchImpl }).getTree("o", "r", makeRepo());
    expect(tree.status).toBe("unavailable");
  });

  it.each([
    [json({ message: "Not Found" }, 404), "NOT_FOUND"],
    [json({ message: "API rate limit exceeded" }, 403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" }), "RATE_LIMITED"],
    [json({ message: "Too many" }, 429), "RATE_LIMITED"],
    [json({ message: "Forbidden" }, 403, { "x-ratelimit-remaining": "40" }), "INACCESSIBLE"],
    [json({ message: "Repository access blocked" }, 451), "INACCESSIBLE"],
    [json({ message: "Server Error" }, 503), "UPSTREAM_UNAVAILABLE"],
  ])("maps HTTP errors (%#) to %s", async (res, code) => {
    const fetchImpl = vi.fn(async () => res);
    await expect(new GitHubClient({ fetchImpl }).getRepository("o", "r")).rejects.toMatchObject({ code });
  });

  it("includes the rate-limit reset time", async () => {
    const fetchImpl = vi.fn(async () => json({}, 403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" }));
    const err = (await new GitHubClient({ fetchImpl }).getRepository("o", "r").catch((e) => e)) as GitHubError;
    expect(err.retryAt).toBe(new Date(1900000000 * 1000).toISOString());
  });

  it("detects empty repositories", async () => {
    const fetchImpl = vi.fn(async () => json({ message: "Git Repository is empty." }, 409));
    await expect(new GitHubClient({ fetchImpl }).getTree("o", "r", makeRepo())).rejects.toMatchObject({ code: "EMPTY_REPOSITORY" });
  });

  it("maps network failures and timeouts", async () => {
    const network = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(new GitHubClient({ fetchImpl: network }).getRepository("o", "r")).rejects.toMatchObject({ code: "NETWORK_ERROR" });

    const slow = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    await expect(new GitHubClient({ fetchImpl: slow as typeof fetch, timeoutMs: 20 }).getRepository("o", "r")).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
