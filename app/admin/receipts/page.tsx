export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { formatBangkokDate } from "@/lib/settings";
import { buddhistYear } from "@/lib/receipt";

/** รายการใบเสร็จทั้งหมด เรียงใบใหม่สุดก่อน */
export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const where = term
    ? {
        OR: [
          { number: { contains: term, mode: "insensitive" as const } },
          { customerName: { contains: term, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [receipts, thisYearCount] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      take: 100,
      include: { booking: { include: { car: true } } },
    }),
    prisma.receipt.count({ where: { year: buddhistYear() } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ใบเสร็จรับเงิน</h1>
        <p className="text-slate-500 text-sm mt-1">
          ปี {buddhistYear()} ออกไปแล้ว {thisYearCount} ใบ · เลขที่รันใหม่ทุกปี ·
          ออกใบเสร็จได้จากการ์ดใบจองในหน้ารายการจอง
        </p>
      </div>

      <form className="flex gap-2 mb-5" action="/admin/receipts">
        <input
          name="q"
          defaultValue={term}
          placeholder="ค้นหาเลขที่ใบเสร็จ หรือชื่อลูกค้า"
          className="flex-1 max-w-md rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
        >
          ค้นหา
        </button>
      </form>

      {receipts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          {term ? "ไม่พบใบเสร็จที่ตรงกับคำค้น" : "ยังไม่มีใบเสร็จในระบบ"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left font-medium px-4 py-3">เลขที่</th>
                <th className="text-left font-medium px-4 py-3">วันที่</th>
                <th className="text-left font-medium px-4 py-3">ลูกค้า</th>
                <th className="text-left font-medium px-4 py-3">รถ</th>
                <th className="text-right font-medium px-4 py-3">ยอด</th>
                <th className="text-left font-medium px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/receipts/${r.id}`}
                      prefetch={false}
                      className="font-mono font-medium text-blue-600 hover:underline"
                    >
                      {r.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatBangkokDate(r.issuedAt)}</td>
                  <td className="px-4 py-3 text-slate-900">{r.customerName}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.booking.car.brand} {r.booking.car.name}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {r.total.toLocaleString()} ฿
                  </td>
                  <td className="px-4 py-3">
                    {r.voidedAt ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        ยกเลิกแล้ว
                      </span>
                    ) : r.sentToLineAt ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ส่งลูกค้าแล้ว
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">ยังไม่ได้ส่ง</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
