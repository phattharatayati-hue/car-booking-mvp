"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default function AddCarForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      let photoUrl: string | null = null;

      if (photo) {
        const up = new FormData();
        up.append("file", await shrinkImage(photo, { maxEdge: 1600 }));
        up.append("kind", "car");
        const upRes = await fetch("/api/upload", { method: "POST", body: up });
        const upData = await upRes.json().catch(() => null);
        if (!upRes.ok || !upData?.url) {
          throw new Error(upData?.error ?? (upRes.status === 413
            ? "ไฟล์ใหญ่เกินไป กรุณาย่อรูปหรือถ่ายใหม่ด้วยความละเอียดต่ำลง"
            : `อัปโหลดรูปไม่สำเร็จ (${upRes.status})`));
        }
        photoUrl = upData.url;
      }

      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          brand: data.get("brand"),
          licensePlate: data.get("licensePlate"),
          pricePerDay: data.get("pricePerDay"),
          source: data.get("source"),
          photoUrl,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? `เพิ่มรถไม่สำเร็จ (${res.status})`);
      }

      form.reset();
      setPhoto(null);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        เพิ่มรถ
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 w-full"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">เพิ่มรถใหม่</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-slate-400 hover:text-slate-700 text-sm"
        >
          ยกเลิก
        </button>
      </div>

      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-5">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="brand">ยี่ห้อ</label>
          <input id="brand" name="brand" required placeholder="Toyota" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="name">รุ่นรถ</label>
          <input id="name" name="name" required placeholder="Yaris Ativ" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="licensePlate">ทะเบียน</label>
          <input
            id="licensePlate"
            name="licensePlate"
            required
            placeholder="กข 1234 เชียงใหม่"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="pricePerDay">ราคา/วัน (บาท)</label>
          <input
            id="pricePerDay"
            name="pricePerDay"
            type="number"
            min="0"
            required
            placeholder="1200"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="source">แหล่งที่มา</label>
          <select id="source" name="source" className={inputClass}>
            <option value="OWN">รถของเรา</option>
            <option value="PARTNER">รถยืมพาร์ทเนอร์</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="photo">รูปรถ (ถ้ามี)</label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
      >
        {submitting ? "กำลังบันทึก..." : "บันทึกรถ"}
      </button>
    </form>
  );
}
