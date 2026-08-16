"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Liff } from "@/lib/liff-types";

type State =
  | { status: "loading"; message: string }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

const SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadSdk(): Promise<Liff> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve(window.liff);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () =>
        window.liff ? resolve(window.liff) : reject(new Error("โหลด LIFF ไม่สำเร็จ"))
      );
      existing.addEventListener("error", () => reject(new Error("โหลด LIFF ไม่สำเร็จ")));
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () =>
      window.liff ? resolve(window.liff) : reject(new Error("โหลด LIFF ไม่สำเร็จ"));
    script.onerror = () => reject(new Error("โหลด LIFF ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

export default function LiffLinker({
  bookingId,
  liffId,
}: {
  bookingId: string;
  liffId: string;
}) {
  const [state, setState] = useState<State>({
    status: "loading",
    message: "กำลังเชื่อมต่อ LINE...",
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!liffId) {
        setState({
          status: "error",
          message: "ระบบยังไม่ได้ตั้งค่า LIFF (ไม่พบ NEXT_PUBLIC_LIFF_ID)",
        });
        return;
      }

      try {
        const liff = await loadSdk();
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // เด้งไปหน้า login ของ LINE แล้วกลับมาที่หน้านี้
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          setState({ status: "error", message: "ไม่ได้รับข้อมูลยืนยันตัวตนจาก LINE" });
          return;
        }

        const res = await fetch("/api/line/link-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, bookingId }),
        });

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setState({
            status: "error",
            message: data?.error ?? `ผูกบัญชีไม่สำเร็จ (${res.status})`,
          });
          return;
        }

        setState({ status: "success", name: data.name ?? "" });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [bookingId, liffId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      {state.status === "loading" && (
        <>
          <span className="w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-blue-600 animate-spin block mx-auto mb-5" />
          <p className="text-slate-600">{state.message}</p>
        </>
      )}

      {state.status === "success" && (
        <>
          <span className="w-14 h-14 rounded-2xl bg-emerald-500 text-white grid place-items-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-slate-900 mb-2">รับแจ้งเตือนเรียบร้อย</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            {state.name && <>คุณ {state.name} </>}
            จะได้รับแจ้งเตือนทาง LINE เมื่อแอดมินตรวจสอบสลิปมัดจำเสร็จ
          </p>
          <Link
            href={`/booking/${bookingId}`}
            className="inline-block mt-6 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            กลับไปดูสถานะการจอง
          </Link>
        </>
      )}

      {state.status === "error" && (
        <>
          <span className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 grid place-items-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-slate-900 mb-2">ผูกบัญชีไม่สำเร็จ</h1>
          <p className="text-slate-600 text-sm">{state.message}</p>
          <Link
            href={`/booking/${bookingId}`}
            className="inline-block mt-6 px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            กลับไปดูสถานะการจอง
          </Link>
        </>
      )}
    </div>
  );
}
