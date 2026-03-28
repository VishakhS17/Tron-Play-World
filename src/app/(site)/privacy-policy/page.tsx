import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | i-Robox",
  description: "How i-Robox collects, uses, and protects your personal information.",
};

const SUPPORT_EMAIL = "iroboxtoys@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <section className="overflow-hidden py-10 pb-20 pt-32">
      <div className="w-full px-4 mx-auto max-w-4xl sm:px-8 xl:px-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-dark mb-6">Privacy Policy</h1>

        <p className="text-base leading-7 text-meta-3 mb-5">
          <strong>i-Robox</strong> respects your privacy.
          This policy explains what information we collect, how we use it, and your choices. By using our website and
          placing orders, you agree to this Privacy Policy.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Information we collect</h2>
        <ul className="list-disc pl-6 text-base leading-7 text-meta-3 mb-6 space-y-2">
          <li>
            <strong>Contact and account details:</strong> name, email, phone number, and delivery address when you
            register, check out, or contact us.
          </li>
          <li>
            <strong>Order information:</strong> items purchased, order history, and communications related to your
            orders.
          </li>
          <li>
            <strong>Payment-related information:</strong> billing name and address. Card and UPI details are handled
            by our payment partners; we do not store full card numbers on our servers.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser type, device information, and cookies or similar
            technologies to run the site, improve performance, and understand usage trends in aggregate.
          </li>
        </ul>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">How we collect information</h2>
        <ul className="list-disc pl-6 text-base leading-7 text-meta-3 mb-6 space-y-2">
          <li>Directly from you when you create an account, place an order, subscribe to updates, or email us.</li>
          <li>Automatically when you browse our site (e.g. cookies, analytics).</li>
          <li>From partners such as payment and delivery providers, only as needed to fulfil your order.</li>
        </ul>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">How we use your information</h2>
        <ul className="list-disc pl-6 text-base leading-7 text-meta-3 mb-6 space-y-2">
          <li>To process and deliver orders, and to provide customer support.</li>
          <li>To send transactional messages (order confirmations, shipping updates, account notices).</li>
          <li>To improve our catalog, website experience, and security.</li>
          <li>With your consent, to share offers or news about diecast models and related products (you can opt out).</li>
          <li>To comply with legal obligations and protect our business and customers.</li>
        </ul>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Sharing with third parties</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          We may share information with service providers who help us operate the store (hosting, payments, email
          delivery, analytics). They may process data on our behalf under appropriate agreements. We may also disclose
          information if required by law, to respond to lawful requests, or to protect rights and safety.
        </p>
        <p className="text-base leading-7 text-meta-3 mb-6">
          If our business is reorganised or transferred, customer information may be transferred as part of that
          transaction, subject to this policy or an updated notice.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Marketing and opt-out</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          You may opt out of promotional emails by contacting us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          or using any unsubscribe link we provide. We may still send non-promotional messages about your account and
          orders.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Third-party sites</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          Our site may link to other websites. We are not responsible for their privacy practices. Please read their
          policies before sharing personal data there.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Security</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          We use reasonable technical and organisational measures to protect your information. No method of transmission
          over the internet is completely secure; we encourage you to use strong passwords and keep your account details
          confidential.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Your rights</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          Depending on applicable law, you may have the right to access, correct, delete, or restrict certain processing
          of your personal data, or to object to some uses. To exercise these rights, contact us using the details
          below.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Grievance officer (India)</h2>
        <p className="text-base leading-7 text-meta-3 mb-4">
          Under the Information Technology Act, 2000 and rules made thereunder, grievances relating to processing of
          information may be addressed to:
        </p>
        <address className="not-italic text-base leading-7 text-meta-3 mb-4">
          i-Robox — Grievance Officer
          <br />
          24, Basement, 21st Main Rd, Banashankari Stage II,
          <br />
          Banashankari, Bengaluru, Karnataka 560070
          <br />
          Email:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </address>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Updates</h2>
        <p className="text-base leading-7 text-meta-3 mb-6">
          We may update this Privacy Policy from time to time. The latest version will always be posted on this page
          with a revised date. Material changes may be communicated where required by law.
        </p>

        <h2 className="text-xl font-bold text-dark mt-10 mb-3">Jurisdiction</h2>
        <p className="text-base leading-7 text-meta-3">
          Your use of this website and any dispute over privacy is subject to this policy and our Terms &amp;
          Conditions. Disputes shall be governed by the laws of India, without prejudice to mandatory consumer rights
          in your jurisdiction.
        </p>
      </div>
    </section>
  );
}
