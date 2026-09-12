export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ReceiptDoc from "@/components/ReceiptDoc";
import PrintButton from "@/components/PrintButton";
import type { ReceiptItem } from "@/lib/receipt";

/**
 * ใบเสร็จที่ลูกค้าเปิดเอง — เข้าด้วยกุญแจสุ่มในลิงก์ ไม่ต้องล็อกอิน
 *
 * ไม่แสดงอะไรที่เกินตัวเอกสาร ไม่มีลิงก์กลับเข้าหลังบ้าน
 * เพราะลิงก์นี้ถูกส่งต่อให้ฝ่ายบัญชีของลูกค้าได้
 */
export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const receipt = await prisma.receipt.findUnique({ where: { viewToken: token } });
  if (!receipt) notFound();

  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 print:bg-white print:p-0">
      <div className="no-print max-w-[210mm] mx-auto mb-4 flex justify-end gap-2">
        <a
          href={`/receipt/${token}/pdf?dl=1`}
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          ดาวน์โหลด PDF
        </a>
        <PrintButton />
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

      <p className="no-print text-center text-xs text-slate-400 mt-4">
        กดปุ่มดาวน์โหลด PDF เพื่อเก็บไฟล์ไว้ หรือส่งต่อให้ฝ่ายบัญชีได้เลย
      </p>
    </div>
  );
}
