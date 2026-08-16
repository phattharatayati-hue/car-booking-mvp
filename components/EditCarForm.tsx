"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export type CarForEdit = {
  id: string;
  name: string;
  brand: string;
  licensePlate: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
  status: string;
  bookingCount: number;
};

export default function EditCarForm({ car }: { car: CarForEdit }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const data = new FormData(e.currentTarget);

    try {
      let photoUrl: string | undefined;

      if (photo) {
        const up = new FormData();
        up.append("file", photo);
        up.append("kind", "car");
        const upRes = await fetch("/api/upload", { method: "POST", body: up });
        const upData = await upRes.json().catch(() => null);
        if (!upRes.ok || !upData?.url) {
          throw new Error(upData?.error ?? `อัปโหลดรูปไม่สำเร็จ (${upRes.status})`);
        }
        photoUrl = upData.url;
      }

      const res = await fetch(`/api/cars/${car.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          brand: data.get("brand"),
          licensePlate: data.get("licensePlate"),
          pricePerDay: data.get("pricePerDay"),
          source: data.get("source"),
          status: data.get("status"),
          ...(photoUrl ? { photoUrl } : {}),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? `บันทึกไม่สำเร็จ (${res.status})`);
      }

      setMessage("บันทึกเรียบร้อยแล้ว");
      setPhoto(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/cars/${car.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? `ลบไม่สำเร็จ (${res.status})`);
      }
      router.push("/admin/cars");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {message && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="brand">ยี่ห้อ</label>
            <input id="brand" name="brand" required defaultValue={car.brand} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="name">รุ่นรถ</label>
            <input id="name" name="name" required defaultValue={car.name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="licensePlate">ทะเบียน</label>
            <input
              id="licensePlate"
              name="licensePlate"
              required
              defaultValue={car.licensePlate}
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
              defaultValue={car.pricePerDay}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="source">แหล่งที่มา</label>
            <select id="source" name="source" defaultValue={car.source} className={inputClass}>
              <option value="OWN">รถของเรา</option>
              <option value="PARTNER">รถยืมพาร์ทเนอร์</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="status">สถานะ</label>
            <select id="status" name="status" defaultValue={car.status} className={inputClass}>
              <option value="AVAILABLE">ว่าง (เปิดให้จอง)</option>
              <option value="UNAVAILABLE">ปิดใช้งาน</option>
            </select>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <span className={labelClass}>รูปรถ</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              {car.photoUrl ? (
                <Image src={car.photoUrl} alt={car.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full grid place-items-center text-xs text-slate-400">
                  ไม่มีรูป
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
            />
          </div>
          {photo && (
            <p className="text-xs text-slate-500 mt-2">
              เลือกรูปใหม่แล้ว — กดบันทึกเพื่อเปลี่ยน
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
        </button>
      </form>

      {/* โซนอันตราย */}
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-1">ลบรถคันนี้</h2>
        {car.bookingCount > 0 ? (
          <p className="text-sm text-slate-600">
            รถคันนี้มีประวัติการจอง {car.bookingCount} รายการ จึงลบไม่ได้
            — ถ้าไม่ต้องการให้ลูกค้าจองแล้ว ให้เปลี่ยนสถานะเป็น “ปิดใช้งาน” ด้านบนแทน
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">
              ลบแล้วกู้คืนไม่ได้ รถคันนี้ยังไม่มีประวัติการจอง จึงลบได้อย่างปลอดภัย
            </p>
            {confirmDelete ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {deleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold transition-colors"
              >
                ลบรถคันนี้
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
