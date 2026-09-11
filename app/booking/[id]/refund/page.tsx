export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicShell from "@/components/PublicShell";
import { getSettings, refundWindowFromSettings, formatBangkokDateTime } from "@/lib/settings";
import {
  refundDueAt,
  refundNet,
  checkAccountNo,
  normalizeAccountNo,
  METHOD_LABEL,
} from "@/lib/refund";
import { reviewUrl } from "@/lib/return-flow";
import { audit } from "@/lib/audit";

/**
 * ลูกค้าแจ้งบัญชีเพื่อรับเงินประกันคืน
 *
 * เข้าได้ด้วยลิงก์จากข้อความ LINE ที่ส่งตอนรับคืนรถ — ใช้รหัสจอง (cuid เดาไม่ได้)
 * เป็นกุญแจเหมือนหน้าติดตามการจอง ไม่ต้องล็อกอิน เพราะลูกค้าจำนวนมากไม่ได้ผูก LINE
 *
 * แก้ไขได้เรื่อย ๆ จนกว่าแอดมินจะกดโอน — พิมพ์เลขบัญชีผิดเป็นเรื่องปกติ
 * ถ้าล็อกทันทีที่กดส่ง ลูกค้าต้องโทรมาแก้ ซึ่งช้ากว่าและพลาดง่ายกว่า
 */

async function saveRefundAction(formData: FormData) {
  "use server";

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) notFound();

  const refund = await prisma.depositRefund.findUnique({
    where: { bookingId },
    include: { booking: true },
  });
  if (!refund) notFound();

  const base = `/booking/${bookingId}/refund`;

  // โอนไปแล้วห้ามแก้ ไม่งั้นหลักฐานว่าโอนเข้าบัญชีไหนจะเพี้ยนย้อนหลัง
  if (refund.paidAt) redirect(`${base}?error=paid`);

  const method = String(formData.get("method") ?? "");
  if (method !== "PROMPTPAY" && method !== "BANK") redirect(`${base}?error=method`);

  const accountName = String(formData.get("accountName") ?? "").trim();
  if (accountName.length < 2 || accountName.length > 100) {
    redirect(`${base}?error=name`);
  }

  const rawNo = String(formData.get("accountNo") ?? "");
  const problem = checkAccountNo(method, rawNo);
  if (problem) redirect(`${base}?error=no`);

  const bankName =
    method === "BANK" ? String(formData.get("bankName") ?? "").trim() : "";
  if (method === "BANK" && (bankName.length < 2 || bankName.length > 60)) {
    redirect(`${base}?error=bank`);
  }

  const reviewed = formData.get("reviewed") === "on";

  const settings = await getSettings();
  const now = new Date();

  await prisma.depositRefund.update({
    where: { bookingId },
    data: {
      method,
      accountName,
      accountNo: normalizeAccountNo(rawNo),
      bankName: method === "BANK" ? bankName : null,
      reviewed,
      // นาฬิกาเริ่มนับครั้งแรกที่แจ้งเข้ามา แก้ไขทีหลังไม่รีเซ็ตคิว
      // ไม่งั้นลูกค้าที่มาแก้ตัวสะกดชื่อจะถูกดันไปท้ายคิวโดยไม่รู้ตัว
      submittedAt: refund.submittedAt ?? now,
      dueAt: refundDueAt(
        refund.submittedAt ?? now,
        reviewed,
        refundWindowFromSettings(settings)
      ),
    },
  });

  await audit({
    action: "refund.submit",
    summary: `ลูกค้าแจ้งบัญชีรับเงินประกันคืน ${bookingId.slice(0, 8).toUpperCase()}`,
    entity: "booking",
    entityId: bookingId,
    // ห้ามใส่เลขบัญชีลงออดิต — ออดิตไม่มีกำหนดลบ แต่เลขบัญชีมี
    detail: `${METHOD_LABEL[method]}${reviewed ? " · แจ้งว่ารีวิวแล้ว" : ""}`,
  });

  revalidatePath("/admin/refunds");
  redirect(`${base}?ok=1`);
}

const ERRORS: Record<string, string> = {
  method: "กรุณาเลือกวิธีรับเงินคืน",
  name: "กรุณากรอกชื่อบัญชีให้ครบ",
  no: "เลขที่กรอกมาไม่ถูกรูปแบบ — พร้อมเพย์ใช้เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก · บัญชีธนาคาร 10-15 หลัก",
  bank: "กรุณากรอกชื่อธนาคาร",
  paid: "รายการนี้โอนคืนไปแล้ว แก้ไขไม่ได้ — ถ้ามีปัญหากรุณาติดต่อแอดมิน",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function RefundPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const refund = await prisma.depositRefund.findUnique({
    where: { bookingId: id },
    include: { booking: { include: { car: true } } },
  });
  if (!refund) notFound();

  const settings = await getSettings();
  const net = refundNet(refund.depositAmount, refund.deductAmount);
  const office = `${String(settings.refundOpenHour).padStart(2, "0")}:00-${String(
    settings.refundCloseHour
  ).padStart(2, "0")}:00 น.`;

  return (
    <PublicShell>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href={`/booking/${id}`} className="hover:text-slate-700">
            ← กลับไปหน้าการจอง
          </Link>
        </nav>

        <h1 className="text-2xl font-bold text-slate-900">รับเงินประกันคืน</h1>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {refund.booking.car.brand} {refund.booking.car.name} ·{" "}
          {refund.booking.car.licensePlate} · รหัสจอง{" "}
          {id.slice(0, 8).toUpperCase()}
        </p>

        {refund.paidAt ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
            <p className="font-semibold text-emerald-900 text-sm mb-1">
              โอนคืนเรียบร้อยแล้ว
            </p>
            <p className="text-sm text-emerald-900/90 leading-relaxed">
              โอน {net.toLocaleString()} บาท เมื่อ{" "}
              {formatBangkokDateTime(refund.paidAt)}
              <br />
              ถ้าเงินยังไม่เข้าบัญชีหลังจากนี้เกิน 24 ชั่วโมง ทักแอดมินได้เลยครับ
            </p>
          </div>
        ) : (
          <>
            {ok && (
              <div
                role="alert"
                className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 text-sm"
              >
                รับข้อมูลแล้ว —{" "}
                {refund.dueAt
                  ? `เราจะโอนคืนให้ภายใน ${formatBangkokDateTime(refund.dueAt)}`
                  : "เราจะโอนคืนให้ตามลำดับคิว"}
                <br />
                กรอกผิดยังแก้ได้จนกว่าเราจะโอน
              </div>
            )}
            {error && ERRORS[error] && (
              <div
                role="alert"
                className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3 text-sm"
              >
                {ERRORS[error]}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
              <p className="text-sm text-slate-500">ยอดที่จะโอนคืน</p>
              <p className="text-3xl font-bold text-slate-900 mt-0.5">
                {net.toLocaleString()} ฿
              </p>
              {refund.deductAmount > 0 && (
                <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                  หักไว้ {refund.deductAmount.toLocaleString()} บาท จากเงินประกัน{" "}
                  {refund.depositAmount.toLocaleString()} บาท
                  {refund.deductReason ? ` — ${refund.deductReason}` : ""}
                </p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <p className="font-semibold text-amber-900 text-sm mb-1">
                รีวิวให้ร้าน แล้วรับเงินคืนเร็วขึ้น
              </p>
              <p className="text-sm text-amber-900/90 leading-relaxed">
                รีวิวแล้วแจ้งบัญชี — โอนคืนภายใน{" "}
                <strong>{settings.refundReviewedHours} ชั่วโมง</strong>
                <br />
                ไม่สะดวกรีวิว — โอนคืนตามลำดับคิว ไม่เกิน{" "}
                <strong>{settings.refundNormalHours} ชั่วโมง</strong>
                <br />
                <span className="text-xs">
                  นับเฉพาะเวลาทำการ {office} — แจ้งนอกเวลาทำการจะเริ่มนับตอนเปิดทำการวันถัดไป
                </span>
              </p>
              <a
                href={reviewUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn inline-flex mt-4 px-4 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-semibold transition-colors"
              >
                รีวิวผ่าน LINE
              </a>
            </div>

            <form
              action={saveRefundAction}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
            >
              <input type="hidden" name="bookingId" value={id} />

              <div>
                <label className={labelClass} htmlFor="method">
                  วิธีรับเงินคืน
                </label>
                <select
                  id="method"
                  name="method"
                  required
                  defaultValue={refund.method ?? "PROMPTPAY"}
                  className={inputClass}
                >
                  <option value="PROMPTPAY">พร้อมเพย์</option>
                  <option value="BANK">บัญชีธนาคาร</option>
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  เลือกบัญชีธนาคาร ให้กรอกชื่อธนาคารในช่องล่างสุดด้วย
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="accountName">
                  ชื่อบัญชี
                </label>
                <input
                  id="accountName"
                  name="accountName"
                  required
                  maxLength={100}
                  defaultValue={refund.accountName ?? ""}
                  placeholder="ชื่อ-นามสกุล ตามที่ปรากฏในบัญชี"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="accountNo">
                  เลขพร้อมเพย์ หรือเลขบัญชี
                </label>
                <input
                  id="accountNo"
                  name="accountNo"
                  required
                  inputMode="numeric"
                  maxLength={30}
                  defaultValue={refund.accountNo ?? ""}
                  placeholder="0812345678"
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  พร้อมเพย์ใช้เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก ·
                  บัญชีธนาคาร 10-15 หลัก
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="bankName">
                  ธนาคาร{" "}
                  <span className="font-normal text-slate-400">
                    (เฉพาะกรณีเลือกบัญชีธนาคาร)
                  </span>
                </label>
                <input
                  id="bankName"
                  name="bankName"
                  maxLength={60}
                  defaultValue={refund.bankName ?? ""}
                  placeholder="เช่น กสิกรไทย"
                  className={inputClass}
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="reviewed"
                  defaultChecked={refund.reviewed}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">รีวิวให้ร้านแล้ว</strong>
                  <br />
                  ติ๊กช่องนี้แล้วรายการของคุณจะถูกจัดเข้าคิวด่วน
                </span>
              </label>

              <button
                type="submit"
                className="btn w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                {refund.submittedAt ? "บันทึกการแก้ไข" : "ส่งข้อมูลรับเงินคืน"}
              </button>

              <p className="text-xs text-slate-400 leading-relaxed">
                เราเก็บเลขบัญชีไว้เพื่อโอนเงินคืนครั้งนี้เท่านั้น
                และลบทิ้งอัตโนมัติหลังโอนเสร็จ
              </p>
            </form>
          </>
        )}
      </div>
    </PublicShell>
  );
}
