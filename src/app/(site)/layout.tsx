import Footer from "../../components/Footer";
import ScrollToTop from "@/components/Common/ScrollToTop";
import { Toaster } from "react-hot-toast";
import Providers from "./Providers";
import NextTopLoader from "nextjs-toploader";
import MainHeader from "@/components/Header/MainHeader";
import Breadcrumb from "@/components/Common/Breadcrumb";
import WhatsAppFloatingButton from "@/components/Common/WhatsAppFloatingButton";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <MainHeader headerData={null} />
          <Breadcrumb />
          <Toaster position="top-center" reverseOrder={false} />
          {children}
        </Providers>

        <ScrollToTop />
        <WhatsAppFloatingButton />
        <Footer />
      </>
    </div>
  );
}
