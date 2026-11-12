import type { CheckId, CheckResult, Recommendation, RecommendationPriority, RepoMetadata } from "@/lib/types";

/**
 * Rule-based recommendations. One recommendation per failed check, tailored with verified facts
 * (primary language, whether tests exist) — never generic advice unrelated to the findings.
 */

type Rule = (ctx: { repo: RepoMetadata; checks: Map<CheckId, CheckResult> }) => Omit<Recommendation, "checkId" | "potentialPoints" | "priority">;

const TEST_TOOLS: Record<string, string> = {
  TypeScript: "Vitest or Jest",
  JavaScript: "Vitest or Jest",
  Python: "pytest",
  Go: "the built-in `go test` (files ending in _test.go)",
  Rust: "the built-in `cargo test`",
  Java: "JUnit",
  Kotlin: "JUnit or Kotest",
  Ruby: "RSpec or Minitest",
  PHP: "PHPUnit or Pest",
  "C#": "xUnit or NUnit",
  Swift: "XCTest",
  Dart: "the `test` package (or `flutter test`)",
  Elixir: "ExUnit",
};

const CI_SETUP: Record<string, string> = {
  TypeScript: "actions/setup-node, then run your install, lint and test scripts",
  JavaScript: "actions/setup-node, then run your install, lint and test scripts",
  Python: "actions/setup-python, then install dependencies and run pytest",
  Go: "actions/setup-go, then run `go vet` and `go test ./...`",
  Rust: "a Rust toolchain action, then run `cargo test` and `cargo clippy`",
  Java: "actions/setup-java, then run your Maven or Gradle build",
  Kotlin: "actions/setup-java, then run your Gradle build",
  Ruby: "ruby/setup-ruby, then run your test suite",
  PHP: "shivammathur/setup-php, then run Composer and your tests",
  "C#": "actions/setup-dotnet, then run `dotnet test`",
};

const RULES: Record<CheckId, Rule> = {
  readme: () => ({
    title: "Add a README",
    whatIsMissing: "The repository has no README file.",
    whyItMatters: "The README is the first thing visitors see on the repository page. Without it, reviewers have to read the code to learn what the project does.",
    howToImprove: [
      "Create README.md in the repository root.",
      "Explain the project's purpose and key features in a few sentences.",
      "Add installation steps and usage instructions someone can follow.",
      "Include a screenshot or GIF if the project has a user interface.",
    ],
  }),
  description: ({ repo }) => ({
    title: "Write a repository description",
    whatIsMissing: "The \"About\" description on GitHub is empty.",
    whyItMatters: "The description appears on your profile, in search results and in pinned repositories. It tells visitors what the project is before they click.",
    howToImprove: [
      `Open ${repo.htmlUrl}, click the gear icon next to "About", and add a one-sentence summary.`,
      "Describe what the project does and who it's for, e.g. \"A web app that helps students track study sessions.\"",
    ],
  }),
  license: () => ({
    title: "Add a license",
    whatIsMissing: "No license file was found and GitHub doesn't report a license.",
    whyItMatters: "Without a license, others have no clear permission to use, modify or share your code. It also signals that the project is published deliberately.",
    howToImprove: [
      "If you intend others to reuse or contribute to your code, consider adding an open-source license.",
      "On GitHub, choose Add file → Create new file, name it LICENSE, and use \"Choose a license template\".",
      "choosealicense.com explains the differences between common licenses such as MIT, Apache-2.0 and GPL-3.0.",
    ],
  }),
  gitignore: ({ repo }) => ({
    title: "Add a .gitignore file",
    whatIsMissing: "There is no .gitignore in the repository root.",
    whyItMatters: "A .gitignore keeps dependencies, build output, editor files and secrets such as .env out of the repository, which keeps it clean and safer to share.",
    howToImprove: [
      `Start from the ${repo.language ? `${repo.language} ` : ""}template in github.com/github/gitignore.`,
      "Make sure .env files and dependency folders are listed.",
      "If unwanted files are already committed, remove them with `git rm --cached <path>` after adding the rule.",
    ],
  }),
  tests: ({ repo }) => {
    const tool = repo.language ? TEST_TOOLS[repo.language] : undefined;
    return {
      title: "Add automated tests",
      whatIsMissing: "No test files or test folders were found.",
      whyItMatters: "Tests show reviewers that you verify your code works and make the project easier to maintain and change.",
      howToImprove: [
        tool ? `For a ${repo.language} project, ${tool} is a common choice.` : "Pick the standard test framework for your language.",
        "Start with tests for the most important functionality, such as core logic and data handling.",
        "Document how to run the tests in your README.",
      ],
    };
  },
  ci: ({ repo, checks }) => {
    const hasTests = checks.get("tests")?.status === "pass";
    const setup = repo.language ? CI_SETUP[repo.language] : undefined;
    return {
      title: "Set up continuous integration",
      whatIsMissing: "No GitHub Actions workflow was found in .github/workflows/.",
      whyItMatters: hasTests
        ? "Your repository has tests, but nothing runs them automatically. CI runs them on every push and pull request."
        : "CI automatically checks every push, for example by running a build, linter or tests. It isn't required for every project, but it shows good engineering habits.",
      howToImprove: [
        "Consider adding a workflow file such as .github/workflows/ci.yml.",
        setup ? `A typical ${repo.language} workflow uses ${setup}.` : "Use a starter workflow from the repository's Actions tab.",
        hasTests ? "Run your existing tests in the workflow." : "Start with a build or lint step, and add tests as you write them.",
        "Add the workflow's status badge to your README.",
      ],
    };
  },
  demo: ({ repo }) => ({
    title: "Link a live demo",
    whatIsMissing: repo.homepage
      ? "The website field is set, but it isn't a usable public demo URL."
      : "No website URL is set in the repository's \"About\" section.",
    whyItMatters: "A working demo lets visitors try the project in seconds. Not every project needs one — libraries and CLI tools often don't.",
    howToImprove: [
      "If this project has a user interface, consider publishing it on a host such as Vercel, Netlify, Render or GitHub Pages.",
      "Add the URL in the \"Website\" field of the repository's \"About\" settings.",
      "For projects without a UI, a short demo GIF or video in the README works well instead.",
    ],
  }),
};

function priorityFor(points: number): RecommendationPriority {
  if (points >= 20) return "high";
  if (points >= 15) return "medium";
  return "low";
}

export function generateRecommendations(repo: RepoMetadata, checks: CheckResult[]): Recommendation[] {
  const byId = new Map(checks.map((c) => [c.id, c] as const));
  const recs: Recommendation[] = checks
    .filter((c) => c.status === "fail")
    .map((c) => ({
      checkId: c.id,
      potentialPoints: c.maxPoints,
      priority: priorityFor(c.maxPoints),
      ...RULES[c.id]({ repo, checks: byId }),
    }));

  // Unscored suggestion based on a verified finding: topics feed the portfolio description and discovery.
  if (repo.topics.length === 0) {
    recs.push({
      checkId: "topics",
      potentialPoints: 0,
      priority: "low",
      title: "Add repository topics",
      whatIsMissing: "The repository has no topics.",
      whyItMatters: "Topics make the project discoverable on GitHub and show its technologies at a glance. RepoLens also uses them in your portfolio description.",
      howToImprove: [
        "Click the gear icon next to \"About\" and add topics for the frameworks and tools you used, e.g. react, nextjs, postgresql.",
      ],
    });
  }

  const order: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority] || b.potentialPoints - a.potentialPoints);
}
