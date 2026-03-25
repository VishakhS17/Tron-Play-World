import { Suspense } from "react";
import LoginClient from "./login-client";

function LoginFallback() {
  return (
    <section className="pt-36 pb-16 bg-gradient-to-b from-blue-50/40 to-white">
      <div className="w-full px-4 mx-auto max-w-lg sm:px-6">
        <div className="rounded-2xl border border-gray-3 bg-white p-6 sm:p-8 shadow-sm">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-1" />
          <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-gray-1" />
          <div className="mt-8 h-40 animate-pulse rounded-xl bg-gray-1" />
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
