"use client";

import Link from "next/link";

export default function WhatsAppFloatingButton() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "919844716214";
  const text = encodeURIComponent("Hi! I have a question about an order / product.");
  const href = `https://wa.me/${phone}?text=${text}`;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:opacity-95"
    >
      <span className="text-lg font-bold">WA</span>
    </Link>
  );
}

