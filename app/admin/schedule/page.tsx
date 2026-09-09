export const dynamic = "force-dynamic";

import Link from "next/link";
import { currentAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { bangkokDateStr, formatBangkokTime } from "@/lib/settings";
import { HANDOFF_LABEL } from "@/lib/assignments";
import {
  scheduleForDay,
  summarize,
  rowStatus,
  STATUS_TEXT,
  STATUS_STYLE,
  type ScheduleRow,
} from "@/lib/schedule";

/**
 * กระดานคิวรับ-ส่งรายวัน
 *
 * ตอบคำถามเดียวให้ได้ในสามวินาที — "วันนี้ต้องวิ่งงานอะไรบ้าง เรียงตามเวลา"
 * ต่างจากหน้ารายการจองที่เรียงตามใบจอง และปฏิทินที่เรียงตามคัน
 *
 * คนรับ-ส่งรถ (role DRIVER) เข้าได้ แต่เห็นเฉพาะงานของตัวเอง
 * และไม่เห็นงานที่ยังไม่มีคนรับ เพราะมอบหมายเองไม่ได้
 */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const today = bangkokDateStr(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? (sp.d as string) : today;

  const isDriver = me.role === "DRIVER";
  const rows = await scheduleForDay(date, isDriver ? me.id : null);
  const sum = summarize(rows);

  const tomorrow = bangkokDateStr(new Date(Date.now() + 86400000));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตารางรับ-ส่งรถ</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isDriver
              ? "คิวงานของคุณ เรียงตามเวลานัด"
              : "คิวงานทั้งหมด เรียงตามเวลานัด · งานที่ยังไม่มีคนรับขึ้นบนสุด"}
          </p>
        </div>

        <a
          href={`/api/admin/schedule.csv?d=${date}`}
          className="btn rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          ดาวน์โหลด CSV
        </a>
      </div>

      {/* ตัวเลขสรุปของวัน */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="ทั้งหมดวันนี้" value={sum.total} tone="slate" />
        <Stat label="ไปส่งรถ" value={sum.delivery} tone="blue" />
        <Stat label="ไปรับคืน" value={sum.pickup} tone="amber" />
        <Stat label="เสร็จแล้ว" value={sum.done} tone="emerald" />
        <Stat
          label={isDriver ? "เหลือ" : "ยังไม่มีคนรับ"}
          value={isDriver ? sum.left : sum.unassigned}
          tone={!isDriver && sum.unassigned > 0 ? "red" : "slate"}
        />
      </div>

      {/* เลือกวัน */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <DayLink href={`/admin/schedule`} active={date === today}>
          วันนี้
        </DayLink>
        <DayLink href={`/admin/schedule?d=${tomorrow}`} active={date === tomorrow}>
          พรุ่งนี้
        </DayLink>
        <form className="flex items-center gap-2" action="/admin/schedule">
          <label htmlFor="d" className="text-sm text-slate-500">
            เลือกวันที่
          </label>
          <input
            id="d"
            name="d"
            type="date"
            defaultValue={date}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            ดู
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          ไม่มีคิวรับ-ส่งรถในวันนี้
        </div>
      ) : (
        <>
          {/* จอใหญ่ — ตาราง */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <Th>เวลา</Th>
                  <Th>งาน</Th>
                  <Th>รถ</Th>
                  <Th>ลูกค้า</Th>
                  <Th>จุดนัด</Th>
                  <Th>เบอร์โทร</Th>
                  <Th>สถานะ</Th>
                  <Th>คนรับผิดชอบ</Th>
                  <Th>หมายเหตุ</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = rowStatus(r);
                  return (
                    <tr
                      key={`${r.bookingId}-${r.kind}`}
                      className={`border-t border-slate-100 ${
                        st === "unassigned" ? "bg-red-50/40" : ""
                      }`}
                    >
                      <Td>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatBangkokTime(r.at)}
                        </span>
                      </Td>
                      <Td>
                        <KindBadge kind={r.kind} />
                      </Td>
                      <Td>
                        <p className="font-medium text-slate-900">{r.carLabel}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {r.licensePlate}
                        </p>
                      </Td>
                      <Td>{r.customerName}</Td>
                      <Td>{r.place}</Td>
                      <Td>
                        <a
                          href={`tel:${r.phone.replace(/[\s-]/g, "")}`}
                          className="font-mono text-blue-700 hover:underline"
                        >
                          {r.phone}
                        </a>
                      </Td>
                      <Td>
                        <span
                          className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[st]}`}
                        >
                          {STATUS_TEXT[st]}
                        </span>
                      </Td>
                      <Td>
                        {r.assigneeName ?? (
                          <Link
                            href={`/admin/bookings?status=all#${r.bookingId}`}
                            className="text-red-700 font-medium hover:underline"
                          >
                            มอบหมายงาน →
                          </Link>
                        )}
                      </Td>
                      <Td className="text-slate-500">{r.note ?? "-"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* จอเล็ก — การ์ด ไม่ใช่ตารางเลื่อนแนวนอน */}
          <ul className="lg:hidden flex flex-col gap-3">
            {rows.map((r) => {
              const st = rowStatus(r);
              return (
                <li
                  key={`${r.bookingId}-${r.kind}`}
                  className={`bg-white rounded-2xl border p-4 ${
                    st === "unassigned" ? "border-red-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-slate-900">
                        {formatBangkokTime(r.at)}
                      </span>
                      <KindBadge kind={r.kind} />
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[st]}`}
                    >
                      {STATUS_TEXT[st]}
                    </span>
                  </div>

                  <p className="font-medium text-slate-900">
                    {r.carLabel}{" "}
                    <span className="font-mono text-xs text-slate-500">
                      {r.licensePlate}
                    </span>
                  </p>

                  <dl className="mt-2 text-sm flex flex-col gap-1">
                    <Row label="ลูกค้า">{r.customerName}</Row>
                    <Row label="จุดนัด">{r.place}</Row>
                    <Row label="เบอร์โทร">
                      <a
                        href={`tel:${r.phone.replace(/[\s-]/g, "")}`}
                        className="font-mono text-blue-700"
                      >
                        {r.phone}
                      </a>
                    </Row>
                    <Row label="คนรับผิดชอบ">
                      {r.assigneeName ?? (
                        <span className="text-red-700 font-medium">ยังไม่มีคนรับ</span>
                      )}
                    </Row>
                    {r.note && <Row label="หมายเหตุ">{r.note}</Row>}
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: ScheduleRow["kind"] }) {
  return (
    <span
      className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full border ${
        kind === "DELIVERY"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {HANDOFF_LABEL[kind]}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500 w-24 shrink-0">{label}</dt>
      <dd className="text-slate-900 min-w-0">{children}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-4 py-3 whitespace-nowrap">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

const TONE: Record<string, string> = {
  slate: "bg-white border-slate-200 text-slate-900",
  blue: "bg-blue-50 border-blue-200 text-blue-900",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  red: "bg-red-50 border-red-200 text-red-900",
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${TONE[tone]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function DayLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`btn px-4 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
      }`}
    >
      {children}
    </Link>
  );
}
