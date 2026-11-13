import type { Metadata } from "next";
import { WorkspaceList } from "@/components/workspaces/workspace-list";

export const metadata: Metadata = {
  title: "Team workspaces",
  description: "Share public repository reviews with teammates in a private RepoLens workspace.",
};

export default function WorkspacesPage() { return <WorkspaceList />; }
