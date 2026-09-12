"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ช่องเซ็นด้วยนิ้วหรือเมาส์ แล้วอัปขึ้นเซิร์ฟเวอร์เป็นรูป PNG พื้นใส
 *
 * ใช้สองที่ — เจ้าของบริษัทเซ็นเก็บไว้ในบัญชีตัวเอง และลูกค้าเซ็นรับใบเสร็จ
 * บนมือถือของคนไปส่งรถ จึงต้องทำงานได้ทั้งนิ้วและเมาส์
 *
 * ปรับ canvas ตาม devicePixelRatio ไม่งั้นบนมือถือจอละเอียดลายเซ็นจะเบลอเป็นขั้นบันได
 */
export default function SignaturePad({
  onSaved,
  submit,
  label = "เซ็นชื่อในกรอบด้านล่าง",
  saving: savingProp,
  buttonText = "บันทึกลายเซ็น",
}: {
  /** ได้ URL ของรูปที่อัปเสร็จแล้ว — ผู้เรียกเอาไปบันทึกต่อเอง (ใช้คู่กับการอัปผ่าน /api/upload) */
  onSaved?: (url: string) => Promise<void> | void;
  /**
   * ส่งรูปเองทั้งหมด — ใช้ตอนคนเซ็นไม่ได้ล็อกอิน เช่นลูกค้าเซ็นบนมือถือคนส่งรถ
   * เพราะ /api/upload ต้องเป็นแอดมิน จึงต้องยิงไปที่ปลายทางที่ตรวจกุญแจงานแทน
   */
  submit?: (blob: Blob) => Promise<void>;
  label?: string;
  saving?: boolean;
  buttonText?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawing.current = true;
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!dirty.current) {
      dirty.current = true;
      setHasInk(true);
    }
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setHasInk(false);
    setError(null);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !dirty.current) return;

    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("แปลงรูปไม่สำเร็จ");

      if (submit) {
        await submit(blob);
        return;
      }

      const fd = new FormData();
      fd.append("file", new File([blob], "signature.png", { type: "image/png" }));
      fd.append("kind", "signature");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.error ?? "อัปโหลดไม่สำเร็จ");

      await onSaved?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกลายเซ็นไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || savingProp;

  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        // touch-none กันหน้าจอเลื่อนตามนิ้วตอนกำลังเซ็นบนมือถือ
        className="touch-none w-full h-40 rounded-xl border-2 border-dashed border-slate-300 bg-white cursor-crosshair"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={save}
          disabled={disabled || !hasInk}
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {busy ? "กำลังบันทึก…" : buttonText}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
        >
          ล้าง
        </button>
      </div>
    </div>
  );
}
