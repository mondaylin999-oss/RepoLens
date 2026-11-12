import { describe, expect, it } from "vitest";
import { parseGitHubRepoUrl } from "@/lib/github/parser";

describe("parseGitHubRepoUrl", () => {
  it.each([
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["https://github.com/vercel/next.js/", "vercel", "next.js"],
    ["https://github.com/vercel/next.js.git", "vercel", "next.js"],
    ["http://github.com/owner/repo", "owner", "repo"],
    ["https://www.github.com/owner/repo", "owner", "repo"],
    ["github.com/owner/my_repo-2", "owner", "my_repo-2"],
    ["  https://github.com/owner/repo  ", "owner", "repo"],
    ["https://github.com/owner/repo/tree/main/src", "owner", "repo"],
    ["https://github.com/owner/repo?tab=readme#top", "owner", "repo"],
  ])("accepts %s", (input, owner, repo) => {
    const r = parseGitHubRepoUrl(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.owner).toBe(owner);
      expect(r.value.repo).toBe(repo);
      expect(r.value.normalizedUrl).toBe(`https://github.com/${owner}/${repo}`);
    }
  });

  it.each([
    [""],
    ["   "],
    ["not a url"],
    ["https://gitlab.com/owner/repo"],
    ["https://github.com.evil.com/owner/repo"],
    ["https://evil.com/github.com/owner/repo"],
    ["https://github.com/owner"],
    ["https://github.com/"],
    ["https://user:pass@github.com/owner/repo"],
    ["https://github.com:8080/owner/repo"],
    ["ftp://github.com/owner/repo"],
    ["javascript:alert(1)"],
    ["https://github.com/-bad/repo"],
    ["https://github.com/owner/re po"],
    ["https://github.com/owner/repo$"],
    ["https://github.com/owner/.."],
    ["https://github.com/settings/profile"],
    ["https://github.com/orgs/vercel"],
    ["https://github.com/owner/repo/unknownpage"],
    ["https://github.com/" + "a".repeat(400)],
    ["https://api.github.com/repos/owner/repo"],
  ])("rejects %s", (input) => {
    const r = parseGitHubRepoUrl(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});
