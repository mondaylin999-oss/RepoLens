import type { RepoMetadata, RepoTree } from "@/lib/types";

export function makeRepo(overrides: Partial<RepoMetadata> = {}): RepoMetadata {
  return {
    owner: "octo",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/1",
    ownerUrl: "https://github.com/octo",
    name: "demo-app",
    fullName: "octo/demo-app",
    description: "A tool for tracking study sessions",
    language: "TypeScript",
    htmlUrl: "https://github.com/octo/demo-app",
    homepage: "https://demo-app.vercel.app",
    stars: 3,
    forks: 1,
    openIssues: 0,
    pushedAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    topics: ["nextjs", "react"],
    defaultBranch: "main",
    license: { spdxId: "MIT", name: "MIT License" },
    archived: false,
    isFork: false,
    sizeKb: 120,
    ...overrides,
  };
}

export const FULL_PATHS = [
  "README.md",
  "LICENSE",
  ".gitignore",
  "package.json",
  "src/index.ts",
  "src/index.test.ts",
  ".github/workflows/ci.yml",
];

export function makeTree(paths: string[] = FULL_PATHS, status: RepoTree["status"] = "complete"): RepoTree {
  return { status, paths };
}
