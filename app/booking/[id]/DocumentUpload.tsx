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
  /** รูปเพิ่มของเอกสารชนิดเดียวกัน */
  extraUrls?: string[];
  status: string;
  rejectReason: string | null;
};

/** เพดานเดียวกับฝั่งเซิร์ฟเวอร์และกล่องสลิป */
const MAX_MB = 8;

/** คืนข้อความปัญหา หรือ null ถ้าไฟล์ใช้ได้ — เช็คตั้งแต่ตอนเลือก ไม่ปล่อยไปเจอ 413 */
function checkFile(f: File): string | null {
  if (!f.type.startsWith("image/")) {
    return "ไฟล์ต้องเป็นรูปภาพเท่านั้น (JPG, PNG หรือ WEBP)";
  }
  if (f.size > MAX_MB * 1024 * 1024) {
    return `ไฟล์ใหญ่ ${(f.size / 1024 / 1024).toFixed(1)} MB เกิน ${MAX_MB} MB — ถ่ายใหม่ด้วยความละเอียดต่ำลง หรือย่อรูปก่อน`;
  }
  return null;
}

export default function DocumentUpload({
  bookingId,
  uploaded,
}: {
  bookingId: string;
  uploaded: UploadedDoc[];
}) {
  const router = useRouter();
  const [busyKind, setBusyKind] = useState<DocumentKind | null>(null);
  const [busyText, setBusyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byKind = new Map(uploaded.map((d) => [d.kind, d]));
  const doneCount = DOCUMENT_KINDS.filter(
    (k) => byKind.get(k)?.status === "APPROVED"
  ).length;
  const allDone = doneCount === DOCUMENT_KINDS.length;
  const rejected = DOCUMENT_KINDS.filter(
    (k) => byKind.get(k)?.status === "REJECTED"
  );

  /** เลือกไฟล์แล้วเช็คก่อนอัป — ไฟล์ไหนมีปัญหาหยุดทั้งชุด จะได้ไม่ส่งไปครึ่ง ๆ */
  function pick(
    kind: DocumentKind,
    list: FileList | null,
    mode: "add" | "replace" | "replaceAll",
    index?: number
  ) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    for (const f of files) {
      const problem = checkFile(f);
      if (problem) {
        setError(problem);
        return;
      }
    }
    upload(kind, mode === "replace" ? files.slice(0, 1) : files, mode, index);
  }

  async function upload(
    kind: DocumentKind,
    files: File[],
    mode: "add" | "replace" | "replaceAll",
    index?: number
  ) {
    setBusyKind(kind);
    setError(null);

    try {
      const fileUrls: string[] = [];
      for (const [i, file] of files.entries()) {
        setBusyText(files.length > 1 ? `กำลังอัปโหลด ${i + 1}/${files.length}...` : "กำลังอัปโหลด...");
        const form = new FormData();
        form.append("file", await shrinkImage(file, { maxEdge: 1800, quality: 0.85, targetBytes: 700_000 }));
        form.append("kind", "document");
        const upRes = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await upRes.json().catch(() => null);
        if (!upRes.ok || !upData?.url) {
          throw new Error(upData?.error ?? (upRes.status === 413
              ? "ไฟล์ใหญ่เกินไป กรุณาย่อรูปหรือถ่ายใหม่ด้วยความละเอียดต่ำลง"
              : `อัปโหลดไม่สำเร็จ (${upRes.status})`));
        }
        fileUrls.push(upData.url);
      }

      setBusyText("กำลังบันทึก...");
      const res = await fetch(`/api/bookings/${bookingId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileUrls, mode, index }),
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

  async function removeImage(kind: DocumentKind, index: number, isLast: boolean) {
    const ok = window.confirm(
      isLast
        ? `ลบรูปนี้? เป็นรูปสุดท้ายของ${DOCUMENT_LABEL[kind]} ต้องอัปใหม่ภายหลัง`
        : `ลบ${DOCUMENT_LABEL[kind]} รูปที่ ${index + 1}?`
    );
    if (!ok) return;
    setBusyKind(kind);
    setBusyText("กำลังลบ...");
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, index }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `ลบไม่สำเร็จ (${res.status})`);
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
          const images = doc ? [doc.fileUrl, ...(doc.extraUrls ?? [])] : [];
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

                  {images.length > 0 && !isRejected && (
                    <ul className="mt-3 grid grid-cols-3 gap-2">
                      {images.map((url, idx) => (
                        <li key={`${url}-${idx}`} className="min-w-0">
                          <a
                            href={`${url}&b=${bookingId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="relative block aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                            title="เปิดดูรูปขนาดเต็ม"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`${url}&b=${bookingId}`}
                              alt={`${DOCUMENT_LABEL[kind]} รูปที่ ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1 left-1 text-[10px] px-1.5 rounded bg-black/60 text-white">
                              {idx + 1}
                            </span>
                          </a>
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <label
                              className={`cursor-pointer font-medium text-blue-700 hover:underline ${
                                busy ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              เปลี่ยน
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={busy}
                                onChange={(e) => {
                                  const list = e.target.files;
                                  pick(kind, list, "replace", idx);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeImage(kind, idx, images.length === 1)}
                              className="font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              ลบ
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      className={`cursor-pointer text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                        images.length > 0 && !isRejected
                          ? "border border-slate-200 text-slate-700 hover:bg-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } ${busy ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      {busy
                        ? busyText
                        : isRejected
                        ? "ส่งใหม่"
                        : images.length > 0
                        ? "+ เพิ่มรูป"
                        : "อัปโหลดรูป"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => {
                          const list = e.target.files;
                          // ไม่ผ่าน = ส่งใหม่ทั้งชุด รูปเดิมถูกแทนที่
                          pick(kind, list, isRejected ? "replaceAll" : "add");
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-xs text-slate-400">
                      เลือกได้หลายรูป เช่น ด้านหน้า-ด้านหลัง
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-xs text-slate-500 leading-relaxed">
        รองรับไฟล์รูป JPG PNG WEBP ขนาดไม่เกิน 8MB ต่อไฟล์ สูงสุด 10 รูปต่อเอกสาร
        · เอกสารเก็บเป็นความลับ เปิดดูได้เฉพาะจากลิงก์การจองนี้และแอดมินเท่านั้น
      </p>
    </div>
  );
}
