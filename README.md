# RepoLens

**Make your GitHub projects portfolio-ready.**

RepoLens analyzes a public GitHub repository and tells you how ready it is to show in a portfolio. It reads real data from the GitHub REST API, runs seven transparent checks, calculates a 0–100 readiness score, explains what's missing, and generates a portfolio description you can edit and copy.

Version 1.0 uses **no AI**. Every score, recommendation, and description comes from explicit rules and templates, so the same repository always gets the same result.

> The score measures basic portfolio presentation. It does **not** measure code quality or security.

## Features

- **Readiness score (0–100):** every point is backed by evidence shown in the UI.
- **Seven checks:** README, description, license, `.gitignore`, tests, CI workflow, and live demo URL.
- **Honest incomplete state:** if GitHub returns only part of a large repository's file list, affected checks show as *Unverified* and no final score is shown.
- **Actionable recommendations:** what's missing, why it matters, and how to fix it, ordered by impact and tailored to the repository's primary language.
- **Portfolio description generator:** portfolio and LinkedIn formats, built only from verified fields. Missing information becomes a `[bracketed placeholder]` and is never invented.
- **Readable error messages** for invalid URLs, missing or private repositories, empty repositories, rate limits, timeouts, and GitHub outages.
- Light and dark mode, responsive layout, keyboard and screen-reader friendly.
- No sign-in is needed to analyze a public repository. Optional GitHub sign-in can sync recent analysis history and saved repositories across devices.
- Saved repositories and checklists stay in your browser unless you enable account history sync. Privacy details are available at `/privacy`.

## Scoring rules

| Indicator | Points | How it's detected |
|---|---:|---|
| README | 20 | `README`, `README.md`, `.rst`, `.txt`, `.adoc`, `.org`, … in the root, `.github/`, or `docs/` |
| Repository description | 10 | GitHub "About" description is not empty |
| License | 10 | GitHub license metadata, or a root `LICENSE`, `LICENCE`, `COPYING`, `UNLICENSE`, `LICENSE-MIT`, … |
| `.gitignore` | 10 | A root `.gitignore` |
| Tests | 20 | Test folders (`test/`, `tests/`, `__tests__/`, `spec/`, `e2e/`, …) or test files (`*.test.ts`, `test_*.py`, `*_test.go`, `*_spec.rb`, `*Test.java`, …). Files under `node_modules/`, `vendor/`, `dist/`, and similar folders are ignored. |
| CI workflow | 15 | `.github/workflows/*.yml` or `*.yaml` |
| Live demo URL | 15 | GitHub "Website" field holds a public http(s) URL that isn't localhost, a private IP, or the repository's own GitHub page |

Detected tests are not run, so they aren't proven to pass. The demo URL is not fetched, so it isn't confirmed to be online. Rules live in `lib/analysis/checks.ts`. To add a check, append it to `CHECK_DEFINITIONS`.

## Tech stack

Next.js 16 (App Router, Route Handlers) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-style components (Radix Slot + CVA) · Lucide icons · Geist font · Vitest · GitHub REST API · Vercel

## Project structure

```text
app/
  page.tsx                  Landing page
  analyze/page.tsx          Analysis dashboard
  api/analyze/route.ts      GET /api/analyze?url=…
components/
  layout/                   Header, footer, logo, theme
  github/                   URL form, repository overview
  analysis/                 Score, checklist, recommendations, description, states
  ui/                       Button, Card, Input, Badge, Skeleton, Textarea
lib/
  github/parser.ts          URL validation and normalization (shared by client and server)
  github/client.ts          GitHub REST client: timeouts, caching, error mapping
  analysis/checks.ts        The seven readiness checks
  analysis/scoring.ts       Score calculation
  analysis/recommendations.ts
  analysis/analyze.ts       Pure pipeline: metadata + tree → result
  portfolio/generator.ts    Template-based description generator
  types/                    Shared types
tests/                      Vitest unit and API tests
```

Business logic in `lib/` has no React dependencies and is covered by tests.

## Getting started

Requirements: Node.js 20.9 or newer, and npm.

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open http://localhost:3000.

### Configuration

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | No | A GitHub personal access token. Public repositories need no scopes, so use a fine-grained token with *public repositories (read-only)*. It raises the API limit from 60 to 5,000 requests per hour. The token stays on the server. |
| `NEXT_PUBLIC_PROJECT_REPO_URL` | No | If set, a GitHub link to your RepoLens repository appears in the navbar and footer. |
| `AUTH_SECRET` | Vercel production | Auth.js session signing secret; use at least 32 random characters. |
| `AUTH_GITHUB_ID` | Vercel production | GitHub OAuth App client ID. |
| `AUTH_GITHUB_SECRET` | Vercel production | GitHub OAuth App client secret. |
| `DATABASE_URL` | Vercel production | PostgreSQL connection URL for account history, saved repositories, and shared request limits. |

The public analysis API allows 30 analyses per client per minute; expanded file-list requests allow 20 per minute. Limits are shared across instances when Neon is available. Each analysis uses 2 GitHub API calls, or 3 when the default branch name contains `/`. Without a GitHub token, the separate GitHub allowance is about 30 analyses per hour per server IP, so set `GITHUB_TOKEN` in production if traffic requires it.

## Scripts

```bash
npm run dev         # development server
npm test            # run the test suite once
npm run test:watch  # tests in watch mode
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # production build
npm start           # serve the production build
```

## API

`GET /api/analyze?url=<encoded GitHub repository URL>`

- `200` → `{ "ok": true, "data": AnalysisResult }`
- Errors → `{ "ok": false, "error": { "code", "message", "retryAt?" } }`

| Code | HTTP |
|---|---|
| `INVALID_URL` | 400 |
| `INACCESSIBLE` | 403 |
| `NOT_FOUND` (missing or private) | 404 |
| `EMPTY_REPOSITORY` | 422 |
| `RATE_LIMITED` (GitHub) / `REQUEST_LIMITED` (RepoLens) | 429 |
| `INTERNAL_ERROR` | 500 |
| `NETWORK_ERROR` | 502 |
| `UPSTREAM_UNAVAILABLE` | 503 |
| `TIMEOUT` | 504 |

Types are defined in `lib/types/index.ts`.

## Security notes

- The server never fetches the URL a user enters. It extracts and validates `owner` and `repo`, then builds requests to `https://api.github.com` only.
- Rejected input includes non-GitHub hosts, lookalike hosts, embedded credentials, custom ports, non-http schemes, GitHub site pages (`/settings`, `/orgs`, …), and invalid owner or repository names.
- Requests time out after 10 seconds. GitHub responses are cached for 5 minutes through the Next.js data cache, and successful API responses are CDN-cacheable for 5 minutes.
- Server-configured secrets stay on the server. An optional GitHub token entered in the form stays in page memory and is sent over HTTPS in a request header; see `/privacy`.
- External links use `rel="noopener noreferrer"`.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository. The Next.js defaults work without changes.
3. Under **Settings → Environment Variables**, add `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `DATABASE_URL` for account history and shared request limits. Optionally add `GITHUB_TOKEN` and `NEXT_PUBLIC_PROJECT_REPO_URL`.
4. Deploy. Every later push to `main` redeploys automatically.

The production build checks that the four required variables are present and that `AUTH_SECRET` and `DATABASE_URL` have valid formats. If a check fails, deployment stops with the names of the settings to fix; secret values are never printed. Local and preview builds skip this production-only check.

The included workflow, `.github/workflows/ci.yml`, runs lint, typecheck, tests, and build on every push and pull request.

## Known limitations

- Only public repositories on github.com are supported. GitHub Enterprise and GitLab are not.
- Only the default branch is analyzed.
- File detection is path-based. Tests are found by naming conventions, not by running them, and inline tests such as Rust `#[cfg(test)]` aren't detected.
- For very large repositories, GitHub truncates the file list. Some checks then show as *Unverified* and no final score is given.
- The demo URL's availability is not checked.
- The "Open issues" count comes from GitHub's `open_issues_count`, which includes open pull requests.
- Results aren't saved. The analysis URL can be shared, and opening it re-runs the analysis.
- Without `GITHUB_TOKEN`, the shared 60 requests per hour limit is reached quickly.

## Roadmap ideas

README content quality checks, private repository analysis, and badge generation. The analysis engine is isolated in `lib/` so these can be added without rewriting the UI.

---

RepoLens v1.0
