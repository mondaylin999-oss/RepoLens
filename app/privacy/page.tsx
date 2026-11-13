import type { Metadata } from "next";
import { PrivacyContent } from "@/components/privacy/privacy-content";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Learn what RepoLens processes and stores when you analyze repositories or enable optional history features.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
