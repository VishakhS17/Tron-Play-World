import type { Metadata } from "next";
import QuickLinkContentPage from "@/components/Common/QuickLinkContentPage";
import { getQuickLinkPageContent } from "@/lib/marketing/quickLinkPages";

export const metadata: Metadata = {
  title: "FAQ | i-Robox",
  description: "Frequently asked questions for i-Robox.",
};

export default async function FaqPage() {
  const page = await getQuickLinkPageContent("faq");
  return <QuickLinkContentPage title={page.title} subtitle={page.subtitle} content={page.content} />;
}
