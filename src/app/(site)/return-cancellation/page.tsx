import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Return & Cancellation | i-Robox",
  description: "Cancellation, returns, and refund policy for i-Robox orders.",
};

const SUPPORT_EMAIL = "iroboxtoys@gmail.com";

export default function ReturnCancellationPage() {
  return (
    <section className="overflow-hidden py-10 pb-20 pt-32">
      <div className="w-full px-4 mx-auto max-w-4xl sm:px-8 xl:px-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-dark mb-6">Return &amp; Cancellation</h1>

        <p className="text-base leading-7 text-meta-3 mb-6">
          At <strong>i-Robox</strong>, we cater to collectors and hobbyists. We pack carefully so your diecast and
          collectibles reach you in display-ready condition. The guidelines below help us resolve issues fairly while
          protecting product integrity for all customers.
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-dark mb-8">
          <strong>Unboxing video:</strong> For claims involving damage, missing items, or manufacturing defects, we
          recommend recording a clear unboxing video when you open the package. This speeds up review and helps us work
          with carriers or suppliers when needed.
        </div>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Cancellations</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          You may request cancellation of an order before it is handed over to the courier. Once the order is shipped,
          cancellation may no longer be possible; instead, you may be eligible to return goods under the conditions
          below.
        </p>
        <p className="text-base leading-7 text-meta-3 mb-6">
          To cancel, contact us as soon as possible at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          with your order number.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Returns and exchanges</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          Collectible items often lose resale value once packaging is opened, seals are broken, or blisters are
          tampered with. For that reason, returns are generally accepted only for eligible defects, wrong items shipped,
          or transit damage reported in line with our process.
        </p>
        <ul className="list-disc pl-6 text-base leading-7 text-meta-3 mb-6 space-y-2">
          <li>Items returned in unsaleable condition (e.g. opened sealed packaging where applicable, deliberate damage) may not qualify for a refund.</li>
          <li>Approved returns should include original packaging and accessories where reasonably possible.</li>
          <li>Time limits for reporting issues may apply; contact us promptly after delivery.</li>
        </ul>
        <p className="text-base leading-7 text-meta-3 mb-6">
          If you are signed in, you can also start a return from your account where the feature is available:{" "}
          <Link href="/returns" className="font-semibold text-blue hover:underline">
            Returns
          </Link>
          .
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Refunds</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          When a refund is approved, we will process it to the original payment method where technically possible and in
          line with payment provider rules. Refund timing may depend on banks or wallets.
        </p>
        <p className="text-base leading-7 text-meta-3 mb-6">
          Shipping charges may be non-refundable except where required by law or where the error was ours.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Need help?</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          For order issues, photos or video (as applicable), and return instructions, write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          or call{" "}
          <a href="tel:+919844716214" className="font-semibold text-blue hover:underline">
            +91 98447 16214
          </a>
          .
        </p>
        <p className="text-base leading-7 text-meta-3">
          Store address: 24, Basement, 21st Main Rd, Banashankari Stage II, Banashankari, Bengaluru, Karnataka 560070.
        </p>
      </div>
    </section>
  );
}
