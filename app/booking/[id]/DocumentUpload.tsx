"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";
import {
  DOCUMENT_KINDS,
  DOCUMENT_LABEL,
  DOCUMENT_HINT,
  DOC_STATUS_LABEL,
  DOC_STATUS_CLASS,
  type DocumentKind,
  type DocumentStatus,
} from "@/lib/documents";

export type UploadedDoc = {
  kind: string;
  fileUrl: string;
  status: string;
  rejectReason: string | null;
};

export default function DocumentUpload({
  bookingId,
  uploaded,
}: {
  bookingId: string;
  uploaded: UploadedDoc[];
}) {
  const router = useRouter();
  const [busyKind, setBusyKind] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byKind = new Map(uploaded.map((d) => [d.kind, d]));
  const doneCount = DOCUMENT_KINDS.filter(
    (k) => byKind.get(k)?.status === "APPROVED"
  ).length;
  const allDone = doneCount === DOCUMENT_KINDS.length;
  const rejected = DOCUMENT_KINDS.filter(
    (k) => byKind.get(k)?.status === "REJECTED"
  );

  async function upload(kind: DocumentKind, file: File) {
    setBusyKind(kind);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", await shrinkImage(file, { maxEdge: 2000, quality: 0.9 }));
      form.append("kind", "document");
      const upRes = await fetch("/api/upload", { method: "POST", body: form });
      const upData = await upRes.json().catch(() => null);
      if (!upRes.ok || !upData?.url) {
        throw new Error(upData?.error ?? (upRes.status === 413
            ? "ไฟล์ใหญ่เกินไป กรุณาย่อรูปหรือถ่ายใหม่ด้วยความละเอียดต่ำลง"
            : `อัปโหลดไม่สำเร็จ (${upRes.status})`));
      }

      const res = await fetch(`/api/bookings/${bookingId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileUrl: upData.url }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `บันทึกไม่สำเร็จ (${res.status})`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h3 className="font-semibold text-slate-900">เอกสารสำหรับรับรถ</h3>
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
            allDone
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {doneCount}/{DOCUMENT_KINDS.length}
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        {allDone
          ? "เอกสารผ่านครบแล้ว วันรับรถไม่ต้องเตรียมเพิ่มครับ"
          : rejected.length > 0
          ? "มีเอกสารที่ต้องส่งใหม่ ดูเหตุผลด้านล่างแล้วถ่ายใหม่ได้เลยครับ"
          : "ส่งล่วงหน้าได้เลย จะได้รับรถเร็วขึ้น ไม่ต้องรอกรอกเอกสารหน้างาน"}
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {DOCUMENT_KINDS.map((kind, i) => {
          const doc = byKind.get(kind);
          const fileUrl = doc?.fileUrl;
          const status = doc?.status as DocumentStatus | undefined;
          const approved = status === "APPROVED";
          const isRejected = status === "REJECTED";
          const busy = busyKind === kind;

          return (
            <li
              key={kind}
              className={`rounded-xl border px-4 py-3.5 ${
                isRejected
                  ? "border-red-200 bg-red-50/50"
                  : approved
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-sm font-semibold ${
                    isRejected
                      ? "bg-red-500 text-white"
                      : approved
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {approved ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900 text-sm">
                      {DOCUMENT_LABEL[kind]}
                    </p>
                    {status && (
                      <span
                        className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${DOC_STATUS_CLASS[status]}`}
                      >
                        {DOC_STATUS_LABEL[status]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {DOCUMENT_HINT[kind]}
                  </p>
                  {isRejected && doc?.rejectReason && (
                    <p className="text-xs text-red-700 mt-1.5 leading-relaxed font-medium">
                      เหตุผล: {doc.rejectReason}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      className={`cursor-pointer text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                        fileUrl && !isRejected
                          ? "border border-slate-200 text-slate-700 hover:bg-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } ${busy ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      {busy
                        ? "กำลังอัปโหลด..."
                        : isRejected
                        ? "ส่งใหม่"
                        : fileUrl
                        ? "เปลี่ยนรูป"
                        : "อัปโหลดรูป"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) upload(kind, f);
                        }}
                      />
                    </label>

                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        ดูรูปที่ส่งไว้
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-xs text-slate-500 leading-relaxed">
        รองรับไฟล์รูป JPG PNG WEBP ขนาดไม่เกิน 8MB ต่อไฟล์
        · เอกสารเก็บเป็นความลับ เฉพาะแอดมินที่ล็อกอินแล้วเท่านั้นที่เปิดดูได้
      </p>
    </div>
  );
}
