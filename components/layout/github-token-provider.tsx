"use client";

import { createContext, useContext, useState } from "react";

interface GitHubTokenContextValue {
  token: string;
  setToken: (token: string) => void;
}

const GitHubTokenContext = createContext<GitHubTokenContextValue | null>(null);

export function GitHubTokenProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  return <GitHubTokenContext.Provider value={{ token, setToken }}>{children}</GitHubTokenContext.Provider>;
}

export function useGitHubToken() {
  const context = useContext(GitHubTokenContext);
  if (!context) throw new Error("useGitHubToken must be used inside GitHubTokenProvider");
  return context;
}
