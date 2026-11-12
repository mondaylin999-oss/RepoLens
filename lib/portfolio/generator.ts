import type { PortfolioDescription, RepoMetadata } from "@/lib/types";
import { parseDemoUrl } from "@/lib/analysis/checks";

/**
 * Deterministic, template-based description generator. Uses only verified repository fields and
 * never invents functionality, technologies, metrics or achievements. Missing fields become
 * clearly marked placeholders for the user to edit.
 */

export const PLACEHOLDERS = {
  overview: "[Describe what this project does and who it's for in one or two sentences.]",
  technology: "[List the main technologies you used.]",
} as const;

/** Cleans a GitHub description without changing its meaning: strips emoji shortcodes, normalises spacing and punctuation. */
export function cleanDescription(description: string | null): string | null {
  if (!description) return null;
  let text = description
    .replace(/:[a-z0-9_+-]+:/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?…]$/.test(text)) text += ".";
  return text;
}

/** Topic slugs as GitHub stores them, de-duplicated, with the primary language removed if repeated. */
function verifiedTopics(repo: RepoMetadata): string[] {
  const lang = repo.language?.toLowerCase();
  return Array.from(new Set(repo.topics)).filter((t) => t.toLowerCase() !== lang);
}

export function generatePortfolioDescription(repo: RepoMetadata): PortfolioDescription {
  const placeholders: string[] = [];
  const overview = cleanDescription(repo.description);
  if (!overview) placeholders.push("overview");

  const topics = verifiedTopics(repo);
  const techParts: string[] = [];
  if (repo.language) techParts.push(repo.language);
  const technology = techParts.length > 0 || topics.length > 0;
  if (!technology) placeholders.push("technology");

  const demo = parseDemoUrl(repo.homepage, repo);

  // Portfolio format
  const lines = [`Project: ${repo.name}`, "", `Overview: ${overview ?? PLACEHOLDERS.overview}`, ""];
  if (technology) {
    if (repo.language) lines.push(`Primary language: ${repo.language}`);
    if (topics.length) lines.push(`Topics: ${topics.join(", ")}`);
  } else {
    lines.push(`Technology: ${PLACEHOLDERS.technology}`);
  }
  lines.push("");
  if (demo.ok) lines.push(`Live demo: ${demo.url}`);
  lines.push(`Repository: ${repo.htmlUrl}`);

  // LinkedIn project format: short prose built from the same verified facts.
  const sentences: string[] = [];
  sentences.push(overview ?? PLACEHOLDERS.overview);
  if (repo.language && topics.length) {
    sentences.push(`Written primarily in ${repo.language}. Topics: ${topics.join(", ")}.`);
  } else if (repo.language) {
    sentences.push(`Written primarily in ${repo.language}.`);
  } else if (topics.length) {
    sentences.push(`Topics: ${topics.join(", ")}.`);
  } else {
    sentences.push(PLACEHOLDERS.technology);
  }
  const links = [demo.ok ? `Live demo: ${demo.url}` : null, `Source code: ${repo.htmlUrl}`].filter(Boolean);
  const linkedin = [`${repo.name}`, "", sentences.join(" "), "", ...links].join("\n");

  return { portfolio: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), linkedin, placeholders };
}
