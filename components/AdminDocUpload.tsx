"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";

/**
 * แอดมินอัปเอกสารลูกค้าแทนได้จากการ์ดใบจอง
 *
 * มีไว้เพราะใบที่แอดมินกรอกเอง (ลูกค้าโทรมา/ทักแชทมา) ลูกค้าส่งรูปบัตรมาทางแชท
 * ไม่ได้เข้าหน้าเว็บของตัวเอง ถ้าไม่มีช่องนี้ แอดมินต้องส่งลิงก์ให้ลูกค้าไปอัปเอง
 * ซึ่งพังทั้งกระบวนการเพราะลูกค้ากลุ่มนี้ไม่อยากเข้าเว็บตั้งแต่แรก
 *
 * เอกสารที่แอดมินอัปเองถือว่าตรวจแล้ว (ตาเห็นตอนรับไฟล์มา) จึงบันทึกเป็น "ผ่าน" เลย
 */
export default function AdminDocUpload({
  bookingId,
  kind,
  label,
  action,
}: {
  bookingId: string;
  kind: string;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("ไฟล์ต้องเป็นรูปภาพ");
      }

      const form = new FormData();
      form.append(
        "file",
        await shrinkImage(file, { maxEdge: 1800, quality: 0.85, targetBytes: 700_000 })
      );
      form.append("kind", "document");

      const up = await fetch("/api/upload", { method: "POST", body: form });
      const upData = await up.json().catch(() => null);
      if (!up.ok || !upData?.url) {
        throw new Error(upData?.error ?? `อัปโหลดไม่สำเร็จ (${up.status})`);
      }

      const fd = new FormData();
      fd.append("bookingId", bookingId);
      fd.append("kind", kind);
      fd.append("fileUrl", upData.url);
      await action(fd);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50"
      >
        {busy ? "กำลังอัป…" : "อัปแทนลูกค้า"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        aria-label={`อัปโหลด${label}แทนลูกค้า`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
      {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
    </>
  );
}
