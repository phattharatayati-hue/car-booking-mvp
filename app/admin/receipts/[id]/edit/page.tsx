export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { formatBangkokDateTime } from "@/lib/settings";
import { PAYMENT_LABEL, PAYMENT_METHODS, type ReceiptItem } from "@/lib/receipt";
import { updateReceiptAction } from "../../actions";
import ActionButton from "@/components/ActionButton";
import { BTN } from "@/lib/ui";

/**
 * แก้ไขใบเสร็จที่ออกไปแล้ว
 *
 * เลขที่ วันที่ออก และลายเซ็นผู้มีอำนาจไม่ให้แก้ — เปลี่ยนได้แต่เนื้อหาที่กรอกผิด
 * เลขที่ใบเสร็จเปลี่ยนไม่ได้เพราะมันคือกุญแจอ้างอิงทางบัญชี
 * ถ้าจะเปลี่ยนเลข วิธีที่ถูกคือยกเลิกใบนี้แล้วออกใบใหม่
 */

const ERRORS: Record<string, string> = {
  items: "รายการไม่ถูกต้อง — ต้องมีอย่างน้อย 1 บรรทัด และตัวเลขต้องไม่ติดลบ",
  name: "กรุณากรอกชื่อลูกค้า",
  taxId:
    "กรุณากรอกเลขประจำตัวผู้เสียภาษี — นิติบุคคล/คนไทยใช้เลข 13 หลัก · ชาวต่างชาติใช้เลขพาสปอร์ต",
  address: "กรุณากรอกที่อยู่ของลูกค้า",
  phone: "กรุณากรอกเบอร์โทรของลูกค้า",
  payment: "วิธีชำระเงินไม่ถูกต้อง",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
const cellClass =
  "w-full rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-sm text-slate-900";

const ROWS = 6;

export default async function EditReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { error } = await searchParams;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { booking: { include: { car: true } } },
  });
  if (!receipt) notFound();

  const items = receipt.items as unknown as ReceiptItem[];

  return (
    <div className="max-w-4xl">
      <nav className="text-sm text-slate-500 mb-4">
        <Link href={`/admin/receipts/${id}`} className="hover:text-slate-700">
          ← กลับไปหน้าใบเสร็จ
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900">แก้ไขใบเสร็จ {receipt.number}</h1>
      <p className="text-slate-500 text-sm mt-1 mb-6">
        {receipt.booking.car.brand} {receipt.booking.car.name} · ออกเมื่อ{" "}
        {formatBangkokDateTime(receipt.issuedAt)}
      </p>

      {error && ERRORS[error] && (
        <div
          role="alert"
          className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl"
        >
          {ERRORS[error]}
        </div>
      )}

      <div className="mb-5 text-sm bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl leading-relaxed">
        เลขที่ใบเสร็จและวันที่ออกแก้ไม่ได้ — ถ้าต้องเปลี่ยนเลข ให้ยกเลิกใบนี้แล้วออกใบใหม่
        <br />
        ทุกการแก้ไขถูกบันทึกในประวัติการใช้งาน พร้อมยอดก่อนและหลังแก้
      </div>

      {receipt.voidedAt && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl leading-relaxed">
          ใบนี้ถูกยกเลิกไปแล้ว — แก้ได้ แต่ลายน้ำ “ยกเลิก” จะยังอยู่บนเอกสาร
          และใบที่ยกเลิกแล้วไม่ควรใช้อ้างอิงทางบัญชี
        </div>
      )}

      {receipt.customerSignatureUrl && (
        <div className="mb-5 text-sm bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl leading-relaxed">
          <p className="font-semibold">ลูกค้าเซ็นรับใบนี้ไปแล้ว</p>
          <p className="mt-1">
            ลายเซ็นผูกกับตัวเลขที่ลูกค้าเห็นตอนเซ็น ถ้าแก้ยอดแล้วเก็บลายเซ็นเดิมไว้
            เอกสารจะกลายเป็นว่าลูกค้าเซ็นรับยอดที่ไม่เคยเห็น
            <br />
            แนะนำให้ติ๊กลบลายเซ็นออกด้านล่าง แล้วให้ลูกค้าเซ็นใหม่
          </p>
        </div>
      )}

      {receipt.sentToLineAt && (
        <div className="mb-5 text-sm bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl leading-relaxed">
          ใบนี้ส่งให้ลูกค้าทาง LINE ไปแล้วเมื่อ{" "}
          {formatBangkokDateTime(receipt.sentToLineAt)}
          <br />
          ลิงก์เดิมของลูกค้าจะแสดงฉบับที่แก้แล้วทันที แต่ถ้าลูกค้าเซฟ PDF ไว้ก่อนหน้า
          เขาจะยังถือฉบับเก่าอยู่ — แก้เสร็จควรกดส่งซ้ำและบอกลูกค้าด้วย
        </div>
      )}

      <form action={updateReceiptAction} className="space-y-5">
        <input type="hidden" name="receiptId" value={receipt.id} />

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">ข้อมูลลูกค้าในใบเสร็จ</h2>

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
                defaultValue={receipt.customerName}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="taxId">
                เลขผู้เสียภาษี / บัตรประชาชน / พาสปอร์ต
              </label>
              <input
                id="taxId"
                name="taxId"
                required
                maxLength={30}
                defaultValue={receipt.taxId ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="branch">
                สาขา <span className="font-normal text-slate-400">(เฉพาะนิติบุคคล)</span>
              </label>
              <input
                id="branch"
                name="branch"
                maxLength={60}
                defaultValue={receipt.branch ?? ""}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="address">
                ที่อยู่
              </label>
              <input
                id="address"
                name="address"
                required
                maxLength={300}
                defaultValue={receipt.address ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                เบอร์โทร
              </label>
              <input
                id="phone"
                name="phone"
                required
                maxLength={40}
                defaultValue={receipt.phone ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-1">รายการ</h2>
          <p className="text-sm text-slate-500 mb-4">
            ลบบรรทัดได้ด้วยการล้างชื่อรายการให้ว่าง
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
                  const it = items[i];
                  return (
                    <tr key={i}>
                      <td className="py-1 pr-2">
                        <input
                          name={`item${i}name`}
                          maxLength={200}
                          defaultValue={it?.name ?? ""}
                          className={cellClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          name={`item${i}qty`}
                          type="number"
                          min="1"
                          max="9999"
                          defaultValue={it?.qty ?? 1}
                          className={cellClass}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          name={`item${i}price`}
                          type="number"
                          min="0"
                          defaultValue={it?.unitPrice ?? ""}
                          className={cellClass}
                        />
                      </td>
                      <td className="py-1 pl-2">
                        <input
                          name={`item${i}discount`}
                          type="number"
                          min="0"
                          defaultValue={it?.discount ?? 0}
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
                defaultValue={receipt.paymentMethod}
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
                defaultValue={receipt.paymentDetail ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {receipt.customerSignatureUrl && (
          <div className="bg-white rounded-2xl border border-amber-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="clearSignature"
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">
                  ลบลายเซ็นลูกค้าออกด้วย เพื่อให้เซ็นใหม่
                </strong>
                <br />
                ไม่ติ๊ก = เก็บลายเซ็นเดิมไว้บนใบที่แก้แล้ว ระบบจะบันทึกไว้ในประวัติว่า
                แก้หลังลูกค้าเซ็นรับแล้ว
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <ActionButton
            className={BTN.ok}
            pendingText="กำลังบันทึก…"
            confirm={`บันทึกการแก้ไขใบเสร็จ ${receipt.number}?\n\nเลขที่ใบเสร็จยังเป็นเลขเดิม และการแก้ไขจะถูกบันทึกในประวัติการใช้งาน`}
          >
            บันทึกการแก้ไข
          </ActionButton>
          <Link
            href={`/admin/receipts/${id}`}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
