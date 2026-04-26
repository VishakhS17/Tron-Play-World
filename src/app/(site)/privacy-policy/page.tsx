import type { Metadata } from "next";
import QuickLinkContentPage from "@/components/Common/QuickLinkContentPage";
import { getQuickLinkPageContent } from "@/lib/marketing/quickLinkPages";

export const metadata: Metadata = {
  title: "Privacy Policy | i-Robox",
  description: "How i-Robox collects, uses, and protects your personal information.",
};

export default async function PrivacyPolicyPage() {
  const page = await getQuickLinkPageContent("privacy");
  return <QuickLinkContentPage title={page.title} subtitle={page.subtitle} content={page.content} />;
}
