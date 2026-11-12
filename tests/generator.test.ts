import { describe, expect, it } from "vitest";
import { cleanDescription, generatePortfolioDescription, PLACEHOLDERS } from "@/lib/portfolio/generator";
import { makeRepo } from "./fixtures";

describe("generatePortfolioDescription", () => {
  it("uses only verified repository facts", () => {
    const d = generatePortfolioDescription(makeRepo());
    expect(d.portfolio).toBe(
      [
        "Project: demo-app",
        "",
        "Overview: A tool for tracking study sessions.",
        "",
        "Primary language: TypeScript",
        "Topics: nextjs, react",
        "",
        "Live demo: https://demo-app.vercel.app/",
        "Repository: https://github.com/octo/demo-app",
      ].join("\n"),
    );
    expect(d.placeholders).toEqual([]);
    expect(d.linkedin).toContain("Written primarily in TypeScript.");
    expect(d.linkedin).toContain("Source code: https://github.com/octo/demo-app");
  });

  it("uses editable placeholders instead of inventing content", () => {
    const d = generatePortfolioDescription(makeRepo({ description: null, language: null, topics: [], homepage: null }));
    expect(d.portfolio).toContain(PLACEHOLDERS.overview);
    expect(d.portfolio).toContain(PLACEHOLDERS.technology);
    expect(d.portfolio).not.toContain("Live demo");
    expect(d.placeholders).toEqual(["overview", "technology"]);
  });

  it("omits an invalid demo URL", () => {
    const d = generatePortfolioDescription(makeRepo({ homepage: "http://localhost:3000" }));
    expect(d.portfolio).not.toContain("localhost");
  });

  it("does not repeat the language as a topic", () => {
    const d = generatePortfolioDescription(makeRepo({ language: "Python", topics: ["python", "flask"] }));
    expect(d.portfolio).toContain("Topics: flask");
  });

  it("is deterministic", () => {
    expect(generatePortfolioDescription(makeRepo())).toEqual(generatePortfolioDescription(makeRepo()));
  });
});

describe("cleanDescription", () => {
  it("preserves meaning while tidying format", () => {
    expect(cleanDescription(":rocket: fast   static site generator")).toBe("Fast static site generator.");
    expect(cleanDescription("Already punctuated!")).toBe("Already punctuated!");
    expect(cleanDescription("   ")).toBeNull();
    expect(cleanDescription(null)).toBeNull();
  });
});
