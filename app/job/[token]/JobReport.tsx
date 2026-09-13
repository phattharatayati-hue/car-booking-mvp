"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-resize";

type Props = {
  token: string;
  /** ปิดงานไปแล้วหรือยัง — ปิดแล้วยังส่งรูปเพิ่มได้ แต่ปุ่มปิดงานจะหายไป */
  doneAt: string | null;
  odometer: number | null;
  fuelLevel: string | null;
  photoCount: number;
  isPickup: boolean;
};

const FUEL_CHOICES = ["เต็มถัง", "3/4 ถัง", "ครึ่งถัง", "1/4 ถัง", "ใกล้หมด"];

/**
 * รายงานหน้างานของคนรับ-ส่งรถ
 *
 * ทุกอย่างยิงไปที่ /api/job/<token>/report ซึ่งผูกกับงานชิ้นนี้ชิ้นเดียว
 * ต่างจากการส่งเข้าแชท LINE ที่ระบบต้องเดาว่าเป็นของงานไหนแล้วเดาผิดได้
 */
export default function JobReport({
  token,
  doneAt,
  odometer,
  fuelLevel,
  photoCount,
  isPickup,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "photo" | "reading" | "done">(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [askDone, setAskDone] = useState(false);

  const [odo, setOdo] = useState(odometer != null ? String(odometer) : "");
  const [fuel, setFuel] = useState(fuelLevel ?? "");

  async function send(body: FormData, kind: "photo" | "reading" | "done") {
    setBusy(kind);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/job/${token}/report`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่");
        return null;
      }
      router.refresh();
      return data;
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาเช็คสัญญาณแล้วลองใหม่");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    // ส่งทีละรูป จะได้รู้ว่ารูปไหนพลาด และไม่ชน limit ขนาด request
    let ok = 0;
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("action", "photo");
      body.append("file", await shrinkImage(file, { maxEdge: 1600, targetBytes: 600_000 }));
      const data = await send(body, "photo");
      if (!data) break;
      ok++;
    }
    if (ok > 0) setNote(`ส่งรูปแล้ว ${ok} รูป`);
  }

  async function onSaveReading() {
    const body = new FormData();
    body.append("action", "reading");
    body.append("odometer", odo);
    body.append("fuelLevel", fuel);
    const data = await send(body, "reading");
    if (data) setNote("บันทึกสภาพรถแล้ว");
  }

  const doneMessage = isPickup
    ? "ปิดงานรับรถคืน\nสถานะการจองจะเปลี่ยนเป็น “เสร็จสิ้น”"
    : "ปิดงานส่งรถ";

  async function onDone() {
    setAskDone(false);

    const body = new FormData();
    body.append("action", "done");
    const data = await send(body, "done");
    if (data) setNote("ปิดงานเรียบร้อยแล้ว");
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 px-5 py-5 flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-slate-900">รายงานหน้างาน</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          ส่งจากหน้านี้เท่านั้น ระบบจะเก็บเข้างานนี้ให้ถูกใบเสมอ ·
          ส่งรูปเข้าแชท LINE ใช้ไม่ได้แล้ว
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-xl"
        >
          {error}
        </p>
      )}
      {note && !error && (
        <p
          role="status"
          className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl"
        >
          {note}
        </p>
      )}

      {/* รูปสภาพรถ */}
      <div>
        <label
          htmlFor="job-photos"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          รูปสภาพรถ
          {photoCount > 0 && (
            <span className="text-slate-400 font-normal"> · ส่งแล้ว {photoCount} รูป</span>
          )}
        </label>
        <input
          id="job-photos"
          type="file"
          accept="image/*"
          multiple
          disabled={busy !== null}
          onChange={(e) => {
            onPickPhotos(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
        <label
          htmlFor="job-photos"
          className={`btn w-full rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-700 cursor-pointer ${
            busy === "photo" ? "opacity-60 pointer-events-none" : "hover:bg-slate-50"
          }`}
        >
          {busy === "photo" ? "กำลังส่งรูป…" : "📷 ถ่ายรูป / เลือกจากเครื่อง"}
        </label>
        <p className="text-xs text-slate-400 mt-1.5">เลือกหลายรูปพร้อมกันได้</p>
      </div>

      {/* เลขไมล์ + น้ำมัน */}
      <div className="border-t border-slate-100 pt-5">
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor="job-odo" className="block text-sm font-medium text-slate-700 mb-1.5">
              เลขไมล์ (กม.)
            </label>
            <input
              id="job-odo"
              type="text"
              inputMode="numeric"
              value={odo}
              onChange={(e) => setOdo(e.target.value)}
              placeholder="45120"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="job-fuel" className="block text-sm font-medium text-slate-700 mb-1.5">
              ระดับน้ำมัน
            </label>
            <select
              id="job-fuel"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
            >
              <option value="">— ยังไม่ระบุ —</option>
              {FUEL_CHOICES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onSaveReading}
          disabled={busy !== null}
          className="btn w-full mt-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busy === "reading" ? "กำลังบันทึก…" : "บันทึกสภาพรถ"}
        </button>
      </div>

      {/* ปิดงาน */}
      <div className="border-t border-slate-100 pt-5">
        {doneAt ? (
          <p className="text-sm text-emerald-700 font-medium text-center">
            ✅ ปิดงานแล้ว — ส่งรูปเพิ่มได้อีกถ้าต้องการ
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setAskDone(true)}
            disabled={busy !== null}
            className="btn w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-600/25 disabled:opacity-60"
          >
            {busy === "done" ? "กำลังปิดงาน…" : "ปิดงานนี้"}
          </button>
        )}
      </div>
      <ConfirmDialog
        open={askDone}
        message={`${doneMessage}\n\nยืนยันหรือไม่?`}
        confirmText="ปิดงาน"
        onCancel={() => setAskDone(false)}
        onConfirm={onDone}
      />
    </section>
  );
}
