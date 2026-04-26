import type { Metadata } from "next";
import QuickLinkContentPage from "@/components/Common/QuickLinkContentPage";
import { getQuickLinkPageContent } from "@/lib/marketing/quickLinkPages";

export const metadata: Metadata = {
  title: "Terms & Conditions | i-Robox",
  description: "Terms of use for shopping at i-Robox.",
};

export default async function TermsConditionsPage() {
  const page = await getQuickLinkPageContent("terms");
  return <QuickLinkContentPage title={page.title} subtitle={page.subtitle} content={page.content} />;
}
