import Graphics from "./Graphics";
import NewsletterForm from "./NewsletterForm";

const Newsletter = () => {
  return (
    <section className="overflow-hidden pb-[60px]">
      <div className="px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
        <div className="relative overflow-hidden z-1 rounded-xl">
          <Graphics />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 px-4 sm:px-7.5 xl:pl-12.5 xl:pr-14 py-11">
            <div className="max-w-[491px] w-full">
              <h2 className="max-w-[399px] text-white font-semibold text-lg sm:text-xl xl:text-heading-4 mb-3">
                Don&apos;t Miss Out Latest Trends & Offers
              </h2>
              <p className="text-white">
                Register to receive news about the latest offers & discount
                codes
              </p>
            </div>

            <div className="max-w-[477px] w-full">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
