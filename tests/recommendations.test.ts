import { describe, expect, it } from "vitest";
import { generateRecommendations } from "@/lib/analysis/recommendations";
import { runChecks } from "@/lib/analysis/checks";
import { makeRepo, makeTree } from "./fixtures";

describe("generateRecommendations", () => {
  it("returns nothing for a fully ready repository with topics", () => {
    const repo = makeRepo();
    expect(generateRecommendations(repo, runChecks({ repo, tree: makeTree() }))).toEqual([]);
  });

  it("creates one recommendation per failed check, highest impact first", () => {
    const repo = makeRepo({ description: null, homepage: null, license: null });
    const recs = generateRecommendations(repo, runChecks({ repo, tree: makeTree(["src/main.ts"]) }));
    expect(recs.map((r) => r.checkId)).toEqual(["readme", "tests", "ci", "demo", "description", "license", "gitignore"]);
    for (const r of recs) {
      expect(r.whatIsMissing).toBeTruthy();
      expect(r.whyItMatters).toBeTruthy();
      expect(r.howToImprove.length).toBeGreaterThan(0);
    }
  });

  it("does not recommend anything for unknown checks", () => {
    const repo = makeRepo();
    const recs = generateRecommendations(repo, runChecks({ repo, tree: makeTree(["README.md"], "truncated") }));
    expect(recs).toEqual([]);
  });

  it("tailors test advice to the verified language", () => {
    const repo = makeRepo({ language: "Python" });
    const recs = generateRecommendations(repo, runChecks({ repo, tree: makeTree(["README.md", ".gitignore", "app.py"]) }));
    expect(recs.find((r) => r.checkId === "tests")!.howToImprove.join(" ")).toContain("pytest");
  });

  it("mentions existing tests in the CI recommendation", () => {
    const repo = makeRepo();
    const recs = generateRecommendations(repo, runChecks({ repo, tree: makeTree(["README.md", "a.test.ts"]) }));
    expect(recs.find((r) => r.checkId === "ci")!.whyItMatters).toMatch(/has tests/);
  });

  it("suggests topics only when there are none", () => {
    const repo = makeRepo({ topics: [] });
    const recs = generateRecommendations(repo, runChecks({ repo, tree: makeTree() }));
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ checkId: "topics", potentialPoints: 0 });
  });
});
