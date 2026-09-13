"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignatureModal from "@/components/SignatureModal";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * ส่วนเซ็นลายเซ็นในหน้า "บัญชีของฉัน"
 *
 * เซ็นในกล่องเต็มจอเสมอ ไม่เซ็นคาอยู่ในหน้ายาว ๆ
 * เพราะบนมือถือและ iPad การลากนิ้วบนหน้าที่เลื่อนได้จะทำให้หน้าขยับตาม
 * (และใน in-app browser ของ LINE หน้าเว็บอาจถูกลากปิดไปเลย)
 */
export default function MySignature({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
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

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
      >
        {hasExisting ? "เซ็นใหม่" : "เซ็นลายเซ็น"}
      </button>

      {hasExisting && (
        <button
          type="button"
          disabled={saving}
          onClick={() => setAskDelete(true)}
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold transition-colors"
        >
          ลบลายเซ็น
        </button>
      )}

      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}

      <SignatureModal
        open={open}
        onClose={() => setOpen(false)}
        title="เซ็นลายเซ็นของคุณ"
        subtitle="ใช้ในใบเสร็จทุกใบ เซ็นเก็บไว้ครั้งเดียว"
        label="เซ็นในกรอบด้วยนิ้ว (มือถือ/แท็บเล็ต) หรือลากเมาส์ค้าง"
        buttonText="บันทึกลายเซ็น"
        onSaved={persist}
        saving={saving}
      />

      <ConfirmDialog
        open={askDelete}
        message={"ลบลายเซ็นออกจากระบบ?\n\nใบเสร็จที่ออกไปแล้วยังมีลายเซ็นเดิมอยู่ ไม่ถูกลบตาม"}
        confirmText="ลบลายเซ็น"
        onCancel={() => setAskDelete(false)}
        onConfirm={() => {
          setAskDelete(false);
          persist(null);
        }}
      />
    </div>
  );
}
