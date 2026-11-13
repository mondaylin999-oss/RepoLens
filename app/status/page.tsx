import type { Metadata } from "next";
import { GitHubStatus } from "@/components/status/github-status";

export const metadata: Metadata = {
  title: "GitHub service status",
  description: "Check GitHub API and related service availability before retrying a RepoLens analysis.",
};

export default function StatusPage() {
  return <GitHubStatus />;
}
