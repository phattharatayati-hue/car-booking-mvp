export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { getSettings, formatBangkokDateTime } from "@/lib/settings";
import { rentalDays, PAYMENT_LABEL, PAYMENT_METHODS } from "@/lib/receipt";
import { BANK_ACCOUNT } from "@/lib/contact";
import { createReceiptAction } from "../actions";
import ActionButton from "@/components/ActionButton";
import { BTN } from "@/lib/ui";

/**
 * ฟอร์มออกใบเสร็จ
 *
 * เติมค่าจากใบจองให้ก่อน แล้วให้แก้ได้ทุกช่อง เพราะลูกค้านิติบุคคลจะขอ
 * ชื่อบริษัท เลขผู้เสียภาษี และที่อยู่ ซึ่งระบบไม่มีข้อมูลนี้ตอนจอง
 *
 * รายการแยกบรรทัด (ค่าเช่า / เงินประกัน / ค่าอื่น ๆ) ตามที่ร้านใช้จริง
 */

const ERRORS: Record<string, string> = {
  items: "รายการไม่ถูกต้อง — ต้องมีอย่างน้อย 1 บรรทัด และตัวเลขต้องไม่ติดลบ",
  name: "กรุณากรอกชื่อลูกค้า",
  payment: "วิธีชำระเงินไม่ถูกต้อง",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
const cellClass =
  "w-full rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-sm text-slate-900";

const ROWS = 6;

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; error?: string }>;
}) {
  await requireStaff();
  const { booking: bookingId, error } = await searchParams;
  if (!bookingId) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { car: true, customer: true, deposit: true, receipts: true },
  });
  if (!booking) notFound();

  const settings = await getSettings();
  const days = rentalDays(booking.startDate, booking.endDate);

  /* ค่าตั้งต้นของรายการ — แยกค่าเช่ากับเงินประกันคนละบรรทัดตามที่ร้านใช้
     ค่าจองที่ลูกค้าโอนไว้แล้วใส่เป็นส่วนลดของบรรทัดค่าเช่า เพราะใบเสร็จ
     ไม่มีบรรทัดติดลบ และยอดสุทธิต้องเท่ากับเงินที่รับจริงหน้างาน */
  const prefill = [
    {
      name: `ค่าบริการเช่ารถยนต์ ${booking.car.brand} ${booking.car.name} ระยะเวลา ${days} วัน`,
      qty: days,
      price: Math.round(booking.totalPrice / days),
      discount: booking.deposit ? booking.deposit.amount : 0,
    },
    {
      name: "เงินประกันรถ (คืนให้เมื่อส่งรถเรียบร้อย)",
      qty: 1,
      price: settings.securityDeposit,
      discount: 0,
    },
  ];

  return (
    <div className="max-w-4xl">
      <nav className="text-sm text-slate-500 mb-4">
        <Link href="/admin/bookings" className="hover:text-slate-700">
          ← กลับไปรายการจอง
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900">ออกใบเสร็จรับเงิน</h1>
      <p className="text-slate-500 text-sm mt-1 mb-6">
        {booking.car.brand} {booking.car.name} · {booking.car.licensePlate} · รหัสจอง{" "}
        {booking.id.slice(0, 8).toUpperCase()} · รับรถ{" "}
        {formatBangkokDateTime(booking.startDate)}
      </p>

      {error && ERRORS[error] && (
        <div
          role="alert"
          className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl"
        >
          {ERRORS[error]}
        </div>
      )}

      {booking.receipts.length > 0 && (
        <div className="mb-5 text-sm bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl leading-relaxed">
          ใบจองนี้เคยออกใบเสร็จไปแล้ว {booking.receipts.length} ใบ —{" "}
          {booking.receipts.map((r) => r.number).join(", ")}
          <br />
          ออกใบใหม่ได้ถ้าจำเป็น แต่ถ้าใบเดิมผิด ควรกดยกเลิกใบเดิมด้วย
          ไม่งั้นจะมีใบเสร็จสองใบสำหรับเงินก้อนเดียวกัน
        </div>
      )}

      {!settings.signerAdminUserId && (
        <div className="mb-5 text-sm bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl leading-relaxed">
          ยังไม่ได้ตั้งผู้มีอำนาจลงนามในหน้าตั้งค่า — ใบเสร็จจะออกได้ตามปกติ
          แต่ช่องลายเซ็นจะว่างไว้ให้เซ็นด้วยปากกา
        </div>
      )}

      <form action={createReceiptAction} className="space-y-5">
        <input type="hidden" name="bookingId" value={booking.id} />

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-1">ข้อมูลลูกค้าในใบเสร็จ</h2>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            ลูกค้านิติบุคคลจะขอชื่อบริษัท เลขผู้เสียภาษี และที่อยู่ —
            ถามแล้วกรอกแทนได้ตรงนี้
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="customerName">
                ชื่อลูกค้า / ชื่อบริษัท
              </label>
              <input
                id="customerName"
                name="customerName"
                required
                maxLength={150}
                defaultValue={booking.customer.fullName}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="taxId">
                เลขประจำตัวผู้เสียภาษี{" "}
                <span className="font-normal text-slate-400">(ถ้ามี)</span>
              </label>
              <input id="taxId" name="taxId" maxLength={30} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="branch">
                สาขา <span className="font-normal text-slate-400">(ถ้ามี)</span>
              </label>
              <input
                id="branch"
                name="branch"
                maxLength={60}
                placeholder="สำนักงานใหญ่"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="address">
                ที่อยู่ <span className="font-normal text-slate-400">(ถ้ามี)</span>
              </label>
              <input id="address" name="address" maxLength={300} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                เบอร์โทร
              </label>
              <input
                id="phone"
                name="phone"
                maxLength={40}
                defaultValue={booking.customer.phone}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-1">รายการ</h2>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            แถวที่ปล่อยชื่อว่างไว้จะไม่ถูกใส่ในใบเสร็จ ·
            ค่าจองที่ลูกค้าโอนไว้แล้วเติมเป็นส่วนลดของบรรทัดค่าเช่าให้ ยอดสุทธิจะได้ตรงกับเงินที่รับจริงหน้างาน
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2 pr-2">รายการ</th>
                  <th className="pb-2 px-2 w-20">จำนวน</th>
                  <th className="pb-2 px-2 w-32">ราคา/หน่วย</th>
                  <th className="pb-2 pl-2 w-32">ส่วนลด</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROWS }).map((_, i) => {
                  const p = prefill[i];
                  return (
                    <tr key={i}>
                      <td className="py-1 pr-2">
                        <input
                          name={`item${i}name`}
                          maxLength={200}
                          defaultValue={p?.name ?? ""}
                          placeholder={i === 2 ? "เช่น ค่าบริการนอกเวลา / ค่าคืนรถล่าช้า" : ""}
                          className={cellClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          name={`item${i}qty`}
                          type="number"
                          min="1"
                          max="9999"
                          defaultValue={p?.qty ?? 1}
                          className={cellClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          name={`item${i}price`}
                          type="number"
                          min="0"
                          defaultValue={p?.price ?? ""}
                          className={cellClass}
                        />
                      </td>
                      <td className="py-1 pl-2">
                        <input
                          name={`item${i}discount`}
                          type="number"
                          min="0"
                          defaultValue={p?.discount ?? 0}
                          className={cellClass}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">การชำระเงิน</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="paymentMethod">
                ชำระโดย
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                defaultValue="TRANSFER"
                className={inputClass}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="paymentDetail">
                รายละเอียดการชำระ
              </label>
              <input
                id="paymentDetail"
                name="paymentDetail"
                maxLength={200}
                defaultValue={
                  booking.deposit
                    ? `ค่าจอง ${booking.deposit.amount.toLocaleString()} บาท โอนเข้า ${BANK_ACCOUNT}`
                    : ""
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton
            className={BTN.ok}
            pendingText="กำลังออกใบเสร็จ…"
            confirm={
              "ออกใบเสร็จเลขใหม่?\n\nเลขที่ใบเสร็จรันแล้วย้อนกลับไม่ได้ ถ้าออกผิดต้องกดยกเลิกใบนั้นแทนการลบ"
            }
          >
            ออกใบเสร็จ
          </ActionButton>
          <Link
            href="/admin/bookings"
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
