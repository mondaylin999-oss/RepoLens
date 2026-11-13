"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type InterfaceLanguage = "en" | "my";

const STORAGE_KEY = "repolens-interface-language";
const MESSAGES = {
  en: {
    mainNavigation: "Main navigation",
    home: "Home",
    howItWorks: "How It Works",
    analyzeRepository: "Analyze Repository",
    repoLensOnGitHub: "RepoLens on GitHub",
    interfaceLanguage: "Interface language",
    toggleNavigation: "Toggle navigation menu",
    toggleTheme: "Toggle dark mode",
    github: "GitHub",
    footerTagline: "Make your GitHub projects portfolio-ready.",
  },
  my: {
    mainNavigation: "ပင်မလမ်းညွှန်",
    home: "ပင်မစာမျက်နှာ",
    howItWorks: "အသုံးပြုပုံ",
    analyzeRepository: "Repository စစ်ဆေးရန်",
    repoLensOnGitHub: "RepoLens ကို GitHub တွင်ကြည့်ရန်",
    interfaceLanguage: "ဘာသာစကား",
    toggleNavigation: "လမ်းညွှန်မီနူးကို ဖွင့်/ပိတ်ရန်",
    toggleTheme: "အမှောင်/အလင်း အပြင်အဆင် ပြောင်းရန်",
    github: "GitHub",
    footerTagline: "သင့် GitHub ပရောဂျက်များကို Portfolio အတွက် အဆင်သင့်ပြင်ဆင်ပါ။",
  },
} as const;

type MessageKey = keyof typeof MESSAGES.en;
type LanguageContextValue = {
  language: InterfaceLanguage;
  setLanguage: (language: InterfaceLanguage) => void;
  text: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<InterfaceLanguage>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "my") setLanguage(saved);
    } catch {
      // English remains available when browser storage is disabled.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The language stays selected for this visit.
    }
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    text: (key) => MESSAGES[language][key],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
