"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  userId: string;
};

export default function ChangePasswordCard({ userId }: Props) {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  async function handleSendOtp() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send OTP");
      setDevOtpHint(typeof data?.devOtp === "string" ? data.devOtp : null);
      toast.success(data?.emailSent ? "OTP sent to your email." : "Use the dev OTP shown.");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otp, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not change password");
      toast.success("Password changed successfully.");
      setOtp("");
      setNewPassword("");
      setDevOtpHint(null);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-3 bg-white p-6">
      <h2 className="text-lg font-semibold text-dark">Change password</h2>
      <p className="mt-2 text-sm text-meta-3">
        Request an OTP and use it to set a new password.
      </p>
      <button
        type="button"
        onClick={handleSendOtp}
        disabled={loading}
        className="mt-4 inline-flex rounded-lg border border-gray-3 bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-1 transition disabled:opacity-60"
      >
        Send OTP
      </button>
      {devOtpHint ? (
        <p className="mt-3 rounded-md bg-yellow-light-4 px-3 py-2 text-xs text-dark">
          Dev OTP (email not configured): <b>{devOtpHint}</b>
        </p>
      ) : null}
      <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="OTP"
          required
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        />
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          type="password"
          minLength={8}
          required
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-dark disabled:opacity-60"
        >
          {loading ? "Updating..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
