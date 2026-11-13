"use client";

import { useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";

const GOALS = {
  permissive: {
    label: "Allow broad reuse with a short notice",
    license: "MIT License",
    detail: "Allows reuse, modification, and distribution with the copyright and license notice preserved.",
    url: "https://choosealicense.com/licenses/mit/",
  },
  shareAlike: {
    label: "Require distributed derivatives to share source under the same license",
    license: "GNU GPLv3",
    detail: "Distributed derivatives must provide source under the same license; the license also includes an express patent grant.",
    url: "https://choosealicense.com/licenses/gpl-3.0/",
  },
  patent: {
    label: "Allow broad reuse with an explicit patent grant",
    license: "Apache License 2.0",
    detail: "Allows reuse and distribution with notices preserved, and contributors provide an express patent grant.",
    url: "https://choosealicense.com/licenses/apache-2.0/",
  },
} as const;

type Goal = keyof typeof GOALS;

export function LicenseGoalPicker() {
  const { text: t } = useLanguage();
  const [goal, setGoal] = useState<Goal | "">("");
  const choice = goal ? GOALS[goal] : null;

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <label htmlFor="license-goal" className="text-sm font-medium">{t("What is your main project goal?")}</label>
      <select
        id="license-goal"
        value={goal}
        onChange={(event) => setGoal(event.target.value as Goal | "")}
        className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{t("Choose a goal to see common options")}</option>
        {Object.entries(GOALS).map(([key, option]) => <option key={key} value={key}>{t(option.label)}</option>)}
      </select>
      {choice && (
        <div aria-live="polite" className="mt-3 text-sm">
          <p><span className="font-medium">{t("Common option:")} {choice.license}.</span> {t(choice.detail)}</p>
          <a href={choice.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-primary underline-offset-4 hover:underline">
            {t("Read the license summary")}
          </a>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{t("Compare the full terms and check any dependency requirements before choosing.")}</p>
    </div>
  );
}
