export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCarRates } from "@/lib/car-rates-server";
import {
  dateRangesOverlap,
  daysBetweenInclusive,
  formatRateRange,
  formatThaiDateStr,
  type CarRateView,
} from "@/lib/car-rates";

/** "YYYY-MM-DD" → เที่ยงคืนเวลาไทยของวันนั้น */
function bangkokMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function saveRateAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const carId = String(formData.get("carId") ?? "");
  const id = String(formData.get("id") ?? "");
  const kind = String(formData.get("kind") ?? "PRICE") === "BLOCK" ? "BLOCK" : "PRICE";
  const label = String(formData.get("label") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const priceRaw = String(formData.get("pricePerDay") ?? "").trim();

  const back = (q: string) => redirect(`/admin/cars/${carId}/rates?${q}`);

  if (!carId || !label || !DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    back("error=invalid");
  }
  if (endDate < startDate) {
    back("error=order");
  }

  let pricePerDay: number | null = null;
  if (kind === "PRICE") {
    const n = Number(priceRaw);
    if (!Number.isInteger(n) || n <= 0) back("error=price");
    pricePerDay = n;
  }

  // ช่วงราคาห้ามทับกันเอง — ช่วงปิดรับจองทับได้
  if (kind === "PRICE") {
    const existing = await getCarRates(carId);
    const clash = existing.find(
      (r) =>
        r.id !== id &&
        r.kind === "PRICE" &&
        dateRangesOverlap(startDate, endDate, r.startDate, r.endDate)
    );
    if (clash) {
      back(`error=overlap&with=${encodeURIComponent(`${clash.label} (${formatRateRange(clash)})`)}`);
    }
  }

  const data = {
    carId,
    kind: kind as "PRICE" | "BLOCK",
    label,
    startDate: bangkokMidnight(startDate),
    endDate: bangkokMidnight(endDate),
    pricePerDay,
  };

  if (id) {
    await prisma.carRate.update({ where: { id }, data });
  } else {
    await prisma.carRate.create({ data });
  }

  revalidatePath(`/admin/cars/${carId}/rates`);
  redirect(`/admin/cars/${carId}/rates?ok=${id ? "updated" : "added"}`);
}

async function deleteRateAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const carId = String(formData.get("carId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.carRate.delete({ where: { id } });

  revalidatePath(`/admin/cars/${carId}/rates`);
  redirect(`/admin/cars/${carId}/rates?ok=deleted`);
}

const MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  added: { text: "เพิ่มช่วงเรียบร้อยแล้ว", tone: "ok" },
  updated: { text: "แก้ไขช่วงเรียบร้อยแล้ว", tone: "ok" },
  deleted: { text: "ลบช่วงเรียบร้อยแล้ว", tone: "ok" },
  invalid: { text: "กรอกชื่อช่วงและวันที่ให้ครบ", tone: "error" },
  order: { text: "วันสุดท้ายต้องไม่อยู่ก่อนวันแรก", tone: "error" },
  price: { text: "ราคาต่อวันต้องเป็นจำนวนเต็มมากกว่า 0", tone: "error" },
  overlap: { text: "ช่วงนี้ทับกับช่วงราคาที่มีอยู่แล้ว", tone: "error" },
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

function RateForm({
  carId,
  rate,
  basePrice,
}: {
  carId: string;
  rate?: CarRateView;
  basePrice: number;
}) {
  const isEdit = Boolean(rate);
  const kind = rate?.kind ?? "PRICE";

  return (
    <form
      action={saveRateAction}
      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3"
    >
      <input type="hidden" name="carId" value={carId} />
      {rate && <input type="hidden" name="id" value={rate.id} />}

      <p className="font-semibold text-slate-900 text-sm">
        {isEdit ? "แก้ไขช่วง" : "เพิ่มช่วงใหม่"}
      </p>

      <div>
        <label className={labelClass}>ประเภท</label>
        <select name="kind" defaultValue={kind} className={inputClass}>
          <option value="PRICE">ตั้งราคาต่อวันใหม่</option>
          <option value="BLOCK">ปิดรับจอง</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>ชื่อช่วง</label>
        <input
          name="label"
          required
          defaultValue={rate?.label ?? ""}
          placeholder="เช่น สงกรานต์ 2569 หรือ ใช้งานบริษัท"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>วันแรก</label>
          <input
            type="date"
            name="startDate"
            required
            defaultValue={rate?.startDate ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>วันสุดท้าย (นับรวมด้วย)</label>
          <input
            type="date"
            name="endDate"
            required
            defaultValue={rate?.endDate ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          ราคาต่อวัน (บาท) — ใส่เฉพาะเมื่อเลือก “ตั้งราคาต่อวันใหม่”
        </label>
        <input
          type="number"
          name="pricePerDay"
          min={1}
          step={1}
          defaultValue={rate?.pricePerDay ?? ""}
          placeholder={String(basePrice)}
          className={inputClass}
        />
        <p className="text-xs text-slate-500 mt-1">
          กรอกราคาเต็มต่อวัน ไม่ใช่ส่วนต่าง · ราคาปกติของรถคันนี้คือ{" "}
          {basePrice.toLocaleString()} บาท
        </p>
      </div>

      <button className="mt-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-2.5 transition-colors">
        {isEdit ? "บันทึกการแก้ไข" : "เพิ่มช่วง"}
      </button>
    </form>
  );
}

export default async function CarRatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; with?: string; edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { ok, error, with: withLabel, edit } = await searchParams;

  const car = await prisma.car.findUnique({ where: { id } });
  if (!car) notFound();

  const rates = await getCarRates(id);
  const editing = edit ? rates.find((r) => r.id === edit) : undefined;

  const flash = MESSAGES[ok ?? ""] ?? MESSAGES[error ?? ""];
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <div className="max-w-5xl">
      <nav className="text-sm text-slate-500 mb-4">
        <Link href="/admin/cars" className="hover:text-blue-700">จัดการรถ</Link>
        <span className="mx-2">/</span>
        <Link href={`/admin/cars/${id}`} className="hover:text-blue-700">
          {car.brand} {car.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">ราคาตามช่วงวัน</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ราคาตามช่วงวัน</h1>
        <p className="text-slate-500 text-sm mt-1">
          {car.brand} {car.name} · ทะเบียน {car.licensePlate} · ราคาปกติ{" "}
          {car.pricePerDay.toLocaleString()} บาท/วัน
        </p>
      </div>

      {flash && (
        <div
          className={`mb-6 text-sm px-4 py-3 rounded-xl border ${
            flash.tone === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {flash.text}
          {error === "overlap" && withLabel ? ` — ทับกับ ${withLabel} แก้วันที่ หรือลบช่วงเดิมก่อน` : ""}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 text-sm text-blue-900/90 leading-relaxed">
        <p className="font-semibold text-blue-900 mb-1">ระบบคิดราคาอย่างไร</p>
        คิดทีละวัน วันไหนตกอยู่ในช่วงราคา ใช้ราคาของช่วงนั้น วันที่ไม่อยู่ในช่วงไหนเลยใช้ราคาปกติของรถ
        แล้วบวกรวมทั้งหมด · ช่วงราคาห้ามทับกันเอง ส่วนช่วงปิดรับจองทับได้และชนะเสมอ ·
        การจองที่ยืนยันไปแล้วใช้ราคาที่บันทึกไว้ตอนจอง แก้ตรงนี้ไม่กระทบบิลเก่า
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {rates.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              ยังไม่มีช่วงราคาพิเศษ — รถคันนี้คิด {car.pricePerDay.toLocaleString()} บาท/วัน ทุกวัน
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">ช่วง</th>
                  <th className="px-5 py-3 font-medium">วันที่</th>
                  <th className="px-5 py-3 font-medium text-right">ราคา/วัน</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => {
                  const days = daysBetweenInclusive(r.startDate, r.endDate);
                  const past = r.endDate < todayStr;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-50 last:border-0 ${past ? "opacity-50" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border me-2 ${
                            r.kind === "BLOCK"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {r.kind === "BLOCK" ? "ปิดรับจอง" : "ราคา"}
                        </span>
                        <span className="font-medium text-slate-900">{r.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatRateRange(r)}
                        <span className="block text-xs text-slate-400">
                          {days} วัน{past ? " · ผ่านไปแล้ว" : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                        {r.kind === "BLOCK" ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : (
                          r.pricePerDay?.toLocaleString()
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/cars/${id}/rates?edit=${r.id}`}
                          className="text-slate-500 hover:text-blue-700 me-3"
                        >
                          แก้ไข
                        </Link>
                        <form action={deleteRateAction} className="inline">
                          <input type="hidden" name="carId" value={id} />
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-slate-500 hover:text-red-600">ลบ</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <RateForm carId={id} rate={editing} basePrice={car.pricePerDay} />
          {editing && (
            <Link
              href={`/admin/cars/${id}/rates`}
              className="text-center text-sm text-slate-500 hover:text-slate-900"
            >
              ยกเลิกการแก้ไข — กลับไปเพิ่มช่วงใหม่
            </Link>
          )}
          <p className="text-xs text-slate-500 leading-relaxed px-1">
            ตัวอย่าง: ตั้ง {formatThaiDateStr(`${new Date().getFullYear() + 1}-04-13`)} ถึง{" "}
            {formatThaiDateStr(`${new Date().getFullYear() + 1}-04-16`)} วันละ 1,800 บาท
            คือ 4 วัน รวม 7,200 บาท
          </p>
        </div>
      </div>
    </div>
  );
}
