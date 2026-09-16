"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";

/**
 * แอดมินอัปรูปแทนลูกค้าได้จากการ์ดใบจอง — ใช้ทั้งเอกสารและสลิป
 *
 * มีไว้เพราะใบที่แอดมินกรอกเอง (ลูกค้าโทรมา/ทักแชทมา) ลูกค้าส่งรูปบัตรมาทางแชท
 * ไม่ได้เข้าหน้าเว็บของตัวเอง ถ้าไม่มีช่องนี้ แอดมินต้องส่งลิงก์ให้ลูกค้าไปอัปเอง
 * ซึ่งพังทั้งกระบวนการเพราะลูกค้ากลุ่มนี้ไม่อยากเข้าเว็บตั้งแต่แรก
 *
 * เลือกได้หลายรูป — ระบบต่อรูปเรียงลงล่างเป็นภาพเดียวก่อนอัป
 * (ฐานข้อมูลเก็บหนึ่งไฟล์ต่อเอกสาร เช่น บัตรหน้า-หลัง หรือตั๋วไป-กลับ จึงรวมเป็นภาพยาว)
 *
 * เอกสารที่แอดมินอัปเองถือว่าตรวจแล้ว (ตาเห็นตอนรับไฟล์มา) จึงบันทึกเป็น "ผ่าน" เลย
 */

const STITCH_WIDTH = 1200;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`เปิดรูป ${file.name} ไม่ได้`));
    };
    img.src = url;
  });
}

/** ต่อหลายรูปเรียงลงล่าง กว้างเท่ากัน คั่นด้วยเส้นขาว */
async function stitchImages(files: File[]): Promise<File> {
  const imgs = await Promise.all(files.map(loadImage));
  const gap = 16;
  const heights = imgs.map((im) => Math.round((im.naturalHeight * STITCH_WIDTH) / im.naturalWidth));
  const total = heights.reduce((a, b) => a + b, 0) + gap * (imgs.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = STITCH_WIDTH;
  canvas.height = total;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์นี้รวมรูปไม่ได้");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = 0;
  imgs.forEach((im, i) => {
    ctx.drawImage(im, 0, y, STITCH_WIDTH, heights[i]);
    y += heights[i] + gap;
  });

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("รวมรูปไม่สำเร็จ");
  return new File([blob], "combined.jpg", { type: "image/jpeg" });
}

export default function AdminDocUpload({
  bookingId,
  kind,
  label,
  action,
  buttonText = "อัปแทนลูกค้า",
  confirmText,
  uploadKind = "document",
}: {
  bookingId: string;
  kind: string;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
  /** ข้อความบนปุ่ม — ช่องที่มีรูปแล้วใช้ "เปลี่ยนรูป" */
  buttonText?: string;
  /** ถามก่อนเปิดเลือกไฟล์ — ใช้ตอนจะทับรูปที่มีอยู่แล้ว */
  confirmText?: string;
  /** โฟลเดอร์ที่เก็บไฟล์ใน /api/upload */
  uploadKind?: "document" | "slip";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: File[]) {
    setBusy(true);
    setError(null);
    try {
      if (files.some((f) => !f.type.startsWith("image/"))) {
        throw new Error("ไฟล์ต้องเป็นรูปภาพ");
      }
      if (files.length > 6) {
        throw new Error("เลือกได้สูงสุด 6 รูปต่อครั้ง");
      }

      const source = files.length > 1 ? await stitchImages(files) : files[0];
      const upload = await shrinkImage(source, {
        // ภาพที่ต่อกันแล้วยาวมาก ถ้าจำกัดด้านยาวเท่ารูปเดี่ยว ตัวหนังสือจะเล็กจนอ่านไม่ออก
        maxEdge: files.length > 1 ? 1800 * files.length : 1800,
        quality: 0.85,
        targetBytes: files.length > 1 ? 2_500_000 : 700_000,
      });

      const form = new FormData();
      form.append("file", upload);
      form.append("kind", uploadKind);

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
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          inputRef.current?.click();
        }}
        title="เลือกได้หลายรูป ระบบจะรวมเป็นภาพเดียว"
        className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50"
      >
        {busy ? "กำลังอัป…" : buttonText}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label={`อัปโหลด${label}แทนลูกค้า`}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length) onPick(list);
        }}
      />
      {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
    </>
  );
}
