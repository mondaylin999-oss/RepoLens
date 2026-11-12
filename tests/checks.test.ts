import { describe, expect, it } from "vitest";
import { runChecks, isTestPath, parseDemoUrl, README_RE, LICENSE_RE } from "@/lib/analysis/checks";
import type { CheckId } from "@/lib/types";
import { makeRepo, makeTree } from "./fixtures";

function statusOf(paths: string[], id: CheckId, repo = makeRepo(), status: "complete" | "truncated" | "unavailable" = "complete") {
  return runChecks({ repo, tree: makeTree(paths, status) }).find((c) => c.id === id)!;
}

describe("README detection", () => {
  it.each(["README.md", "readme.md", "README", "README.rst", "Readme.txt", "README.adoc", "README.markdown", "README.org"])(
    "recognises %s",
    (name) => {
      expect(README_RE.test(name)).toBe(true);
      expect(statusOf([name], "readme").status).toBe("pass");
    },
  );
  it("recognises README in .github/ and docs/", () => {
    expect(statusOf([".github/README.md"], "readme").status).toBe("pass");
    expect(statusOf(["docs/readme.md"], "readme").status).toBe("pass");
  });
  it("ignores nested READMEs elsewhere and lookalikes", () => {
    expect(statusOf(["src/components/README.md", "README_OLD.md", "READMEFIRST"], "readme").status).toBe("fail");
  });
});

describe("License detection", () => {
  it.each(["LICENSE", "LICENSE.md", "license.txt", "LICENCE", "COPYING", "UNLICENSE", "LICENSE-MIT", "LICENSE.APACHE"])(
    "recognises %s",
    (name) => {
      expect(LICENSE_RE.test(name)).toBe(true);
      expect(statusOf([name], "license", makeRepo({ license: null })).status).toBe("pass");
    },
  );
  it("passes on GitHub license metadata even without a recognised file", () => {
    const c = statusOf(["README.md"], "license", makeRepo({ license: { spdxId: "Apache-2.0", name: "Apache License 2.0" } }));
    expect(c.status).toBe("pass");
    expect(c.evidence).toContain("Apache-2.0");
  });
  it("fails when neither file nor metadata exist", () => {
    expect(statusOf(["README.md", "src/license.ts"], "license", makeRepo({ license: null })).status).toBe("fail");
  });
});

describe(".gitignore detection", () => {
  it("only accepts a root .gitignore", () => {
    expect(statusOf([".gitignore"], "gitignore").status).toBe("pass");
    expect(statusOf(["src/.gitignore"], "gitignore").status).toBe("fail");
  });
});

describe("Test detection", () => {
  it.each([
    "src/app.test.ts",
    "src/App.spec.tsx",
    "lib/util.test.mjs",
    "tests/test_api.py",
    "app/models_test.py",
    "conftest.py",
    "pkg/server_test.go",
    "spec/user_spec.rb",
    "src/test/java/com/x/AppTest.java",
    "__tests__/thing.js",
    "e2e/login.ts",
    "MyAppTests/MyAppTests.swift",
    "test/widget_test.dart",
    "Project.Tests/CalculatorTests.cs",
  ])("detects %s", (p) => {
    expect(isTestPath(p)).toBe(true);
  });
  it.each(["src/contest.ts", "src/latest.py", "src/testing-utils-notes.md", "src/attestation.go", "README.md"])(
    "does not flag %s",
    (p) => {
      expect(isTestPath(p)).toBe(false);
    },
  );
  it("ignores tests inside dependency folders", () => {
    expect(statusOf(["node_modules/lib/index.test.js", "vendor/pkg/a_test.go"], "tests").status).toBe("fail");
  });
  it("notes that detection does not prove tests pass", () => {
    expect(statusOf(["a.test.ts"], "tests").evidence).toMatch(/not that they pass/);
  });
});

describe("CI workflow detection", () => {
  it("detects .yml and .yaml workflows", () => {
    expect(statusOf([".github/workflows/ci.yml"], "ci").status).toBe("pass");
    expect(statusOf([".github/workflows/deploy.yaml"], "ci").status).toBe("pass");
  });
  it("ignores non-workflow files", () => {
    expect(statusOf([".github/workflows/README.md", ".github/dependabot.yml", ".github/workflows/sub/x.yml", ".gitlab-ci.yml"], "ci").status).toBe("fail");
  });
});

describe("Description and demo", () => {
  it("fails on empty description", () => {
    expect(statusOf([], "description", makeRepo({ description: null })).status).toBe("fail");
  });
  it("accepts a valid homepage without claiming it's online", () => {
    const c = statusOf([], "demo");
    expect(c.status).toBe("pass");
    expect(c.evidence).toMatch(/not verified/);
  });
  it("normalises scheme-less homepages", () => {
    const r = parseDemoUrl("myapp.netlify.app", { owner: "o", name: "r" });
    expect(r).toEqual({ ok: true, url: "https://myapp.netlify.app/" });
  });
  it.each([null, "http://localhost:3000", "https://github.com/octo/demo-app", "ftp://x.com", "192.168.1.5", "not a url at all"])(
    "rejects %s",
    (homepage) => {
      expect(statusOf([], "demo", makeRepo({ homepage })).status).toBe("fail");
    },
  );
  it("accepts GitHub Pages sites", () => {
    expect(statusOf([], "demo", makeRepo({ homepage: "https://octo.github.io/demo-app" })).status).toBe("pass");
  });
});

describe("Incomplete trees", () => {
  it("marks missing file checks as unknown when the tree is truncated", () => {
    const checks = runChecks({ repo: makeRepo({ license: null }), tree: makeTree(["README.md"], "truncated") });
    const by = Object.fromEntries(checks.map((c) => [c.id, c.status]));
    expect(by.readme).toBe("pass"); // positive evidence still counts
    expect(by.gitignore).toBe("unknown");
    expect(by.tests).toBe("unknown");
    expect(by.ci).toBe("unknown");
    expect(by.license).toBe("unknown");
    expect(by.description).toBe("pass"); // metadata checks unaffected
    expect(by.demo).toBe("pass");
  });
  it("marks all file checks unknown when the tree is unavailable", () => {
    const checks = runChecks({ repo: makeRepo({ license: null }), tree: makeTree([], "unavailable") });
    for (const id of ["readme", "license", "gitignore", "tests", "ci"]) {
      expect(checks.find((c) => c.id === id)!.status).toBe("unknown");
    }
  });
});
