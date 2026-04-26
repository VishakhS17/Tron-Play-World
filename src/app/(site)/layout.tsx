import Footer from "../../components/Footer";
import ScrollToTop from "@/components/Common/ScrollToTop";
import { Toaster } from "react-hot-toast";
import Providers from "./Providers";
import NextTopLoader from "nextjs-toploader";
import MainHeader from "@/components/Header/MainHeader";
import Breadcrumb from "@/components/Common/Breadcrumb";
import WhatsAppFloatingButton from "@/components/Common/WhatsAppFloatingButton";
import { prisma } from "@/lib/prismaDB";
import { isActiveInWindow } from "@/lib/marketing/isActiveInWindow";
import { getHeaderNavData } from "@/lib/nav/headerNav";
import { getStoreContactDisplay } from "@/lib/marketing/storeContactDisplay";

/** Announcement bar / header copy comes from DB; avoid static shell stale on production. */
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const now = new Date();
  const announcementRows = await prisma.announcement_entries.findMany({
    orderBy: [{ placement: "asc" }, { sort_order: "asc" }],
  });
  const activeAnnouncements = announcementRows.filter((e) =>
    isActiveInWindow(e.is_active, e.active_from, e.active_until, now)
  );
  const utilityRows = activeAnnouncements.filter((e) => e.placement === "UTILITY");
  const marqueeRows = activeAnnouncements.filter((e) => e.placement === "MARQUEE");
  const utilityPrimary = utilityRows[0];
  const utilityAnnouncement = utilityPrimary
    ? {
        body: utilityPrimary.body,
        linkUrl: utilityPrimary.link_url,
        linkLabel: utilityPrimary.link_label,
      }
    : null;
  const marqueeAnnouncements = marqueeRows.map((m) => ({
    body: m.body,
    linkUrl: m.link_url,
  }));

  const headerNav = await getHeaderNavData();
  const storeContact = await getStoreContactDisplay();

  return (
    <div>
      <>
        <Providers>
          <NextTopLoader
            color="#2563eb"
            crawlSpeed={300}
            showSpinner={false}
            shadow="none"
          />
          <MainHeader
            headerData={null}
            utilityAnnouncement={utilityAnnouncement}
            marqueeAnnouncements={marqueeAnnouncements}
            headerNav={headerNav}
          />
          <Breadcrumb />
          <Toaster position="top-center" reverseOrder={false} />
          {children}
        </Providers>

        <ScrollToTop />
        <WhatsAppFloatingButton phone={storeContact.contactPhone} />
        <Footer storeContact={storeContact} />
      </>
    </div>
  );
}
