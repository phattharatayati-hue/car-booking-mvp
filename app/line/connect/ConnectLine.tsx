"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Liff } from "@/lib/liff-types";

const SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadSdk(): Promise<Liff> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve(window.liff);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const done = () =>
      window.liff ? resolve(window.liff) : reject(new Error("โหลด LIFF ไม่สำเร็จ"));
    if (existing) {
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => reject(new Error("โหลด LIFF ไม่สำเร็จ")));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error("โหลด LIFF ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

type Result = { matched: boolean; name: string; bookingCount?: number };

export default function ConnectLine({
  liffId,
  addFriendUrl,
}: {
  liffId: string;
  addFriendUrl: string;
}) {
  const [ready, setReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  /** เตรียม SDK เสร็จแล้วหรือยัง — ยังไม่ได้ล็อกอิน */
  const [sdkReady, setSdkReady] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!liffId) {
        setInitError("ระบบยังไม่ได้ตั้งค่า LIFF");
        return;
      }
      try {
        const liff = await loadSdk();
        await liff.init({ liffId });
        if (cancelled) return;

        setSdkReady(true);

        // ไม่เด้งไปล็อกอินเอง — รอให้ผู้ใช้กดปุ่มก่อน
        // แต่ถ้าล็อกอินอยู่แล้ว (เปิดในแอป LINE หรือเพิ่งกลับมาจากหน้าล็อกอิน)
        // ก็ไปต่อให้เลย ไม่ต้องกดซ้ำ
        if (!liff.isLoggedIn()) return;

        const token = liff.getIDToken();
        if (cancelled) return;
        if (!token) {
          setInitError("ไม่ได้รับข้อมูลยืนยันตัวตนจาก LINE");
          return;
        }
        setIdToken(token);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  /** ผู้ใช้กดปุ่มเอง จึงพาไปหน้าล็อกอินของ LINE */
  async function handleLogin() {
    setLoggingIn(true);
    setInitError(null);
    try {
      const liff = await loadSdk();
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }
      const token = liff.getIDToken();
      if (!token) {
        setInitError("ไม่ได้รับข้อมูลยืนยันตัวตนจาก LINE");
        setLoggingIn(false);
        return;
      }
      setIdToken(token);
      setReady(true);
      setLoggingIn(false);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
      setLoggingIn(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/line/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, phone }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? `เชื่อมต่อไม่สำเร็จ (${res.status})`);
        setSubmitting(false);
        return;
      }

      setResult(data as Result);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <span className="w-14 h-14 rounded-2xl bg-emerald-500 text-white grid place-items-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="text-xl font-bold text-slate-900 mb-2">เชื่อมต่อสำเร็จ</h1>

        {result.matched ? (
          <p className="text-sm text-slate-600 leading-relaxed">
            สวัสดีคุณ {result.name}
            {result.bookingCount ? (
              <>
                <br />
                พบการจองของคุณ {result.bookingCount} รายการ
              </>
            ) : null}
            <br />
            จากนี้เราจะแจ้งสถานะการจองทาง LINE ให้ทันที
          </p>
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed">
            บันทึกเบอร์เรียบร้อยแล้ว
            <br />
            เมื่อคุณจองรถด้วยเบอร์นี้ ระบบจะแจ้งสถานะทาง LINE ให้อัตโนมัติ
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold py-3 transition-colors"
          >
            เพิ่มเพื่อน LINE (ถ้ายังไม่ได้เพิ่ม)
          </a>
          <Link
            href="/cars"
            className="w-full rounded-xl border border-slate-200 text-slate-700 font-semibold py-3 hover:bg-slate-50 transition-colors"
          >
            ดูรถทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">รับแจ้งเตือนทาง LINE</h1>
      <p className="text-sm text-slate-500 mb-6">
        รู้ผลทันทีที่แอดมินตรวจสลิป และได้รับเตือนก่อนถึงวันคืนรถ
      </p>

      {/* ขั้นที่ 1 */}
      <div className="flex gap-3 mb-5">
        <span className="w-7 h-7 rounded-full bg-slate-900 text-white grid place-items-center text-sm font-semibold shrink-0">
          1
        </span>
        <div className="flex-1">
          <p className="font-medium text-slate-900 text-sm mb-2">เพิ่มเพื่อน LINE ของร้าน</p>
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            เพิ่มเพื่อน
          </a>
        </div>
      </div>

      {/* ขั้นที่ 2 */}
      <div className="flex gap-3">
        <span className="w-7 h-7 rounded-full bg-slate-900 text-white grid place-items-center text-sm font-semibold shrink-0">
          2
        </span>
        <div className="flex-1">
          <p className="font-medium text-slate-900 text-sm mb-2">
            ยืนยันเบอร์โทรที่ใช้จอง
          </p>

          {initError ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {initError}
            </p>
          ) : !ready && !sdkReady ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
              กำลังเตรียมระบบ...
            </div>
          ) : !ready ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">
                กดปุ่มด้านล่างเพื่อเข้าสู่ระบบด้วยบัญชี LINE ของคุณ
                เราขอแค่ชื่อและรูปโปรไฟล์ ไม่เห็นข้อความในแชทของคุณ
              </p>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loggingIn}
                className="w-full rounded-xl bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-60 text-white font-semibold py-3 transition-colors"
              >
                {loggingIn ? "กำลังพาไปหน้า LINE..." : "เข้าสู่ระบบด้วย LINE"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                required
                placeholder="0812345678"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
              >
                {submitting ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อ"}
              </button>
              <p className="text-xs text-slate-500">
                ใช้เบอร์เดียวกับที่กรอกตอนจองรถ ระบบจะจับคู่การจองให้อัตโนมัติ
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
