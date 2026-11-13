import type { Metadata } from "next";
import { JoinWorkspace } from "@/components/workspaces/join-workspace";

export const metadata: Metadata = { title: "Join a workspace" };
export default function JoinWorkspacePage() { return <JoinWorkspace />; }
