export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireDev } from "@/lib/roles";
import { audit } from "@/lib/audit";
import {
  getSettings,
  SETTINGS_ID,
  splitMinutes,
  formatMinutesBefore,
  REMINDER_MIN_MINUTES,
  REMINDER_MAX_MINUTES,
} from "@/lib/settings";
import AdminTabs from "@/components/AdminTabs";
import { SETTINGS_TABS } from "@/components/adminTabSets";
import { lineLoginReady, callbackUrl } from "@/lib/line-login";

async function saveSettingsAction(formData: FormData) {
  "use server";
  await requireDev();

  const on = formData.get("returnReminderOn") === "on";
  const leadHours = Number(formData.get("returnReminderLeadHours"));
  const leadMinutes = Number(formData.get("returnReminderLeadMinutes"));
  const serviceNote = String(formData.get("serviceNote") ?? "").trim();
  const bookingFee = Number(formData.get("bookingFee"));
  const minLeadHours = Number(formData.get("minLeadHours"));
  const securityDeposit = Number(formData.get("securityDeposit"));
  const lateHourlyFee = Number(formData.get("lateHourlyFee"));
  const lateRoundUpHours = Number(formData.get("lateRoundUpHours"));
  const lateGraceMinutes = Number(formData.get("lateGraceMinutes"));
  const holdMinutes = Number(formData.get("holdMinutes"));
  const unpaidDigestOn = formData.get("unpaidDigestOn") === "on";

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
  if (
    !Number.isInteger(lateHourlyFee) ||
    lateHourlyFee < 0 ||
    lateHourlyFee > 100000 ||
    !Number.isInteger(lateGraceMinutes) ||
    lateGraceMinutes < 0 ||
    lateGraceMinutes > 720
  ) {
    redirect("/admin/settings?error=late");
  }
  if (!Number.isInteger(lateRoundUpHours) || lateRoundUpHours < 1 || lateRoundUpHours > 24) {
    redirect("/admin/settings?error=lateHours");
  }
  // เกิน 30 วันแทบไม่มีใครจองล่วงหน้าขนาดนั้น ถ้าใส่เกินน่าจะพิมพ์ผิดมากกว่าตั้งใจ
  if (!Number.isInteger(minLeadHours) || minLeadHours < 0 || minLeadHours > 720) {
    redirect("/admin/settings?error=lead24");
  }
  // กันคิวนานเกินวันเดียวไม่สมเหตุผล เพราะจุดประสงค์คือปล่อยคิวให้คนอื่นเร็ว ๆ
  if (!Number.isInteger(holdMinutes) || holdMinutes < 0 || holdMinutes > 1440) {
    redirect("/admin/settings?error=hold");
  }
  // ผ่อนปรนต้องน้อยกว่าจุดที่ปัดเป็นวัน ไม่งั้นจะไม่มีช่วงคิดค่าเลทเลย
  if (lateGraceMinutes >= lateRoundUpHours * 60) {
    redirect("/admin/settings?error=lateGrace");
  }

  const data = {
    returnReminderOn: on,
    returnReminderMinutesBefore: minutesBefore,
    bookingFee,
    minLeadHours,
    securityDeposit,
    serviceNote,
    lateHourlyFee,
    lateRoundUpHours,
    lateGraceMinutes,
    holdMinutes,
    unpaidDigestOn,
  };

  const before = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  // เก็บเฉพาะช่องที่ค่าเปลี่ยนจริง จะได้อ่านย้อนหลังง่าย
  const changes: string[] = [];
  if (before) {
    if (before.returnReminderOn !== on) {
      changes.push(`แจ้งเตือนคืนรถ: ${before.returnReminderOn ? "เปิด" : "ปิด"} → ${on ? "เปิด" : "ปิด"}`);
    }
    if (before.returnReminderMinutesBefore !== minutesBefore) {
      changes.push(`ล่วงหน้า: ${before.returnReminderMinutesBefore} → ${minutesBefore} นาที`);
    }
    if (before.bookingFee !== bookingFee) {
      changes.push(`ค่าจอง: ${before.bookingFee} → ${bookingFee} บาท`);
    }
    if (before.holdMinutes !== holdMinutes) {
      changes.push(`กันคิวรอสลิป: ${before.holdMinutes} → ${holdMinutes} นาที`);
    }
    if (before.unpaidDigestOn !== unpaidDigestOn) {
      changes.push(
        `สรุปใบที่ยังไม่โอน: ${before.unpaidDigestOn ? "เปิด" : "ปิด"} → ${unpaidDigestOn ? "เปิด" : "ปิด"}`
      );
    }
    if (before.minLeadHours !== minLeadHours) {
      changes.push(`ต้องจองล่วงหน้า: ${before.minLeadHours} → ${minLeadHours} ชม.`);
    }
    if (before.securityDeposit !== securityDeposit) {
      changes.push(`เงินประกัน: ${before.securityDeposit} → ${securityDeposit} บาท`);
    }
    if ((before.serviceNote ?? "") !== serviceNote) {
      changes.push("แก้เงื่อนไขการให้บริการ");
    }
    if (before.lateHourlyFee !== lateHourlyFee) {
      changes.push(`ค่าเลทต่อชั่วโมง: ${before.lateHourlyFee} → ${lateHourlyFee} บาท`);
    }
    if (before.lateRoundUpHours !== lateRoundUpHours) {
      changes.push(
        `ปัดเป็นวันเมื่อเลทถึง: ${before.lateRoundUpHours} → ${lateRoundUpHours} ชม.`
      );
    }
    if (before.lateGraceMinutes !== lateGraceMinutes) {
      changes.push(`ผ่อนปรน: ${before.lateGraceMinutes} → ${lateGraceMinutes} นาที`);
    }
  } else {
    changes.push("สร้างค่าตั้งต้นของระบบ");
  }

  /* เขียนประวัติเฉพาะตอนมีค่าเปลี่ยนจริง
     กด Save โดยไม่แก้อะไรแล้วยังเขียน log ทำให้รายการที่มีความหมายถูกกลบ */
  if (changes.length > 0) {
    await audit({
      action: "settings.save",
      summary: `บันทึกตั้งค่าระบบ — ${changes.length} รายการ`,
      entity: "settings",
      entityId: SETTINGS_ID,
      detail: changes.join(" · "),
    });
  }

  revalidatePath("/admin/settings");
  redirect(`/admin/settings?ok=${changes.length > 0 ? "saved" : "nochange"}`);
}

const ERRORS: Record<string, string> = {
  lead: "เวลาแจ้งเตือนล่วงหน้าไม่ถูกต้อง (นาทีต้องอยู่ระหว่าง 0-59)",
  leadRange: "เวลาแจ้งเตือนล่วงหน้าต้องอยู่ระหว่าง 5 นาที ถึง 7 วัน",
  note: "เงื่อนไขการให้บริการยาวเกิน 500 ตัวอักษร",
  money: "ค่าจองและเงินประกันต้องเป็นตัวเลขจำนวนเต็มไม่ติดลบ",
  late: "ค่าเลทต่อชั่วโมงและช่วงผ่อนปรนต้องเป็นจำนวนเต็มไม่ติดลบ",
  lateHours: "จุดที่ปัดเป็นวันต้องอยู่ระหว่าง 1-24 ชั่วโมง",
  lead24: "เวลาจองล่วงหน้าต้องเป็นจำนวนเต็ม 0-720 ชั่วโมง (0 = ไม่บังคับ)",
  hold: "เวลากันคิวรอสลิปต้องเป็นจำนวนเต็ม 0-1440 นาที (0 = ไม่ยกเลิกเอง)",
  lateGrace: "ช่วงผ่อนปรนต้องน้อยกว่าจุดที่ปัดเป็นวัน ไม่งั้นจะไม่มีช่วงคิดค่าเลท",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireDev();

  const { ok, error } = await searchParams;
  const settings = await getSettings();
  const lead = splitMinutes(settings.returnReminderMinutesBefore);

  const pendingCount = await prisma.booking.count({
    where: { status: "CONFIRMED", returnReminderSentAt: null },
  });

  const loginReady = lineLoginReady();
  const cbUrl = callbackUrl();
  const ENV_CHECKS = [
    { name: "LINE_LOGIN_CHANNEL_ID", ok: Boolean(process.env.LINE_LOGIN_CHANNEL_ID) },
    { name: "LINE_LOGIN_CHANNEL_SECRET", ok: Boolean(process.env.LINE_LOGIN_CHANNEL_SECRET) },
    { name: "AUTH_SECRET", ok: Boolean(process.env.AUTH_SECRET) },
  ];

  return (
    <div className="max-w-4xl">
      <AdminTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
        <p className="text-slate-500 text-sm mt-1">
          เวลาให้บริการ เงื่อนไขการเช่า และการแจ้งเตือนทาง LINE
        </p>
      </div>

      {ok && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl"
        >
          {ok === "nochange"
            ? "ไม่มีค่าไหนเปลี่ยน จึงไม่ได้บันทึกอะไรเพิ่ม"
            : "บันทึกการตั้งค่าเรียบร้อยแล้ว"}
        </div>
      )}
      {error && ERRORS[error] && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl"
        >
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
            ลูกค้าเลือกรับ-คืนรถได้ทุกเวลา ช่วงนอกเวลาทำการคิดค่าบริการเพิ่ม
            ตั้งช่วงเวลาและราคาได้ที่หน้า{" "}
            <Link href="/admin/after-hours" className="text-blue-700 font-medium hover:underline">
              ค่าบริการนอกเวลา
            </Link>
          </p>
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
          <h2 className="font-semibold text-slate-900">เวลาจองล่วงหน้าขั้นต่ำ</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4 leading-relaxed">
            ลูกค้าจะเลือกเวลารับรถที่เร็วกว่านี้ไม่ได้ ทั้งบนเว็บ ใน LINE และในหน้าจองของ LIFF —
            ปฏิทินจะปิดวันที่เร็วเกินให้อัตโนมัติ และถ้ายังพยายามจอง ระบบจะบอกให้โทรหาแอดมินแทน
            <br />
            ตั้งเป็น <b>0</b> ถ้าอยากรับจองแบบทันทีทันใด (ไม่แนะนำ — ทีมงานจะเตรียมรถไม่ทันตอนคิวแน่น)
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="minLeadHours">
                ต้องจองก่อนรับรถอย่างน้อย (ชั่วโมง)
              </label>
              <input
                id="minLeadHours"
                name="minLeadHours"
                type="number"
                min="0"
                max="720"
                required
                defaultValue={settings.minLeadHours}
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                ค่าแนะนำคือ 24 ชั่วโมง · 48 = สองวัน · 0 = ไม่บังคับ
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="holdMinutes">
                กันคิวรถให้คนที่ยังไม่โอน (นาที)
              </label>
              <input
                id="holdMinutes"
                name="holdMinutes"
                type="number"
                min="0"
                max="1440"
                required
                defaultValue={settings.holdMinutes}
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                ครบเวลาแล้วยังไม่อัปสลิป ระบบยกเลิกใบจองอัตโนมัติ · 0 = ไม่ยกเลิกเอง
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="unpaidDigestOn"
                defaultChecked={settings.unpaidDigestOn}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">ส่งสรุปใบที่ยังไม่โอนให้แอดมินวันละครั้ง</strong>
                <br />
                ตอนกดจองระบบจะไม่ยิง LINE แล้ว (กันคนจองเล่นกินโควตาข้อความ)
                เปิดข้อนี้ไว้เพื่อให้ยังเห็นภาพรวมว่าวันนี้มีคนกดจองแล้วไม่โอนกี่ใบ
                — รวมเป็นข้อความเดียวต่อวัน ดูรายตัวได้ที่{" "}
                <Link href="/admin/bookings?status=awaiting" className="text-blue-600 underline">
                  รอโอนค่าจอง
                </Link>
              </span>
            </label>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100">
          <h2 className="font-semibold text-slate-900">ค่าคืนรถล่าช้า</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4 leading-relaxed">
            ระบบเทียบเวลาคืนรถกับเวลารับรถ นับเป็นวันเต็มก่อน แล้วเศษที่เหลือคือ “เลท”
            <br />
            เลทน้อยกว่าจุดที่ตั้งไว้ → คิดเป็นรายชั่วโมง (เศษนาทีปัดขึ้นเป็นชั่วโมง) ·
            เลทตั้งแต่จุดนั้นขึ้นไป → คิดเป็นค่าเช่าอีก 1 วันเต็ม
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="lateHourlyFee">
                ค่าเลทต่อชั่วโมง (บาท)
              </label>
              <input
                id="lateHourlyFee"
                name="lateHourlyFee"
                type="number"
                min="0"
                required
                defaultValue={settings.lateHourlyFee}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lateRoundUpHours">
                ปัดเป็นวันเมื่อเลทถึง (ชม.)
              </label>
              <input
                id="lateRoundUpHours"
                name="lateRoundUpHours"
                type="number"
                min="1"
                max="24"
                required
                defaultValue={settings.lateRoundUpHours}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lateGraceMinutes">
                ผ่อนปรน (นาที)
              </label>
              <input
                id="lateGraceMinutes"
                name="lateGraceMinutes"
                type="number"
                min="0"
                max="720"
                required
                defaultValue={settings.lateGraceMinutes}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3.5">
            <p className="text-xs font-medium text-slate-600 mb-1.5">
              ตัวอย่างด้วยค่าที่ตั้งอยู่ตอนนี้ — รับรถ 08:00 น.
            </p>
            <ul className="text-xs text-slate-500 leading-relaxed flex flex-col gap-0.5">
              <li>
                คืน 08:00 น. วันรุ่งขึ้น = 1 วัน · ไม่มีค่าเลท
              </li>
              <li>
                คืน 10:00 น. วันรุ่งขึ้น = 1 วัน 2 ชม. · ค่าเลท{" "}
                {(2 * settings.lateHourlyFee).toLocaleString()} บาท
              </li>
              <li>
                คืน{" "}
                {String(8 + settings.lateRoundUpHours).padStart(2, "0")}:00 น. วันรุ่งขึ้น
                (เลท {settings.lateRoundUpHours} ชม.) = ปัดเป็น 2 วัน · ไม่คิดค่าเลทรายชั่วโมง
              </li>
            </ul>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              ค่าเลทรายชั่วโมงถูกจำกัดไม่ให้เกินค่าเช่า 1 วันของรถคันนั้น
              เพื่อไม่ให้ลูกค้าจ่ายแพงกว่ากรณีปัดเป็นวัน
            </p>
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

      <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-1">เข้าสู่ระบบด้วย LINE (หน้า /my)</h2>
        <p className="text-sm text-slate-600 mb-3">
          ต้องมีครบทั้งสามค่าใน Environment Variables ของ Vercel (ตัว Production) แล้ว Redeploy หนึ่งครั้ง
        </p>
        <ul className="text-sm space-y-1">
          {ENV_CHECKS.map((c) => (
            <li key={c.name} className="flex items-center gap-2">
              <span className={c.ok ? "text-emerald-600" : "text-red-600"}>{c.ok ? "✓" : "✕"}</span>
              <code className="text-xs">{c.name}</code>
              <span className="text-slate-500 text-xs">{c.ok ? "ตั้งค่าแล้ว" : "ยังไม่มีค่า"}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm mt-3">
          สรุป:{" "}
          <strong className={loginReady ? "text-emerald-700" : "text-red-700"}>
            {loginReady ? "พร้อมใช้งาน" : "ยังใช้ไม่ได้"}
          </strong>
        </p>
        <p className="text-xs text-slate-500 mt-2 break-all">
          Callback URL ที่ต้องใส่ใน LINE Developers Console →{" "}
          <code className="text-xs">{cbUrl}</code>
        </p>
      </div>
    </div>
  );
}
