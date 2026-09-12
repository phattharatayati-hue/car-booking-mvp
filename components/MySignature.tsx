"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";

/**
 * ส่วนเซ็นลายเซ็นในหน้า "บัญชีของฉัน"
 *
 * แยกเป็น client component เพราะต้องวาดบน canvas แล้วอัปไฟล์ก่อน
 * ถึงจะมี URL ให้บันทึกลงบัญชี — ทำเป็นฟอร์มธรรมดาไม่ได้
 */
export default function MySignature({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!hasExisting);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(url: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl: url }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "บันทึกไม่สำเร็จ");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
        >
          เซ็นใหม่
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (confirm("ลบลายเซ็นออกจากระบบ?\n\nใบเสร็จที่ออกไปแล้วยังมีลายเซ็นเดิมอยู่ ไม่ถูกลบตาม")) {
              persist(null);
            }
          }}
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold transition-colors"
        >
          ลบลายเซ็น
        </button>
        {error && (
          <p role="alert" className="w-full text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <SignaturePad
        onSaved={persist}
        saving={saving}
        label="เซ็นในกรอบด้วยนิ้ว (มือถือ/แท็บเล็ต) หรือลากเมาส์ค้าง"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
      {hasExisting && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:text-slate-700 mt-3"
        >
          ยกเลิก ใช้ลายเซ็นเดิม
        </button>
      )}
    </div>
  );
}
