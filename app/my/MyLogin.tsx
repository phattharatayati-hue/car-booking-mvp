"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MyLogin({ addFriendUrl }: { addFriendUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok && data?.ok, error: data?.error as string | undefined };
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { ok, error } = await post("/api/my/request-otp", { phone });
    setBusy(false);

    if (!ok) {
      setError(error ?? "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { ok, error } = await post("/api/my/verify-otp", { phone, code });
    setBusy(false);

    if (!ok) {
      setError(error ?? "ยืนยันไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">ประวัติการจองของฉัน</h1>
      <p className="text-sm text-slate-500 mb-6">
        กรอกเบอร์ที่ใช้จอง แล้วเราจะส่งรหัสยืนยันไปให้ทางแชท LINE
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {step === "phone" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">เบอร์โทรที่ใช้จอง</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            required
            placeholder="0812345678"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
          >
            {busy ? "กำลังส่งรหัส..." : "ขอรหัสยืนยัน"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">
            รหัส 6 หลักที่ส่งไปในแชท LINE
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            required
            placeholder="000000"
            className={`${inputClass} text-center text-2xl tracking-[0.4em] font-semibold`}
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
          >
            {busy ? "กำลังตรวจสอบ..." : "ดูประวัติการจอง"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
            className="text-sm text-slate-500 hover:text-slate-700 py-1"
          >
            แก้เบอร์โทร / ขอรหัสใหม่
          </button>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-500 leading-relaxed">
        ไม่ได้รับรหัส? รหัสจะส่งไปทางแชท LINE เท่านั้น
        ถ้ายังไม่เคยเชื่อมต่อ LINE กับเบอร์นี้ ให้{" "}
        <Link href="/line/connect" className="text-blue-700 font-medium hover:underline">
          เชื่อมต่อ LINE
        </Link>{" "}
        ก่อน หรือ{" "}
        <a
          href={addFriendUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 font-medium hover:underline"
        >
          เพิ่มเพื่อน LINE ของร้าน
        </a>{" "}
        แล้วทักแชทมาได้เลย
      </div>
    </div>
  );
}
