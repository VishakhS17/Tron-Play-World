export const metadata = {
  title: "FAQ | i-Robox",
};

const FAQS = [
  {
    q: "What is the minimum order value for free shipping?",
    a: "Free shipping is available on orders over ₹2000. Otherwise, a flat ₹99 shipping fee may apply.",
  },
  {
    q: "How do I track my order?",
    a: "After payment is confirmed, a shipment is created and a tracking ID will appear in your order details.",
  },
  {
    q: "Can I return a product?",
    a: "Yes. You can request a return from the Returns section once your order is delivered (subject to policy).",
  },
  {
    q: "Do you verify payments server-side?",
    a: "Yes. Orders are confirmed only after server-side payment confirmation.",
  },
];

export default function FaqPage() {
  return (
    <section className="pt-36 pb-16">
      <div className="w-full px-4 mx-auto max-w-4xl sm:px-8 xl:px-0">
        <h1 className="text-2xl font-semibold text-dark">FAQ</h1>
        <p className="mt-2 text-sm text-meta-3">
          Quick answers to common questions.
        </p>

        <div className="mt-8 space-y-4">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="rounded-2xl border border-gray-3 bg-white p-5"
            >
              <summary className="cursor-pointer list-none font-semibold text-dark">
                {item.q}
              </summary>
              <p className="mt-3 text-sm text-meta-3">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

