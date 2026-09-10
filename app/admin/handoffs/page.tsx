export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { formatBangkokDateTime } from "@/lib/settings";
import { HANDOFF_LABEL, type HandoffKind } from "@/lib/assignments";
import { BTN } from "@/lib/ui";

/**
 * ภาพสภาพรถ — เทียบตอนส่งกับตอนรับคืนของใบจองเดียวกัน
 *
 * หน้านี้ตอบคำถามที่แอดมินถามจริงตอนมีข้อโต้แย้ง:
 * "รถออกไปสภาพไหน กลับมาสภาพไหน วิ่งไปกี่กิโล"
 * เดิมต้องประกอบเอาเองจากการ์ดในหน้ารายการจอง ซึ่งรูปอยู่คนละแถวและเล็กมาก
 *
 * คนรับ-ส่งรถ (DRIVER) เข้าไม่ได้ เพราะจะเห็นงานของคนอื่นทั้งหมด
 */

const PAGE_SIZE = 10;

type PhotoRow = { id: string; fileUrl: string };

type AssignmentRow = {
  id: string;
  kind: string;
  meetAt: Date;
  odometer: number | null;
  fuelLevel: string | null;
  doneAt: Date | null;
  admin: { name: string };
  photos: PhotoRow[];
};

export default async function HandoffPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; only?: string }>;
}) {
  await requireStaff();

  const { q, page, only } = await searchParams;
  const term = (q ?? "").trim();
  const onlyWithPhotos = only !== "all";
  const pageNo = Math.max(1, Number(page) || 1);

  const where = {
    // เอาเฉพาะใบที่มอบหมายงานแล้ว ไม่งั้นได้ใบเปล่าเต็มไปหมด
    assignments: onlyWithPhotos
      ? { some: { photos: { some: {} } } }
      : { some: {} },
    ...(term
      ? {
          OR: [
            { id: { startsWith: term.toLowerCase() } },
            { customer: { fullName: { contains: term, mode: "insensitive" as const } } },
            { car: { licensePlate: { contains: term, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const total = await prisma.booking.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(pageNo, pageCount);

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startDate: "desc" },
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      car: true,
      customer: true,
      assignments: {
        include: { admin: true, photos: { orderBy: { createdAt: "asc" } } },
        orderBy: { meetAt: "asc" },
      },
    },
  });

  const linkTo = (params: Record<string, string>) =>
    `/admin/handoffs?${new URLSearchParams({
      ...(term ? { q: term } : {}),
      ...(only === "all" ? { only: "all" } : {}),
      ...params,
    }).toString()}`;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">ภาพสภาพรถ</h1>
        <p className="text-slate-500 text-sm mt-1">
          เทียบรูปตอนส่งรถกับตอนรับคืนของใบจองเดียวกัน · พบ {total.toLocaleString()} ใบ
          {pageCount > 1 && (
            <span className="text-slate-400">
              {" "}
              · หน้า {current}/{pageCount}
            </span>
          )}
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2 mb-4">
        {only === "all" && <input type="hidden" name="only" value="all" />}
        <label htmlFor="handoff-search" className="sr-only">
          ค้นหาใบจอง
        </label>
        <input
          id="handoff-search"
          name="q"
          defaultValue={term}
          placeholder="ค้นหา ชื่อลูกค้า / ทะเบียน / รหัสจอง"
          className="flex-1 min-w-[200px] max-w-md rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        <button type="submit" className={BTN.primary}>
          ค้นหา
        </button>
        {term && (
          <Link href={linkTo({})} className={BTN.ghost}>
            ล้าง
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={`/admin/handoffs?${new URLSearchParams(term ? { q: term } : {}).toString()}`}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            onlyWithPhotos
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          เฉพาะใบที่มีรูป
        </Link>
        <Link
          href={`/admin/handoffs?${new URLSearchParams({
            ...(term ? { q: term } : {}),
            only: "all",
          }).toString()}`}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !onlyWithPhotos
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          ทุกใบที่มอบหมายแล้ว
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-20 text-center">
          <p className="text-slate-500">
            {term ? `ไม่พบใบจองที่ตรงกับ "${term}"` : "ยังไม่มีรูปสภาพรถในระบบ"}
          </p>
          <p className="text-slate-400 text-sm mt-1.5">
            คนรับ-ส่งรถส่งรูปได้จากหน้างานที่เปิดจากการ์ดงานใน LINE
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((b) => {
            const rows = b.assignments as AssignmentRow[];
            const delivery = rows.filter((a) => a.kind === "DELIVERY");
            const pickup = rows.filter((a) => a.kind === "PICKUP");

            /* ระยะที่วิ่งไป — คิดได้เมื่อจดเลขไมล์ครบทั้งสองขา
               เป็นตัวเลขที่แอดมินอยากรู้ที่สุดเวลามีข้อโต้แย้ง แต่เดิมต้องลบเอง */
            const odoOut = delivery.find((a) => a.odometer != null)?.odometer ?? null;
            const odoBack = pickup.find((a) => a.odometer != null)?.odometer ?? null;
            const distance =
              odoOut != null && odoBack != null && odoBack >= odoOut ? odoBack - odoOut : null;

            return (
              <section
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-semibold text-slate-900">
                        {b.car.brand} {b.car.name}
                      </h2>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {b.car.licensePlate}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{b.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5">
                      {b.customer.fullName} · {b.customer.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {distance != null && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">วิ่งไป</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {distance.toLocaleString()} กม.
                        </p>
                      </div>
                    )}
                    <Link
                      href={`/admin/bookings?q=${b.id.slice(0, 8)}`}
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      เปิดใบจอง →
                    </Link>
                  </div>
                </div>

                {/* สองขาวางคู่กัน — ต้องเห็นพร้อมกันถึงจะเทียบได้ว่ารอยมีมาก่อนหรือเกิดระหว่างเช่า */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <Side title="ตอนส่งรถ" tone="blue" rows={delivery} />
                  <Side title="ตอนรับรถคืน" tone="amber" rows={pickup} />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="แบ่งหน้า" className="mt-6 flex items-center justify-center gap-3">
          {current > 1 ? (
            <Link href={linkTo({ page: String(current - 1) })} className={BTN.ghost}>
              ← ก่อนหน้า
            </Link>
          ) : (
            <span className={`${BTN.ghost} opacity-40 pointer-events-none`}>← ก่อนหน้า</span>
          )}
          <span className="text-sm text-slate-500">
            หน้า {current} / {pageCount}
          </span>
          {current < pageCount ? (
            <Link href={linkTo({ page: String(current + 1) })} className={BTN.ghost}>
              ถัดไป →
            </Link>
          ) : (
            <span className={`${BTN.ghost} opacity-40 pointer-events-none`}>ถัดไป →</span>
          )}
        </nav>
      )}
    </div>
  );
}

const TONE = {
  blue: "bg-blue-50 border-blue-200 text-blue-900",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
} as const;

/** ฝั่งหนึ่งของการเทียบ — งานส่งรถ หรืองานรับคืน */
function Side({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: keyof typeof TONE;
  rows: AssignmentRow[];
}) {
  const photos = rows.flatMap((r) => r.photos);
  const withReading = rows.find((r) => r.odometer != null || r.fuelLevel);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className={`px-4 py-2.5 border-b text-sm font-semibold ${TONE[tone]}`}>
        {title}
        <span className="font-normal opacity-75"> · {photos.length} รูป</span>
      </div>

      <div className="p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">ยังไม่ได้มอบหมายงานนี้</p>
        ) : (
          <>
            <dl className="text-sm flex flex-col gap-1 mb-3">
              {rows.map((r) => (
                <div key={r.id} className="flex gap-2">
                  <dt className="text-slate-500 w-24 shrink-0">
                    {HANDOFF_LABEL[r.kind as HandoffKind] ?? r.kind}
                  </dt>
                  <dd className="text-slate-900 min-w-0">
                    {r.admin.name} · {formatBangkokDateTime(r.meetAt)}
                    {!r.doneAt && (
                      <span className="text-amber-700 font-medium"> · ยังไม่ปิดงาน</span>
                    )}
                  </dd>
                </div>
              ))}
              {withReading && (
                <div className="flex gap-2">
                  <dt className="text-slate-500 w-24 shrink-0">สภาพรถ</dt>
                  <dd className="text-slate-900">
                    {[
                      withReading.odometer != null
                        ? `เลขไมล์ ${withReading.odometer.toLocaleString()} กม.`
                        : null,
                      withReading.fuelLevel ? `น้ำมัน ${withReading.fuelLevel}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              )}
            </dl>

            {photos.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border-t border-slate-100">
                ยังไม่มีรูป
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                {photos.map((ph) => (
                  <a
                    key={ph.id}
                    href={ph.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="กดเพื่อดูขนาดเต็ม"
                    className="block aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-blue-400 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ph.fileUrl}
                      alt="สภาพรถ"
                      data-no-dim
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
