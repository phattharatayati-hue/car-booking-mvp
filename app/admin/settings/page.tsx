export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getSettings,
  SETTINGS_ID,
  splitMinutes,
  formatMinutesBefore,
  REMINDER_MIN_MINUTES,
  REMINDER_MAX_MINUTES,
} from "@/lib/settings";

async function saveSettingsAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const on = formData.get("returnReminderOn") === "on";
  const leadHours = Number(formData.get("returnReminderLeadHours"));
  const leadMinutes = Number(formData.get("returnReminderLeadMinutes"));
  const openHour = Number(formData.get("openHour"));
  const closeHour = Number(formData.get("closeHour"));
  const serviceNote = String(formData.get("serviceNote") ?? "").trim();
  const bookingFee = Number(formData.get("bookingFee"));
  const securityDeposit = Number(formData.get("securityDeposit"));

  if (
    !Number.isInteger(leadHours) ||
    !Number.isInteger(leadMinutes) ||
    leadHours < 0 ||
    leadMinutes < 0 ||
    leadMinutes > 59
  ) {
    redirect("/admin/settings?error=lead");
  }
  const minutesBefore = leadHours * 60 + leadMinutes;
  if (minutesBefore < REMINDER_MIN_MINUTES || minutesBefore > REMINDER_MAX_MINUTES) {
    redirect("/admin/settings?error=leadRange");
  }
  if (
    !Number.isInteger(openHour) ||
    !Number.isInteger(closeHour) ||
    openHour < 0 ||
    closeHour > 23 ||
    openHour >= closeHour
  ) {
    redirect("/admin/settings?error=hours");
  }
  if (serviceNote.length > 500) {
    redirect("/admin/settings?error=note");
  }
  if (
    !Number.isInteger(bookingFee) ||
    !Number.isInteger(securityDeposit) ||
    bookingFee < 0 ||
    securityDeposit < 0
  ) {
    redirect("/admin/settings?error=money");
  }

  const data = {
    returnReminderOn: on,
    returnReminderMinutesBefore: minutesBefore,
    openHour,
    closeHour,
    bookingFee,
    securityDeposit,
    serviceNote,
  };

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=saved");
}

const ERRORS: Record<string, string> = {
  lead: "เวลาแจ้งเตือนล่วงหน้าไม่ถูกต้อง (นาทีต้องอยู่ระหว่าง 0-59)",
  leadRange: "เวลาแจ้งเตือนล่วงหน้าต้องอยู่ระหว่าง 5 นาที ถึง 7 วัน",
  hours: "เวลาเปิดต้องน้อยกว่าเวลาปิด",
  note: "เงื่อนไขการให้บริการยาวเกิน 500 ตัวอักษร",
  money: "ค่าจองและเงินประกันต้องเป็นตัวเลขจำนวนเต็มไม่ติดลบ",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const settings = await getSettings();
  const lead = splitMinutes(settings.returnReminderMinutesBefore);

  const pendingCount = await prisma.booking.count({
    where: { status: "CONFIRMED", returnReminderSentAt: null },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
        <p className="text-slate-500 text-sm mt-1">
          เวลาให้บริการ เงื่อนไขการเช่า และการแจ้งเตือนทาง LINE
        </p>
      </div>

      {ok && (
        <div className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          บันทึกการตั้งค่าเรียบร้อยแล้ว
        </div>
      )}
      {error && ERRORS[error] && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {ERRORS[error]}
        </div>
      )}

      <form
        action={saveSettingsAction}
        className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5"
      >
        <div>
          <h2 className="font-semibold text-slate-900">เวลารับ-คืนรถ</h2>
          <p className="text-sm text-slate-500 mt-1">
            ลูกค้าจะเลือกเวลารับ-คืนรถได้เฉพาะในช่วงนี้ ทั้งบนเว็บและใน LINE
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="openHour">เปิดเวลา</label>
            <select
              id="openHour"
              name="openHour"
              defaultValue={String(settings.openHour)}
              className={inputClass}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00 น.
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="closeHour">ปิดเวลา</label>
            <select
              id="closeHour"
              name="closeHour"
              defaultValue={String(settings.closeHour)}
              className={inputClass}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00 น.
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100">
          <h2 className="font-semibold text-slate-900">ค่าจองและเงินประกัน</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            ค่าจองคือยอดที่ลูกค้าโอนล่วงหน้าเพื่อกันวัน — ระบบจะใช้ยอดนี้ทั้งบนเว็บและใน LINE
            ส่วนเงินประกันเก็บวันรับรถ ระบบแค่แจ้งให้ลูกค้าทราบ ไม่ได้เก็บผ่านเว็บ
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="bookingFee">ค่าจอง (บาท)</label>
              <input
                id="bookingFee"
                name="bookingFee"
                type="number"
                min="0"
                required
                defaultValue={settings.bookingFee}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="securityDeposit">
                เงินประกันรถ (บาท)
              </label>
              <input
                id="securityDeposit"
                name="securityDeposit"
                type="number"
                min="0"
                required
                defaultValue={settings.securityDeposit}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100">
          <h2 className="font-semibold text-slate-900">เงื่อนไขการให้บริการ</h2>
          <p className="text-sm text-slate-500 mt-1 mb-3">
            ข้อความนี้จะขึ้นในหน้ารถทั้งหมด หน้าจอง และตอนจองผ่าน LINE
            — เว้นว่างถ้าไม่ต้องการแสดง
          </p>
          <textarea
            id="serviceNote"
            name="serviceNote"
            rows={3}
            maxLength={500}
            defaultValue={settings.serviceNote}
            placeholder="เช่น รับรถได้เฉพาะในเขตอำเภอเมืองเชียงใหม่"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>

        <div className="pt-5 border-t border-slate-100">
          <h2 className="font-semibold text-slate-900">แจ้งเตือนก่อนคืนรถ</h2>
          <p className="text-sm text-slate-500 mt-1">
            นับจาก<strong>เวลานัดคืนรถของการจองนั้น</strong> ถอยหลังตามที่ตั้งไว้
            ส่งทาง LINE ให้ลูกค้าที่ผูกบัญชีไว้ เฉพาะการจองที่ยืนยันแล้ว และส่งครั้งเดียวต่อการจอง
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="returnReminderOn"
            defaultChecked={settings.returnReminderOn}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
          />
          <span className="text-sm font-medium text-slate-700">เปิดใช้งานการแจ้งเตือน</span>
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="returnReminderLeadHours">
              เตือนล่วงหน้า (ชั่วโมง)
            </label>
            <input
              id="returnReminderLeadHours"
              name="returnReminderLeadHours"
              type="number"
              min={0}
              max={168}
              required
              defaultValue={lead.hours}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="returnReminderLeadMinutes">
              และอีก (นาที)
            </label>
            <input
              id="returnReminderLeadMinutes"
              name="returnReminderLeadMinutes"
              type="number"
              min={0}
              max={59}
              required
              defaultValue={lead.minutes}
              className={inputClass}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500 -mt-2">
          ตอนนี้ตั้งไว้ <strong>{formatMinutesBefore(settings.returnReminderMinutesBefore)}</strong>{" "}
          ก่อนเวลานัดคืนรถของการจองแต่ละรายการ · ตั้งได้ตั้งแต่ 5 นาที ถึง 7 วัน
        </p>

        <button
          type="submit"
          className="mt-1 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
        >
          บันทึกการตั้งค่า
        </button>
      </form>

      <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h2 className="font-semibold text-amber-900 text-sm mb-2">
          ความแม่นของเวลาเตือน ขึ้นกับความถี่ของ cron
        </h2>
        <p className="text-sm text-amber-900/90 leading-relaxed">
          ระบบจะเตือนได้ตรงเวลาก็ต่อเมื่อมี cron ยิงเข้ามาถี่ (แนะนำทุก 15 นาที)
          แต่ Vercel แพลน Hobby รันงานตามเวลาได้<strong>วันละครั้งเท่านั้น</strong> (ตอนนี้ราว 09:00 น.)
          ฉะนั้นบนแพลนนี้จะเตือนได้เฉพาะรถที่ครบกำหนดคืนใกล้รอบนั้นพอดี
        </p>
        <p className="text-sm text-amber-900/90 leading-relaxed mt-2">
          วิธีทำให้แม่น เลือกอย่างใดอย่างหนึ่ง — อัปเป็น <strong>Vercel Pro</strong> แล้วแก้{" "}
          <code className="text-xs">vercel.json</code> เป็น <code className="text-xs">*/15 * * * *</code>{" "}
          หรือใช้ cron ภายนอกฟรี (เช่น cron-job.org) ตั้งยิงมาที่{" "}
          <code className="text-xs">/api/cron/reminders</code> ทุก 15 นาที
          พร้อมส่ง header <code className="text-xs">Authorization: Bearer &lt;CRON_SECRET&gt;</code>
        </p>
      </div>

      <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-1">สถานะปัจจุบัน</h2>
        <p className="text-sm text-slate-600">
          การจองที่ยืนยันแล้วและยังไม่ได้ส่งเตือน: {pendingCount} รายการ
        </p>
      </div>
    </div>
  );
}
