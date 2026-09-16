"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";

/**
 * แอดมินอัปรูปแทนลูกค้าได้จากการ์ดใบจอง — ใช้ทั้งเอกสารและสลิป
 *
 * มีไว้เพราะใบที่แอดมินกรอกเอง (ลูกค้าโทรมา/ทักแชทมา) ลูกค้าส่งรูปบัตรมาทางแชท
 * ไม่ได้เข้าหน้าเว็บของตัวเอง ถ้าไม่มีช่องนี้ แอดมินต้องส่งลิงก์ให้ลูกค้าไปอัปเอง
 *
 * mode
 *   add     — เพิ่มรูปต่อท้าย เลือกได้หลายรูป (เอกสาร)
 *   replace — เปลี่ยนรูปที่ index เดียว
 * แต่ละรูปอัปแยกไฟล์ แล้วส่ง fileUrl หลายค่าให้ server action ในครั้งเดียว
 */
export default function AdminDocUpload({
  bookingId,
  kind,
  label,
  action,
  buttonText = "อัปแทนลูกค้า",
  confirmText,
  uploadKind = "document",
  mode = "add",
  index,
  multiple = true,
  className,
}: {
  bookingId: string;
  kind: string;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
  buttonText?: string;
  /** ถามก่อนเปิดเลือกไฟล์ — ใช้ตอนจะทับรูปที่มีอยู่แล้ว */
  confirmText?: string;
  uploadKind?: "document" | "slip";
  mode?: "add" | "replace";
  index?: number;
  multiple?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: File[]) {
    setError(null);
    try {
      if (files.some((f) => !f.type.startsWith("image/"))) {
        throw new Error("ไฟล์ต้องเป็นรูปภาพ");
      }
      if (files.length > 10) throw new Error("เลือกได้สูงสุด 10 รูปต่อครั้ง");

      const urls: string[] = [];
      for (const [i, file] of files.entries()) {
        setBusy(files.length > 1 ? `กำลังอัป ${i + 1}/${files.length}…` : "กำลังอัป…");
        const form = new FormData();
        form.append(
          "file",
          await shrinkImage(file, { maxEdge: 1800, quality: 0.85, targetBytes: 700_000 })
        );
        form.append("kind", uploadKind);

        const up = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await up.json().catch(() => null);
        if (!up.ok || !upData?.url) {
          throw new Error(upData?.error ?? `อัปโหลดไม่สำเร็จ (${up.status})`);
        }
        urls.push(upData.url);
      }

      setBusy("กำลังบันทึก…");
      const fd = new FormData();
      fd.append("bookingId", bookingId);
      fd.append("kind", kind);
      fd.append("mode", mode);
      if (index != null) fd.append("index", String(index));
      for (const u of urls) fd.append("fileUrl", u);
      await action(fd);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const allowMany = multiple && mode === "add";

  return (
    <>
      <button
        type="button"
        disabled={busy != null}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          inputRef.current?.click();
        }}
        title={allowMany ? "เลือกได้หลายรูปพร้อมกัน" : undefined}
        className={
          className ??
          "text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50"
        }
      >
        {busy ?? buttonText}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={allowMany}
        hidden
        aria-label={`อัปโหลด${label}แทนลูกค้า`}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length) onPick(allowMany ? list : list.slice(0, 1));
        }}
      />
      {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
    </>
  );
}
