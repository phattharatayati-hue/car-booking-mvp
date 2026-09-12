"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * อัปตราประทับบริษัท
 *
 * แนะนำให้ใช้ PNG พื้นใส เพราะตราจะถูกวางทับบนพื้นขาวของใบเสร็จ
 * ถ้าเป็น JPG พื้นดำหรือขาวทึบจะเห็นเป็นสี่เหลี่ยมทับกรอบลายเซ็น
 */
export default function StampUpload({ current }: { current: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("ไฟล์ต้องเป็นรูปภาพ (แนะนำ PNG พื้นใส)");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("ไฟล์ใหญ่เกิน 4MB กรุณาย่อรูปก่อน");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "signature");

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await up.json().catch(() => null);
      if (!up.ok || !ud?.url) throw new Error(ud?.error ?? "อัปโหลดไม่สำเร็จ");

      const save = await fetch("/api/settings/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampUrl: ud.url }),
      });
      const sd = await save.json().catch(() => null);
      if (!save.ok) throw new Error(sd?.error ?? "บันทึกไม่สำเร็จ");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("ลบตราประทับออกจากระบบ?\n\nใบเสร็จที่ออกไปแล้วยังมีตราเดิมอยู่ ไม่ถูกลบตาม")) return;
    setBusy(true);
    try {
      await fetch("/api/settings/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampUrl: null }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {current && (
        <div className="mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt="ตราประทับบริษัท"
            className="h-24 object-contain bg-white rounded-xl border border-slate-200 px-3"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold cursor-pointer transition-colors">
          {busy ? "กำลังอัปโหลด…" : current ? "เปลี่ยนตราประทับ" : "อัปโหลดตราประทับ"}
          <input type="file" accept="image/*" onChange={pick} disabled={busy} className="hidden" />
        </label>
        {current && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold transition-colors"
          >
            ลบ
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-2">
        แนะนำ PNG พื้นใส — ถ้าเป็นไฟล์พื้นทึบจะเห็นเป็นสี่เหลี่ยมทับกรอบลายเซ็นในใบเสร็จ
      </p>
    </div>
  );
}
