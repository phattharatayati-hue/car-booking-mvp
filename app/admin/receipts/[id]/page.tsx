export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { getSettings, formatBangkokDateTime } from "@/lib/settings";
import { siteUrl } from "@/lib/line";
import ReceiptDoc from "@/components/ReceiptDoc";
import PrintButton from "@/components/PrintButton";
import CopyButton from "@/components/CopyButton";
import ActionButton from "@/components/ActionButton";
import { BTN, NOTICE } from "@/lib/ui";
import { voidReceiptAction, sendReceiptLineAction } from "../actions";
import type { ReceiptItem } from "@/lib/receipt";

/**
 * ใบเสร็จหนึ่งใบ — ดู ปริ้น ส่ง LINE ยกเลิก
 *
 * แถบเครื่องมือด้านบนถูกซ่อนตอนสั่งพิมพ์ด้วย class no-print
 * เหลือแต่ตัวเอกสารเต็มหน้า A4
 */

const FLASH: Record<string, { text: string; tone: "ok" | "error" }> = {
  created: { text: "ออกใบเสร็จเรียบร้อยแล้ว", tone: "ok" },
  sent: { text: "ส่งใบเสร็จให้ลูกค้าทาง LINE แล้ว", tone: "ok" },
  voided: { text: "ยกเลิกใบเสร็จแล้ว", tone: "ok" },
  reason: { text: "กรุณาระบุเหตุผลที่ยกเลิก อย่างน้อย 3 ตัวอักษร", tone: "error" },
  already: { text: "ใบนี้ถูกยกเลิกไปแล้ว", tone: "error" },
  voided_send: { text: "ใบที่ยกเลิกแล้วส่งให้ลูกค้าไม่ได้", tone: "error" },
  noline: {
    text: "ลูกค้ายังไม่ได้ผูกบัญชี LINE — ส่งไม่ได้ ใช้วิธีคัดลอกลิงก์ส่งให้เองแทน",
    tone: "error",
  },
  sendfail: { text: "ส่ง LINE ไม่สำเร็จ ลองใหม่อีกครั้ง", tone: "error" },
};

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const flash = FLASH[ok ?? ""] ?? FLASH[error ?? ""];

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { booking: { include: { customer: true, car: true } }, issuedBy: true },
  });
  if (!receipt) notFound();

  const settings = await getSettings();
  const publicUrl = `${siteUrl()}/receipt/${receipt.viewToken}`;

  return (
    <div>
      <div className="no-print">
        <nav className="text-sm text-slate-500 mb-4">
          <Link href="/admin/receipts" className="hover:text-slate-700">
            ← กลับไปรายการใบเสร็จ
          </Link>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{receipt.number}</h1>
            <p className="text-slate-500 text-sm mt-1">
              ออกเมื่อ {formatBangkokDateTime(receipt.issuedAt)}
              {receipt.issuedBy ? ` โดย ${receipt.issuedBy.name}` : ""}
              {receipt.sentToLineAt
                ? ` · ส่งให้ลูกค้าแล้ว ${formatBangkokDateTime(receipt.sentToLineAt)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <a
              href={`/receipt/${receipt.viewToken}/pdf?dl=1`}
              className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              ดาวน์โหลด PDF
            </a>
            <CopyButton value={publicUrl} label="คัดลอกลิงก์ใบเสร็จ" />
            <Link
              href={`/admin/bookings?q=${receipt.bookingId}`}
              prefetch={false}
              className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              เปิดใบจอง
            </Link>
          </div>
        </div>

        {flash && (
          <div
            role="alert"
            className={`mb-5 text-sm border px-4 py-3 rounded-xl ${NOTICE[flash.tone]}`}
          >
            {flash.text}
          </div>
        )}

        {!receipt.voidedAt && (
          <div className="flex flex-wrap gap-3 mb-5">
            <form action={sendReceiptLineAction}>
              <input type="hidden" name="receiptId" value={receipt.id} />
              <ActionButton
                className={BTN.ok}
                pendingText="กำลังส่ง…"
                confirm={
                  receipt.sentToLineAt
                    ? "เคยส่งใบเสร็จนี้ให้ลูกค้าไปแล้ว ส่งซ้ำอีกครั้ง?"
                    : "ส่งใบเสร็จเข้าแชท LINE ของลูกค้า?"
                }
              >
                {receipt.sentToLineAt ? "ส่งซ้ำทาง LINE" : "ส่งให้ลูกค้าทาง LINE"}
              </ActionButton>
            </form>

            <details className="group/void">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-500 hover:text-slate-900 select-none py-2.5">
                ยกเลิกใบเสร็จนี้
              </summary>
              <form
                action={voidReceiptAction}
                className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap gap-2 items-center"
              >
                <input type="hidden" name="receiptId" value={receipt.id} />
                <input
                  name="voidReason"
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="เหตุผล เช่น ออกผิดยอด"
                  className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                />
                <ActionButton
                  className={BTN.danger}
                  pendingText="กำลังยกเลิก…"
                  confirm={
                    "ยกเลิกใบเสร็จนี้?\n\nใบจะยังอยู่ในระบบพร้อมลายน้ำ “ยกเลิก” เพราะเลขที่ใบเสร็จต้องอธิบายได้ว่าหายไปไหน"
                  }
                >
                  ยืนยันยกเลิก
                </ActionButton>
              </form>
            </details>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          LINE ส่งไฟล์ PDF เข้าแชทโดยตรงไม่ได้ — ระบบจึงส่งการ์ดที่มีปุ่ม “ดาวน์โหลด PDF”
          ให้ลูกค้ากดเอง ได้ไฟล์ PDF จริงไปเก็บหรือส่งต่อฝ่ายบัญชี
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="shadow-lg mx-auto w-fit print:shadow-none">
          <ReceiptDoc
            r={{
              ...receipt,
              items: receipt.items as unknown as ReceiptItem[],
            }}
            company={{
              taxId: settings.companyTaxId,
              branch: settings.companyBranch,
              address: settings.companyAddress,
            }}
          />
        </div>
      </div>
    </div>
  );
}
