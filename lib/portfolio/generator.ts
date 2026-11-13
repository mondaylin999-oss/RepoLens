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

export type DescriptionLanguage = "en" | "my";

const BURMESE_DRAFT_LINES: Record<string, string> = {
  "Portfolio summary for recruiters": "အလုပ်ခန့်သူများအတွက် Portfolio အကျဉ်းချုပ်",
  "Project overview for collaborators": "ပူးပေါင်းလုပ်ဆောင်သူများအတွက် ပရောဂျက်အကျဉ်းချုပ်",
  "Project overview for clients": "ဖောက်သည်များအတွက် ပရောဂျက်အကျဉ်းချုပ်",
  "## Overview": "## အကျဉ်းချုပ်",
  "## Context and goal": "## နောက်ခံနှင့် ရည်မှန်းချက်",
  "## Approach": "## ချဉ်းကပ်ပုံ",
  "## Results": "## ရလဒ်များ",
  "## Links": "## လင့်ခ်များ",
  "## Getting started": "## စတင်အသုံးပြုရန်",
  "## Usage": "## အသုံးပြုပုံ",
  "## Tests": "## စမ်းသပ်မှုများ",
  "## License": "## လိုင်စင်",
  "### Prerequisites": "### ကြိုတင်လိုအပ်ချက်များ",
  "### Installation": "### တပ်ဆင်ခြင်း",
  "[Describe what this project does and who it's for in one or two sentences.]": "[ဤပရောဂျက်က ဘာလုပ်ပေးပြီး မည်သူများအတွက် ရည်ရွယ်ထားသည်ကို ဝါကျတစ်ကြောင်း၊ နှစ်ကြောင်းဖြင့် ဖော်ပြပါ။]",
  "[Describe the problem, intended audience, and project goals.]": "[ဖြေရှင်းမည့် ပြဿနာ၊ ရည်ရွယ်ထားသော အသုံးပြုသူများနှင့် ပရောဂျက်ရည်မှန်းချက်များကို ဖော်ပြပါ။]",
  "[Explain your design and implementation choices.]": "[ဒီဇိုင်းနှင့် အကောင်အထည်ဖော်မှုအတွက် ရွေးချယ်ခဲ့ပုံကို ရှင်းပြပါ။]",
  "[Describe your approach and the technologies you chose.]": "[သင့်ချဉ်းကပ်ပုံနှင့် ရွေးချယ်အသုံးပြုခဲ့သော နည်းပညာများကို ဖော်ပြပါ။]",
  "[Add verified outcomes, what you learned, and any limitations.]": "[အတည်ပြုနိုင်သော ရလဒ်များ၊ သင်ယူခဲ့ရသည်များနှင့် ကန့်သတ်ချက်များကို ထည့်ပါ။]",
  "[Show a basic example]": "[အခြေခံဥပမာတစ်ခု ပြပါ]",
  "[Explain how to run the tests]": "[စမ်းသပ်မှုများကို လုပ်ဆောင်ပုံ ရှင်းပြပါ]",
  "[Add your license information]": "[လိုင်စင်အချက်အလက် ထည့်ပါ]",
  "[Required runtime or tools]": "[လိုအပ်သော runtime သို့မဟုတ် ကိရိယာများ]",
  "[Add installation steps]": "[တပ်ဆင်နည်း အဆင့်များ ထည့်ပါ]",
  "[Feature one]": "[လုပ်ဆောင်ချက်တစ်]",
  "[Feature two]": "[လုပ်ဆောင်ချက်နှစ်]",
};

/** Translates template wording while preserving repository names, descriptions, topics and URLs. */
export function localizeDescriptionDraft(draft: string, language: DescriptionLanguage, repoName: string): string {
  if (language === "en") return draft;
  return draft.split("\n").map((line) => {
    const exact = BURMESE_DRAFT_LINES[line];
    if (exact) return exact;
    if (line.startsWith(`Project: ${repoName}`)) return `ပရောဂျက်: ${line.slice("Project: ".length)}`;
    if (line.startsWith("Overview: ")) return `အကျဉ်းချုပ်: ${line.slice("Overview: ".length)}`;
    if (line.startsWith("Primary language: ")) return `အဓိက ပရိုဂရမ်းမင်းဘာသာစကား: ${line.slice("Primary language: ".length)}`;
    if (line.startsWith("Technologies and topics: ")) return `နည်းပညာနှင့် ခေါင်းစဉ်များ: ${line.slice("Technologies and topics: ".length)}`;
    if (line.startsWith("Technology: ")) return `နည်းပညာ: ${line.slice("Technology: ".length)}`;
    if (line.startsWith("Topics: ")) return `ခေါင်းစဉ်များ: ${line.slice("Topics: ".length)}`;
    if (line.startsWith("Live demo: ")) return `တိုက်ရိုက်သရုပ်ပြ: ${line.slice("Live demo: ".length)}`;
    if (line.startsWith("Repository: ")) return `Repository: ${line.slice("Repository: ".length)}`;
    if (line.startsWith("Source code: ")) return `မူရင်း code: ${line.slice("Source code: ".length)}`;
    if (line.startsWith("Source: ")) return `အရင်းအမြစ်: ${line.slice("Source: ".length)}`;
    if (line.startsWith("Demo: ")) return `သရုပ်ပြ: ${line.slice("Demo: ".length)}`;
    if (line.startsWith("Repository metadata lists: ")) return `Repository metadata တွင် ဖော်ပြထားသော နည်းပညာများ: ${line.slice("Repository metadata lists: ".length)}`;
    const writtenTopics = line.match(/^Written primarily in (.+)\. Topics: (.+)\.$/);
    if (writtenTopics) return `အဓိကအားဖြင့် ${writtenTopics[1]} ဖြင့် ရေးသားထားသည်။ ခေါင်းစဉ်များ: ${writtenTopics[2]}။`;
    const writtenLanguage = line.match(/^Written primarily in (.+)\.$/);
    if (writtenLanguage) return `အဓိကအားဖြင့် ${writtenLanguage[1]} ဖြင့် ရေးသားထားသည်။`;
    if (line.startsWith(`${repoName} | `)) return `${repoName} | ${line.slice(repoName.length + 3)}`;
    return line;
  }).join("\n");
}

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
