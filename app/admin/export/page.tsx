export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireExportOwner } from "@/lib/export-guard";
import { DATASETS, ts } from "@/lib/export-data";
import { BTN } from "@/lib/ui";
import { FILES_PER_PART, bookingIdsWithFiles } from "@/lib/export-files";

/**
 * ส่งออกข้อมูลทั้งระบบให้บริษัทตอนปิดระบบ
 *
 * เข้าได้เฉพาะบัญชี DEV (และถ้าตั้ง EXPORT_OWNER_EMAIL ไว้ ต้องเป็นอีเมลนั้น) — ดู lib/export-guard.ts
 * ตัวสร้าง ZIP อยู่ที่ ./download/route.ts
 */
export default async function AdminExportPage() {
  await requireExportOwner();

  const fileBookingIds = await bookingIdsWithFiles();
  const bookingTotal = await prisma.booking.count();
  const bookingPdfParts = Math.ceil(bookingTotal / 5);
  const fileParts = Math.ceil(fileBookingIds.length / FILES_PER_PART);
  const [counts, receiptYears, recent] = await Promise.all([
    Promise.all(DATASETS.map((d) => d.count())),
    prisma.receipt.groupBy({ by: ["year"], _count: { _all: true }, orderBy: { year: "asc" } }),
    prisma.auditLog.findMany({
      where: { action: { in: ["export.finish", "export.failed"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const receiptTotal = receiptYears.reduce((n, y) => n + y._count._all, 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ส่งออกข้อมูลทั้งระบบ</h1>
        <p className="text-slate-500 text-sm mt-1">
          รวมข้อมูลเป็นไฟล์ ZIP เดียว: ตาราง CSV, ใบเสร็จ PDF และไฟล์ README สำหรับส่งมอบให้บริษัท
        </p>
      </div>

      {/* ปุ่มหลัก */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="font-semibold text-slate-900">ดาวน์โหลดทั้งหมด</h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          CSV {DATASETS.length} ไฟล์ + ใบเสร็จ PDF {receiptTotal} ฉบับ + README.txt
          {receiptTotal > 150 &&
            " · ใบเสร็จเยอะ การสร้าง PDF อาจใช้เวลาหลายนาที — ถ้าไม่สำเร็จให้ใช้ตัวเลือกแบ่งโหลดด้านล่าง"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/admin/export/download?scope=all" className={BTN.primary}>
            ดาวน์โหลด ZIP ทั้งหมด
          </a>
          <a href="/admin/export/download?scope=data" className={BTN.ghost}>
            เฉพาะข้อมูล CSV (ไม่มี PDF)
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          กดแล้วรอสักครู่ ระบบจะเริ่มดาวน์โหลดเมื่อประกอบไฟล์ได้ — อย่าปิดหน้านี้จนกว่าไฟล์จะโหลดเสร็จ
          และทุกครั้งที่ส่งออกจะถูกบันทึกในประวัติการใช้งาน
        </p>

        {receiptYears.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700">
              แบ่งโหลดใบเสร็จ PDF ทีละปี (ใช้เมื่อโหลดทั้งหมดแล้วใบเสร็จไม่ครบ)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {receiptYears.map((y) => (
                <a
                  key={y.year}
                  href={`/admin/export/download?scope=receipts&year=${y.year}`}
                  className={BTN.smGhost}
                >
                  ปี {y.year} ({y._count._all} ฉบับ)
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* รูป/เอกสารลูกค้า */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="font-semibold text-slate-900">รูป/เอกสารที่ลูกค้าอัปโหลด</h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          บัตรประชาชน ใบขับขี่ เอกสารเดินทาง สลิป และรูปสภาพรถ จาก {fileBookingIds.length} ใบจอง
          แบ่งเป็น {fileParts} ชุด (ชุดละไม่เกิน {FILES_PER_PART} ใบจอง) เพื่อไม่ให้เกินเวลาของระบบ — โหลดให้ครบทุกชุด
          ในแต่ละชุดมี manifest.csv บอกว่าไฟล์ไหนเป็นของใคร
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: fileParts }, (_, i) => (
            <a key={i} href={`/admin/export/download?scope=files&part=${i + 1}`} className={BTN.smGhost}>
              ชุดที่ {i + 1}
            </a>
          ))}
        </div>
        <p className="text-xs text-amber-700 mt-3">มีข้อมูลอ่อนไหว (บัตรประชาชน/ใบขับขี่) — เก็บและส่งมอบอย่างปลอดภัย</p>
      </div>

      {/* PDF รายใบจอง */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="font-semibold text-slate-900">PDF รายใบจอง (เรียงเป็นเอกสาร)</h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          PDF หนึ่งไฟล์ต่อหนึ่งใบจอง ({bookingTotal} ใบ): หน้าแรกสรุปลูกค้า รถ วันเช่า การเงิน แล้วตามด้วยรูปบัตร ใบขับขี่
          เอกสารเดินทาง สลิป และรูปสภาพรถ หน้าละรูป แบ่งเป็น {bookingPdfParts} ชุด (ชุดละ 5 ใบจอง)
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: bookingPdfParts }, (_, i) => (
            <a key={i} href={`/admin/export/download?scope=bookingpdf&part=${i + 1}`} className={BTN.smGhost}>
              ชุดที่ {i + 1}
            </a>
          ))}
        </div>
        <p className="text-xs text-amber-700 mt-3">มีบัตรประชาชน/ใบขับขี่ของลูกค้า — เก็บและส่งมอบอย่างปลอดภัย</p>
      </div>

      {/* สิ่งที่อยู่ใน ZIP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">ไฟล์ที่จะอยู่ใน ZIP</h2>
        <ul className="divide-y divide-slate-100">
          {DATASETS.map((d, i) => (
            <li key={d.file} className="py-2.5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {d.title} <span className="text-slate-400 font-mono text-xs">{d.file}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{d.note}</p>
              </div>
              <span className="text-sm text-slate-600 tabular-nums shrink-0">{counts[i]} แถว</span>
            </li>
          ))}
          <li className="py-2.5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                ใบเสร็จ PDF <span className="text-slate-400 font-mono text-xs">receipts/*.pdf</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">ทุกใบ รวมใบที่ยกเลิก</p>
            </div>
            <span className="text-sm text-slate-600 tabular-nums shrink-0">{receiptTotal} ฉบับ</span>
          </li>
        </ul>
      </div>

      {/* ไม่รวม */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-5 mb-5 text-sm leading-relaxed">
        <p className="font-semibold mb-1">ไม่รวมในไฟล์นี้ (ตั้งใจ)</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>รูปรถ ลายเซ็น ตราประทับ (รูปเอกสารลูกค้า/สลิป โหลดแยกที่กล่องด้านบน)</li>
          <li>เลขบัตรประชาชน รหัสผ่าน โทเคนทุกชนิด</li>
          <li>เลขบัญชีคืนเงินของรายที่โอนคืนแล้ว</li>
        </ul>
        <p className="mt-2">
          ไฟล์ที่ได้มีข้อมูลส่วนบุคคลของลูกค้า — ส่งมอบให้ผู้ที่บริษัทมอบหมายเท่านั้น
          และเก็บสำเนาไว้ที่ที่ปลอดภัยก่อนลบระบบ
        </p>
      </div>

      {/* ตรวจก่อนปิด */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-2">เช็กลิสต์ก่อนปิดระบบ</h2>
        <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-1 leading-relaxed">
          <li>ดาวน์โหลด ZIP แล้วแตกไฟล์ ตรวจว่ามี README.txt, ไฟล์ CSV ครบ และโฟลเดอร์ receipts/</li>
          <li>เปิด bookings.csv ด้วย Excel — ภาษาไทยต้องไม่เพี้ยน และจำนวนแถวตรงกับที่แสดงด้านบน</li>
          <li>เปิดใบเสร็จ PDF สุ่มสัก 3–5 ใบ เทียบกับเลขที่ใน receipts.csv</li>
          <li>ถ้า README แจ้งว่ามีใบเสร็จที่สร้าง PDF ไม่สำเร็จ ให้โหลดแยกทีละปีด้านบนแล้วตรวจอีกครั้ง</li>
          <li>ส่งไฟล์ให้บริษัท พร้อมให้ผู้รับยืนยันว่าเปิดอ่านได้ ก่อนลบข้อมูลในระบบ</li>
        </ol>
      </div>

      {/* ประวัติ */}
      {recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-2">การส่งออกล่าสุด</h2>
          <ul className="text-sm text-slate-600 space-y-1">
            {recent.map((r) => (
              <li key={r.id}>
                <span className="text-slate-400 tabular-nums">{ts(r.createdAt)}</span> · {r.actorName} · {r.summary}
                {r.detail ? <span className="text-amber-700"> ({r.detail})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
