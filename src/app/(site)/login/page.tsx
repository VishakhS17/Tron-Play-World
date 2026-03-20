"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { name, email, password } : { email, password }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      toast.success(mode === "signup" ? "Account created!" : "Welcome back!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-36 pb-16">
      <div className="w-full px-4 mx-auto max-w-lg sm:px-6">
        <div className="rounded-2xl border border-gray-3 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-dark">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-meta-3">
            {mode === "login"
              ? "Sign in to access your orders, wishlist, and faster checkout."
              : "Create an account for faster checkout and order tracking."}
          </p>

          <div className="mt-6 flex gap-2 rounded-xl bg-gray-1 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-white text-dark shadow-sm border border-gray-3"
                  : "text-meta-3 hover:text-dark"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-white text-dark shadow-sm border border-gray-3"
                  : "text-meta-3 hover:text-dark"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-dark">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">
                Email
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dark">
                Password
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              <span className="mt-1 block text-xs text-meta-4">
                Minimum 8 characters.
              </span>
            </label>

            <button
              disabled={loading}
              className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-dark disabled:opacity-60"
              type="submit"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

