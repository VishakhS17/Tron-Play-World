import "./css/style.css";
import { Metadata } from "next";
import { getSeoSettings } from "@/get-api-data/seo-setting";
import { GoogleTagManager } from '@next/third-parties/google';
import { DM_Sans } from 'next/font/google'

const dm_sans = DM_Sans({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: "--font-body",
  subsets: ['latin'],
})
const defaultFavicon = "/ChatGPT Image Mar 3, 2026, 09_17_53 PM.png";

export async function generateMetadata(): Promise<Metadata> {
  const seoSettings = await getSeoSettings();
  return {
    title: `${seoSettings?.siteTitle || "Home"} | Robox`,
    description:
      seoSettings?.metadescription ||
      "Robox – toys, games & play for every kid. Shop the best toys online.",
    keywords: seoSettings?.metaKeywords || "toys, toy store, kids toys, games, Robox",
    openGraph: {
      images: seoSettings?.metaImage ? [seoSettings.metaImage] : [],
    },
    icons: {
      icon: seoSettings?.favicon || defaultFavicon,
      shortcut: seoSettings?.favicon || defaultFavicon,
      apple: seoSettings?.favicon || defaultFavicon,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seoSettings = await getSeoSettings();
  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className={dm_sans.variable}>
        {children}
        {seoSettings?.gtmId && <GoogleTagManager gtmId={seoSettings.gtmId} />}
      </body>
    </html>
  );
}
