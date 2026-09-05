export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auditAs } from "@/lib/audit";
import { jobViewOpen } from "@/lib/driver-jobs";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";
import { DOCUMENT_LABEL, type DocumentKind } from "@/lib/documents";
import { formatBangkokDateTime, formatBangkokTime } from "@/lib/settings";

/**
 * หน้าเอกสารลูกค้าสำหรับคนรับ-ส่งรถ
 *
 * เข้าถึงด้วยกุญแจสุ่มในลิงก์เท่านั้น (ไม่ต้องล็อกอิน เพราะคนรับ-ส่งรถเปิดจากแชท LINE)
 * ความปลอดภัยอยู่ที่ 3 ชั้น
 *   1. กุญแจผูกกับงานชิ้นเดียว ถอนงานเมื่อไหร่แถวหาย ลิงก์ตายทันที
 *   2. เปิดได้ตลอดก่อนถึงเวลานัด แล้วปิดถาวรเมื่อพ้นเวลานัดไป 1 วัน
 *   3. ตัวไฟล์ใน /api/file ตรวจซ้ำว่าไฟล์นั้นเป็นเอกสารของการจองนี้จริง
 * ทุกครั้งที่เปิดจะถูกบันทึกลงหน้าประวัติการใช้งาน
 */

const shell =
  "min-h-screen bg-slate-50 px-4 py-8 flex flex-col items-center";

function Blocked({ title, detail }: { title: string; detail: string }) {
  return (
    <main className={shell}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 px-5 py-8 text-center">
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{detail}</p>
        <p className="text-xs text-slate-400 mt-5 leading-relaxed">
          พิมพ์ “งานของฉัน” ในแชท LINE เพื่อดูงานที่กำลังจะถึง
        </p>
      </div>
    </main>
  );
}

export default async function JobDocumentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const job = await prisma.bookingAssignment.findUnique({
    where: { viewToken: token },
    include: {
      admin: { select: { id: true, name: true, role: true } },
      booking: {
        include: {
          car: true,
          customer: true,
          documents: { orderBy: { kind: "asc" } },
        },
      },
    },
  });

  if (!job) {
    return (
      <Blocked
        title="ลิงก์นี้ใช้ไม่ได้แล้ว"
        detail="งานนี้อาจถูกถอนหรือมอบหมายให้คนอื่นไปแล้ว"
      />
    );
  }

  if (!jobViewOpen(job.meetAt)) {
    return (
      <Blocked
        title="ลิงก์นี้หมดอายุแล้ว"
        detail={`เอกสารของงานนี้ปิดดูหลังพ้นเวลานัดไป 1 วัน — เวลานัดคือ ${formatBangkokDateTime(
          job.meetAt
        )} ถ้ายังต้องใช้ กรุณาติดต่อออฟฟิศ`}
      />
    );
  }

  // เอกสารที่ผ่านการตรวจแล้วเท่านั้น — ที่ยังไม่ผ่านไม่ควรเอาไปเทียบหน้างาน
  const approved = job.booking.documents.filter((d) => d.status === "APPROVED");

  // การเปิดดูบัตรประชาชน/ใบขับขี่ของลูกค้าเป็นเรื่องอ่อนไหว จึงบันทึกไว้ทุกครั้ง
  await auditAs(
    { id: job.admin.id, name: job.admin.name, role: job.admin.role },
    {
      action: "booking.document_view",
      summary: `เปิดดูเอกสารลูกค้าของการจอง ${job.bookingId
        .slice(0, 8)
        .toUpperCase()} จากลิงก์งานรับ-ส่งรถ`,
      entity: "booking",
      entityId: job.bookingId,
      detail: `งาน${HANDOFF_LABEL[job.kind as HandoffKind]} · ${approved.length} ใบ`,
    }
  );

  return (
    <main className={shell}>
      <div className="w-full max-w-md flex flex-col gap-4">
        <header className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-xs font-medium text-blue-700">
            {HANDOFF_LABEL[job.kind as HandoffKind]}
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {job.booking.customer.fullName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <a href={`tel:${job.booking.customer.phone}`} className="text-blue-700">
              {job.booking.customer.phone}
            </a>
          </p>

          <dl className="mt-3.5 pt-3.5 border-t border-slate-100 text-sm flex flex-col gap-1.5">
            <div className="flex gap-2">
              <dt className="text-slate-500 w-20 shrink-0">รถ</dt>
              <dd className="text-slate-900">
                {job.booking.car.brand} {job.booking.car.name} (
                {job.booking.car.licensePlate})
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 w-20 shrink-0">เวลานัด</dt>
              <dd className="text-slate-900">{formatBangkokDateTime(job.meetAt)}</dd>
            </div>
            {job.place && (
              <div className="flex gap-2">
                <dt className="text-slate-500 w-20 shrink-0">จุดนัด</dt>
                <dd className="text-slate-900">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      job.place
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline"
                  >
                    {job.place}
                  </a>
                </dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-slate-500 w-20 shrink-0">รหัสจอง</dt>
              <dd className="text-slate-900 font-mono">
                {job.bookingId.slice(0, 8).toUpperCase()}
              </dd>
            </div>
          </dl>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold">ใช้เทียบกับตัวจริงเท่านั้น</p>
          <p className="mt-1">
            ขอดูบัตรประชาชนและใบขับขี่ตัวจริงจากลูกค้า แล้วเทียบกับภาพด้านล่างว่าเป็นคนเดียวกัน ·
            ห้ามบันทึกภาพ ส่งต่อ หรือถ่ายหน้าจอเก็บไว้
          </p>
        </div>

        {approved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-8 text-center">
            <p className="text-sm text-slate-500">
              ยังไม่มีเอกสารที่ผ่านการตรวจสอบสำหรับการจองนี้
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              กรุณาติดต่อออฟฟิศก่อนส่งมอบรถ
            </p>
          </div>
        ) : (
          approved.map((doc) => (
            <figure
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <figcaption className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {DOCUMENT_LABEL[doc.kind as DocumentKind] ?? doc.kind}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ตรวจผ่านแล้ว
                </span>
              </figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${doc.fileUrl}&t=${encodeURIComponent(token)}`}
                alt={DOCUMENT_LABEL[doc.kind as DocumentKind] ?? doc.kind}
                className="w-full h-auto bg-slate-100"
              />
            </figure>
          ))
        )}

        <p className="text-xs text-slate-400 text-center leading-relaxed px-2">
          ลิงก์นี้ใช้ได้กับงานของคุณเท่านั้น และจะปิดเมื่อพ้นเวลานัดไป 1 วัน ·
          ระบบบันทึกทุกครั้งที่มีการเปิดดู (ครั้งนี้ {formatBangkokTime(new Date())} น.)
        </p>
      </div>
    </main>
  );
}
