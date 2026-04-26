import type { Metadata } from "next";
import QuickLinkContentPage from "@/components/Common/QuickLinkContentPage";
import { getQuickLinkPageContent } from "@/lib/marketing/quickLinkPages";

export const metadata: Metadata = {
  title: "Contact Us | i-Robox",
  description: "Get in touch with i-Robox for orders, products, and support.",
};

export default async function ContactPage() {
  const page = await getQuickLinkPageContent("contact");
  return <QuickLinkContentPage title={page.title} subtitle={page.subtitle} content={page.content} />;
}
