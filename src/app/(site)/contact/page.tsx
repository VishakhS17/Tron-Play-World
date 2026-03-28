import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | i-Robox",
  description: "Get in touch with i-Robox for orders, products, and support.",
};

const SUPPORT_EMAIL = "iroboxtoys@gmail.com";

export default function ContactPage() {
  return (
    <section className="overflow-hidden py-10 pb-20 pt-32">
      <div className="w-full px-4 mx-auto max-w-4xl sm:px-8 xl:px-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-dark mb-6">Contact us</h1>
        <p className="text-base leading-7 text-meta-3 mb-8">
          We are happy to help with product questions, order support, and collector enquiries.
        </p>

        <div className="rounded-2xl border border-gray-3 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-meta-4 mb-1">Email</h2>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-lg font-medium text-blue hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-meta-4 mb-1">Phone</h2>
            <a href="tel:+919844716214" className="text-lg font-medium text-blue hover:underline">
              +91 98447 16214
            </a>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-meta-4 mb-1">Visit</h2>
            <address className="not-italic text-base leading-7 text-meta-3">
              24, Basement, 21st Main Rd, Banashankari Stage II,
              <br />
              Banashankari, Bengaluru, Karnataka 560070
            </address>
          </div>
        </div>
      </div>
    </section>
  );
}
