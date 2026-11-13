import type { Metadata } from "next";
import { WorkspaceDetail } from "@/components/workspaces/workspace-detail";

export const metadata: Metadata = { title: "Workspace" };
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceDetail id={id} />;
}
