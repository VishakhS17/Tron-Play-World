"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { validateCommonEmailProvider, validateEmail } from "@/lib/validateEmai";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup" && !validateCommonEmailProvider(email.trim().toLowerCase())) {
        throw new Error("Use a common email provider (Gmail, Yahoo, Outlook, etc.)");
      }
      const loginOrSignupRoute = mode === "signup" ? "signup" : "login";
      const res = await fetch(`/api/auth/${loginOrSignupRoute}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { name, email, phone, password }
            : { identifier, password }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (mode === "login" && data?.redirectToSignup) {
          const suggested = typeof data?.suggestedIdentifier === "string" ? data.suggestedIdentifier : identifier;
          if (validateEmail(suggested.toLowerCase())) {
            setEmail(suggested);
          } else {
            setPhone(suggested);
          }
          setMode("signup");
          throw new Error("Account not found. Please complete sign up.");
        }
        throw new Error(data?.error || "Request failed");
      }
      if (mode === "signup") {
        if (data?.requiresOtp && typeof data?.userId === "string") {
          setPendingUserId(data.userId);
          setOtp("");
          setDevOtpHint(typeof data?.devOtp === "string" ? data.devOtp : null);
          toast.success(
            data?.emailSent
              ? "OTP sent to your email. Please verify to continue."
              : "Email is not configured. Use the dev OTP shown on screen."
          );
          return;
        }
        toast.success("Account created!");
      } else {
        toast.success("Welcome back!");
        window.dispatchEvent(new Event("tpw-auth-changed"));
      }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPasswordOtp() {
    if (!identifier.trim()) {
      toast.error("Enter your email or phone first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send OTP");
      setResetUserId(typeof data?.userId === "string" ? data.userId : null);
      setDevOtpHint(typeof data?.devOtp === "string" ? data.devOtp : null);
      setMode("forgot");
      toast.success(
        data?.emailSent ? "OTP sent successfully." : "Email is not configured. Use the dev OTP shown."
      );
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: resetUserId, otp, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not reset password");
      toast.success("Password updated. Please sign in.");
      setMode("login");
      setOtp("");
      setNewPassword("");
      setResetUserId(null);
      setDevOtpHint(null);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUserId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: pendingUserId, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "OTP verification failed");
      }
      toast.success("Welcome to i-Robox!");
      setPendingUserId(null);
      setOtp("");
      setDevOtpHint(null);
      window.dispatchEvent(new Event("tpw-auth-changed"));
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!pendingUserId && !email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: pendingUserId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not resend OTP");
      }
      setPendingUserId(typeof data?.userId === "string" ? data.userId : pendingUserId);
      setDevOtpHint(typeof data?.devOtp === "string" ? data.devOtp : null);
      toast.success(
        data?.emailSent
          ? "OTP resent successfully."
          : "Email is not configured. Use the dev OTP shown on screen."
      );
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-36 pb-16 bg-gradient-to-b from-blue-50/40 to-white">
      <div className="w-full px-4 mx-auto max-w-lg sm:px-6">
        <div className="rounded-2xl border border-gray-3 bg-white p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-dark">
            {pendingUserId
              ? "Verify your account"
              : mode === "forgot"
              ? "Reset password"
              : mode === "login"
              ? "Sign in"
              : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-meta-3">
            {mode === "forgot"
              ? "Use the OTP sent to your email to set a new password."
              : mode === "login"
              ? "Sign in to access your orders, wishlist, and faster checkout."
              : "Create an account for faster checkout and order tracking."}
          </p>

          {!pendingUserId && mode !== "forgot" ? (
            <>
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
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-dark">
                        Name
                      </span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                        autoComplete="name"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-dark">
                        Mobile number
                      </span>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                        autoComplete="tel"
                        required
                      />
                    </label>
                  </>
                )}

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">
                    {mode === "signup" ? "Email" : "Email or phone"}
                  </span>
                  <input
                    value={mode === "signup" ? email : identifier}
                    onChange={(e) =>
                      mode === "signup"
                        ? setEmail(e.target.value)
                        : setIdentifier(e.target.value)
                    }
                    type={mode === "signup" ? "email" : "text"}
                    required
                    className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                    autoComplete={mode === "signup" ? "email" : "username"}
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
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
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
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={handleRequestPasswordOtp}
                    disabled={loading}
                    className="w-full text-sm font-medium text-blue hover:underline disabled:opacity-60"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </form>
            </>
          ) : mode === "forgot" ? (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              {devOtpHint ? (
                <p className="rounded-md bg-yellow-light-4 px-3 py-2 text-xs text-dark">
                  Dev OTP (email not configured): <b>{devOtpHint}</b>
                </p>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-dark">OTP</span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  required
                  className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                  placeholder="123456"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-dark">New password</span>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  minLength={8}
                  required
                  className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                />
              </label>
              <button
                disabled={loading}
                className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-dark disabled:opacity-60"
                type="submit"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMode("login");
                  setOtp("");
                  setNewPassword("");
                  setResetUserId(null);
                  setDevOtpHint(null);
                }}
                className="w-full rounded-lg border border-gray-3 bg-white px-4 py-2.5 text-sm font-medium text-meta-3 hover:text-dark transition disabled:opacity-60"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold text-dark">Verify OTP</h2>
              <p className="text-sm text-meta-3">
                Enter the 6-digit code sent to your email.
              </p>
              {devOtpHint ? (
                <p className="rounded-md bg-yellow-light-4 px-3 py-2 text-xs text-dark">
                  Dev OTP (email not configured): <b>{devOtpHint}</b>
                </p>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-dark">
                  OTP
                </span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                  placeholder="123456"
                  required
                />
              </label>
              <button
                disabled={loading}
                className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-dark disabled:opacity-60"
                type="submit"
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResendOtp}
                className="w-full rounded-lg border border-gray-3 bg-white px-4 py-2.5 text-sm font-medium text-meta-3 hover:text-dark transition disabled:opacity-60"
              >
                Resend OTP
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setPendingUserId(null);
                  setOtp("");
                  setDevOtpHint(null);
                }}
                className="w-full rounded-lg border border-gray-3 bg-white px-4 py-2.5 text-sm font-medium text-meta-3 hover:text-dark transition disabled:opacity-60"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

