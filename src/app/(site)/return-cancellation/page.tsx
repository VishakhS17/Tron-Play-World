import type { Metadata } from "next";
import QuickLinkContentPage from "@/components/Common/QuickLinkContentPage";
import { getQuickLinkPageContent } from "@/lib/marketing/quickLinkPages";

export const metadata: Metadata = {
  title: "Return & Cancellation | i-Robox",
  description: "Cancellation, returns, and refund policy for i-Robox orders.",
};

export default async function ReturnCancellationPage() {
  const page = await getQuickLinkPageContent("returns");
  return <QuickLinkContentPage title={page.title} subtitle={page.subtitle} content={page.content} />;
}
