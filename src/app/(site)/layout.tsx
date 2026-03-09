import Footer from "../../components/Footer";
import ScrollToTop from "@/components/Common/ScrollToTop";
import PreLoader from "@/components/Common/PreLoader";
import { Toaster } from "react-hot-toast";
import Providers from "./Providers";
import NextTopLoader from "nextjs-toploader";
import MainHeader from "@/components/Header/MainHeader";
import { getHeaderSettings } from "@/get-api-data/header-setting";
import Breadcrumb from "@/components/Common/Breadcrumb";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerSettingData = await getHeaderSettings();
  return (
    <div>
      <PreLoader />
      <>
        <Providers>
          <NextTopLoader
            color="#c41e3a"
            crawlSpeed={300}
            showSpinner={false}
            shadow="none"
          />
          <MainHeader headerData={headerSettingData} />
          <Breadcrumb />
          <Toaster position="top-center" reverseOrder={false} />
          {children}
        </Providers>

        <ScrollToTop />
        <Footer />
      </>
    </div>
  );
}
