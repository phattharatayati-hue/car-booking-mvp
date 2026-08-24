export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllAfterHoursRates } from "@/lib/after-hours-server";
import {
  toMinuteOfDay,
  fromMinuteOfDay,
  isInRange,
  rangesOverlap,
} from "@/lib/pricing";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

async function saveRateAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const fee = Number(formData.get("fee"));
  const isActive = formData.get("isActive") === "on";

  if (!label || label.length > 40) redirect("/admin/after-hours?error=label");
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    redirect("/admin/after-hours?error=time");
  }
  if (!Number.isInteger(fee) || fee < 0 || fee > 100000) {
    redirect("/admin/after-hours?error=fee");
  }

  const startMinute = toMinuteOfDay(startTime);
  const endMinute = toMinuteOfDay(endTime);
  if (startMinute === endMinute) redirect("/admin/after-hours?error=same");

  // กันช่วงทับกัน — เทียบกับช่วงอื่นที่เปิดใช้งานอยู่
  if (isActive) {
    const others = await prisma.afterHoursRate.findMany({
      where: { isActive: true, ...(id ? { id: { not: id } } : {}) },
    });
    const clash = others.find((o) => rangesOverlap(o, { startMinute, endMinute }));
    if (clash) redirect("/admin/after-hours?error=overlap");
  }

  const data = { label, startMinute, endMinute, fee, isActive };

  if (id) {
    await prisma.afterHoursRate.update({ where: { id }, data });
  } else {
    await prisma.afterHoursRate.create({ data });
  }

  revalidatePath("/admin/after-hours");
  redirect("/admin/after-hours?ok=saved");
}

async function deleteRateAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) await prisma.afterHoursRate.delete({ where: { id } });

  revalidatePath("/admin/after-hours");
  redirect("/admin/after-hours?ok=deleted");
}

const ERRORS: Record<string, string> = {
  label: "ต้องตั้งชื่อช่วงเวลา และยาวไม่เกิน 40 ตัวอักษร",
  time: "รูปแบบเวลาต้องเป็น HH:mm เช่น 22:00",
  fee: "ค่าบริการต้องเป็นจำนวนเต็มไม่ติดลบ",
  same: "เวลาเริ่มกับเวลาสิ้นสุดต้องไม่เท่ากัน",
  overlap: "ช่วงเวลานี้ทับกับช่วงที่มีอยู่แล้ว — แก้ช่วงเดิมหรือปิดใช้งานก่อน",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function AfterHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rates = await getAllAfterHoursRates();

  // แถบ 24 ชั่วโมง — ให้เห็นภาพว่าช่วงไหนคิดเงิน ช่วงไหนฟรี
  const hours = Array.from({ length: 24 }, (_, h) => {
    const active = rates.filter((r) => r.isActive);
    let fee = 0;
    for (const r of active) {
      if (isInRange(h * 60 + 30, r) && r.fee > fee) fee = r.fee;
    }
    return { h, fee };
  });
  const maxFee = Math.max(1, ...hours.map((x) => x.fee));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ค่าบริการนอกเวลา</h1>
        <p className="text-slate-500 text-sm mt-1">
          ลูกค้าจองรับ-คืนรถได้ทุกเวลา ช่วงที่ตั้งไว้ที่นี่จะคิดค่าบริการเพิ่ม
          <strong className="text-slate-700"> คิดแยกทั้งตอนรับและตอนคืน</strong> เวลาที่ไม่อยู่ในช่วงใดเลยคือฟรี
        </p>
      </div>

      {ok && (
        <div className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          {ok === "deleted" ? "ลบช่วงเวลาแล้ว" : "บันทึกเรียบร้อยแล้ว"}
        </div>
      )}
      {error && ERRORS[error] && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {ERRORS[error]}
        </div>
      )}

      {/* แถบ 24 ชั่วโมง */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-3">ภาพรวมทั้งวัน</h2>
        <div className="flex gap-px rounded-lg overflow-hidden">
          {hours.map(({ h, fee }) => (
            <div
              key={h}
              className="flex-1 h-12 relative"
              style={{
                background:
                  fee === 0
                    ? "rgb(241 245 249)"
                    : `rgba(217, 119, 6, ${0.25 + 0.6 * (fee / maxFee)})`,
              }}
              title={`${String(h).padStart(2, "0")}:00 — ${
                fee === 0 ? "ฟรี" : `+${fee.toLocaleString()} บาท`
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          เทาคือฟรี · ยิ่งเข้มยิ่งแพง (เอาเมาส์ชี้เพื่อดูราคาแต่ละชั่วโมง)
        </p>
      </div>

      {/* รายการช่วงเวลา */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">ช่วงเวลาที่คิดค่าบริการ</h2>
        </div>

        {rates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            ยังไม่มีช่วงเวลา — ตอนนี้รับ-คืนรถทุกเวลาไม่มีค่าบริการเพิ่ม
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rates.map((r) => (
              <form
                key={r.id}
                action={saveRateAction}
                className="px-5 py-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
              >
                <input type="hidden" name="id" value={r.id} />
                <div>
                  <label className={labelClass} htmlFor={`label-${r.id}`}>
                    ชื่อช่วง
                  </label>
                  <input
                    id={`label-${r.id}`}
                    name="label"
                    defaultValue={r.label}
                    maxLength={40}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`start-${r.id}`}>
                    เริ่ม
                  </label>
                  <input
                    id={`start-${r.id}`}
                    name="startTime"
                    type="time"
                    step={1800}
                    defaultValue={fromMinuteOfDay(r.startMinute)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`end-${r.id}`}>
                    ถึง
                  </label>
                  <input
                    id={`end-${r.id}`}
                    name="endTime"
                    type="time"
                    step={1800}
                    defaultValue={fromMinuteOfDay(r.endMinute)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`fee-${r.id}`}>
                    บาท
                  </label>
                  <input
                    id={`fee-${r.id}`}
                    name="fee"
                    type="number"
                    min={0}
                    defaultValue={r.fee}
                    required
                    className={`${inputClass} w-24`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600 mr-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={r.isActive}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    เปิด
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  >
                    บันทึก
                  </button>
                  <button
                    type="submit"
                    formAction={deleteRateAction}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 text-sm transition-colors"
                  >
                    ลบ
                  </button>
                </div>

                {r.endMinute <= r.startMinute && (
                  <p className="sm:col-span-5 text-xs text-slate-500 -mt-1">
                    ช่วงนี้ข้ามเที่ยงคืน ({fromMinuteOfDay(r.startMinute)} ของวันหนึ่ง ถึง{" "}
                    {fromMinuteOfDay(r.endMinute)} ของวันถัดไป)
                  </p>
                )}
              </form>
            ))}
          </div>
        )}
      </div>

      {/* เพิ่มช่วงใหม่ */}
      <form
        action={saveRateAction}
        className="mt-5 bg-white rounded-2xl border border-slate-200 p-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
      >
        <div className="sm:col-span-5">
          <h2 className="font-semibold text-slate-900">เพิ่มช่วงเวลาใหม่</h2>
          <p className="text-sm text-slate-500 mt-1">
            ใส่เวลาเริ่มมากกว่าเวลาสิ้นสุดได้ ถ้าเป็นช่วงข้ามเที่ยงคืน เช่น 22:00 ถึง 05:00
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor="new-label">ชื่อช่วง</label>
          <input
            id="new-label"
            name="label"
            placeholder="เช่น ช่วงดึก"
            maxLength={40}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-start">เริ่ม</label>
          <input id="new-start" name="startTime" type="time" step={1800} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-end">ถึง</label>
          <input id="new-end" name="endTime" type="time" step={1800} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-fee">บาท</label>
          <input
            id="new-fee"
            name="fee"
            type="number"
            min={0}
            defaultValue={100}
            required
            className={`${inputClass} w-24`}
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="hidden" name="isActive" value="on" />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
          >
            เพิ่ม
          </button>
        </div>
      </form>

      <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <p className="text-xs text-slate-500 leading-relaxed">
          ค่าบริการคิดตามเวลาที่ลูกค้าเลือก โดยดูเวลารับและเวลาคืนแยกกันแล้วบวกรวม
          เช่น รับ 23:00 (+200) และคืน 06:00 (+100) จะคิดเพิ่มทั้งหมด 300 บาท
          ระบบแสดงยอดนี้ให้ลูกค้าเห็นตั้งแต่ก่อนกดจอง ทั้งบนเว็บ ใน LIFF และในแชท LINE
        </p>
      </div>
    </div>
  );
}
