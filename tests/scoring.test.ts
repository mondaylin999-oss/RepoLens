import { describe, expect, it } from "vitest";
import { calculateScore, scoreBand } from "@/lib/analysis/scoring";
import { CHECK_DEFINITIONS, runChecks } from "@/lib/analysis/checks";
import { makeRepo, makeTree } from "./fixtures";

describe("calculateScore", () => {
  it("check weights total 100", () => {
    expect(CHECK_DEFINITIONS.reduce((s, d) => s + d.maxPoints, 0)).toBe(100);
  });

  it("scores a fully ready repository 100", () => {
    const s = calculateScore(runChecks({ repo: makeRepo(), tree: makeTree() }));
    expect(s).toEqual({ score: 100, earned: 100, possible: 100, unknownPoints: 0, complete: true });
  });

  it("scores an empty-handed repository 0", () => {
    const repo = makeRepo({ description: null, homepage: null, license: null });
    const s = calculateScore(runChecks({ repo, tree: makeTree(["main.py"]) }));
    expect(s.score).toBe(0);
  });

  it("awards exact points per indicator", () => {
    // README (20) + description (10) + .gitignore (10) = 40
    const repo = makeRepo({ homepage: null, license: null });
    const s = calculateScore(runChecks({ repo, tree: makeTree(["README.md", ".gitignore", "index.js"]) }));
    expect(s.score).toBe(40);
  });

  it("is deterministic", () => {
    const a = calculateScore(runChecks({ repo: makeRepo(), tree: makeTree() }));
    const b = calculateScore(runChecks({ repo: makeRepo(), tree: makeTree() }));
    expect(a).toEqual(b);
  });

  it("withholds a final score when analysis is incomplete", () => {
    const s = calculateScore(runChecks({ repo: makeRepo({ license: null }), tree: makeTree(["README.md"], "truncated") }));
    expect(s.complete).toBe(false);
    expect(s.score).toBeNull();
    expect(s.earned).toBe(20 + 10 + 15);
    expect(s.unknownPoints).toBe(10 + 10 + 20 + 15);
  });

  it("maps score bands", () => {
    expect(scoreBand(100).band).toBe("excellent");
    expect(scoreBand(70).band).toBe("good");
    expect(scoreBand(45).band).toBe("fair");
    expect(scoreBand(10).band).toBe("needs-work");
  });
});
