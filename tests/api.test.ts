import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analyze/route";

function req(url: string) {
  return new NextRequest(`http://localhost/api/analyze?url=${encodeURIComponent(url)}`);
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/analyze", () => {
  it("rejects invalid URLs with 400 without calling GitHub", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await GET(req("https://example.com/a/b"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "INVALID_URL" } });
    expect(f).not.toHaveBeenCalled();
  });

  it("returns a full analysis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/repos/octo/demo")) {
          return Response.json({
            name: "demo", full_name: "octo/demo",
            owner: { login: "octo", avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/octo" },
            description: "Demo project", language: "Go", html_url: "https://github.com/octo/demo", homepage: null,
            stargazers_count: 1, forks_count: 0, open_issues_count: 0, pushed_at: null, updated_at: "2026-01-01T00:00:00Z",
            topics: [], default_branch: "trunk", license: null, archived: false, fork: false, size: 10,
          });
        }
        if (url.includes("/git/trees/trunk")) {
          return Response.json({ sha: "s", truncated: false, tree: [{ path: "README.md", type: "blob" }, { path: "main_test.go", type: "blob" }] });
        }
        return new Response("{}", { status: 404 });
      }),
    );
    const res = await GET(req("https://github.com/octo/demo.git"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.score.score).toBe(50); // README 20 + description 10 + tests 20
    expect(body.data.repo.defaultBranch).toBe("trunk");
  });

  it("returns 404 for missing repositories", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Not Found" }, { status: 404 })));
    const res = await GET(req("https://github.com/octo/missing"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
