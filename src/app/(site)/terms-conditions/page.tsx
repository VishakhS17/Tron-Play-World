import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | i-Robox",
  description: "Terms of use for shopping at i-Robox.",
};

const SUPPORT_EMAIL = "iroboxtoys@gmail.com";

export default function TermsConditionsPage() {
  return (
    <section className="overflow-hidden py-10 pb-20 pt-32">
      <div className="w-full px-4 mx-auto max-w-4xl sm:px-8 xl:px-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-dark mb-6">Terms &amp; Conditions</h1>

        <p className="text-base leading-7 text-meta-3 mb-6">
          Please read these terms carefully. By accessing our website or placing an order with{" "}
          <strong>i-Robox</strong>, you agree to be bound by these Terms &amp; Conditions and any policies referenced
          here (including our Privacy Policy and Return &amp; Cancellation policy). If you do not agree, please do not
          use the site.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Products and orders</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          We offer diecast models, collectibles, and related hobby products. Product descriptions, images, and
          availability are provided in good faith. Rare manufacturing variations may occur; we aim to represent items
          accurately for collectors.
        </p>
        <p className="text-base leading-7 text-meta-3 mb-6">
          When you place an order, you offer to purchase the items in your cart at the prices shown (plus applicable
          taxes and shipping). We may accept or decline an order for reasons including stock, payment, or suspected
          fraud. A contract is formed when we confirm your order or ship the goods, as described at checkout.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Pricing and payment</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          Prices and promotions may change without notice before you complete checkout. Payment is processed through our
          authorised payment partners. You agree to provide accurate billing information and authorise us or our
          partners to charge your selected payment method for the total order amount.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Shipping and risk</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          Delivery timelines are estimates. Risk of loss passes to you when the carrier takes possession, unless
          applicable law provides otherwise. For damaged or missing shipments, contact us promptly with your order
          details so we can assist.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Use of the website</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          You must be legally able to enter contracts in your jurisdiction. You agree not to misuse the site: no
          unlawful activity, no interference with security or other users, no scraping or automated abuse beyond normal
          browsing, and no resale or redistribution of our content or listings without permission.
        </p>
        <p className="text-base leading-7 text-meta-3 mb-6">
          Account credentials are your responsibility. Notify us if you suspect unauthorised access.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Intellectual property</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          Brand names, logos, product images, and site content may be protected by trademark, copyright, or other
          rights held by us or third parties (including manufacturers). You may not copy, modify, or exploit them except
          as allowed for personal, non-commercial use or with written consent.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Communications</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          We may contact you about your orders and account. If you receive marketing communications, you can opt out as
          described in our Privacy Policy or in the message itself.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Disclaimer of warranties</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          The website and products are provided on an &quot;as is&quot; and &quot;as available&quot; basis to the extent
          permitted by law. We disclaim warranties not expressly stated, including implied warranties of merchantability
          or fitness for a particular purpose, except where such disclaimers are not allowed.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Limitation of liability</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          To the maximum extent permitted by law, our total liability for claims arising from these terms or your use of
          the site or products is limited to the amount you paid for the specific order giving rise to the claim. We are
          not liable for indirect, incidental, or consequential damages where the law allows such exclusion.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Indemnity</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          You agree to indemnify and hold harmless i-Robox and its operators from claims, damages, and expenses
          (including reasonable legal fees) arising from your breach of these terms, misuse of the site, or violation of
          third-party rights, where permitted by law.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Changes and termination</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          We may update these terms by posting a new version on this page. Continued use after changes constitutes
          acceptance where allowed. We may suspend or terminate access for breach of these terms or for operational
          reasons.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Governing law</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          These terms are governed by the laws of India. Courts at Bengaluru, Karnataka shall have exclusive
          jurisdiction for disputes, subject to any mandatory consumer protections that apply to you.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Contact</h2>
        <p className="text-base leading-7 text-meta-3">
          Questions about these terms:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </section>
  );
}
