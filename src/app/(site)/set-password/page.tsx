import type { Metadata } from "next";
import SetPasswordClient from "./set-password-client";

export const metadata: Metadata = {
  title: "Set password | i-Robox",
  description: "Choose a password for your i-Robox account",
};

export default function SetPasswordPage() {
  return (
    <section className="pt-36 pb-16">
      <div className="mx-auto max-w-md px-4">
        <SetPasswordClient />
      </div>
    </section>
  );
}
