export const dynamic = "force-dynamic";

import Link from "next/link";
import { currentAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { bangkokDateStr, formatBangkokTime } from "@/lib/settings";
import { HANDOFF_LABEL } from "@/lib/assignments";
import {
  scheduleForDay,
  scheduleBetween,
  monthRange,
  groupByDay,
  summarize,
  rowStatus,
  STATUS_TEXT,
  STATUS_STYLE,
  type ScheduleRow,
} from "@/lib/schedule";
import { markJobAction } from "./actions";
import ActionButton from "@/components/ActionButton";
import AutoRefresh from "@/components/AutoRefresh";
import PrintButton from "@/components/PrintButton";
import { NOTICE } from "@/lib/ui";

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
  searchParams: Promise<{ d?: string; m?: string; ok?: string; error?: string }>;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const today = bangkokDateStr(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? (sp.d as string) : today;

  /* มีพารามิเตอร์ m = มุมมองรายเดือน
     เก็บ d ไว้เสมอ เพื่อให้สลับกลับมาโหมดวันแล้วยังอยู่วันเดิม */
  const monthly = /^\d{4}-\d{2}$/.test(sp.m ?? "");
  const month = monthly ? (sp.m as string) : date.slice(0, 7);

  const isDriver = me.role === "DRIVER";
  const onlyMe = isDriver ? me.id : null;

  const range = monthRange(month);
  const rows = monthly
    ? await scheduleBetween(range.start, range.end, onlyMe)
    : await scheduleForDay(date, onlyMe);

  const sum = summarize(rows);
  const days = monthly ? groupByDay(rows) : [];

  const tomorrow = bangkokDateStr(new Date(Date.now() + 86400000));

  // ลิงก์กลับมาหน้าเดิมหลังเปลี่ยนสถานะ จะได้ไม่เด้งไปวันนี้ทุกครั้ง
  const back = monthly ? `/admin/schedule?m=${month}` : `/admin/schedule?d=${date}`;
  const flash = FLASH[sp.ok ?? ""] ?? FLASH[sp.error ?? ""];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตารางรับ-ส่งรถ</h1>
          <p className="text-sm text-slate-500 mt-1">
            {monthly
              ? `ทั้งเดือน ${monthLabel(month)}${
                  isDriver ? " · เฉพาะงานของคุณ" : ""
                }`
              : isDriver
                ? "คิวงานของคุณ เรียงตามเวลานัด"
                : "คิวงานทั้งหมด เรียงตามเวลานัด · งานที่ยังไม่มีคนรับขึ้นบนสุด"}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <AutoRefresh seconds={60} />
          <PrintButton />
          <a
            href={
              monthly
                ? `/api/admin/schedule.csv?m=${month}`
                : `/api/admin/schedule.csv?d=${date}`
            }
            className="btn rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ดาวน์โหลด CSV
          </a>
        </div>
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
      <div className="no-print flex flex-wrap items-center gap-2 mb-5">
        <DayLink href={`/admin/schedule`} active={!monthly && date === today}>
          วันนี้
        </DayLink>
        <DayLink
          href={`/admin/schedule?d=${tomorrow}`}
          active={!monthly && date === tomorrow}
        >
          พรุ่งนี้
        </DayLink>
        <DayLink href={`/admin/schedule?m=${date.slice(0, 7)}`} active={monthly}>
          ทั้งเดือน
        </DayLink>
        <form className="flex items-center gap-2" action="/admin/schedule">
          <label htmlFor={monthly ? "m" : "d"} className="text-sm text-slate-500">
            {monthly ? "เลือกเดือน" : "เลือกวันที่"}
          </label>
          <input
            id={monthly ? "m" : "d"}
            name={monthly ? "m" : "d"}
            type={monthly ? "month" : "date"}
            defaultValue={monthly ? month : date}
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

      {flash && (
        <div
          role="alert"
          aria-live="polite"
          className={`no-print mb-5 text-sm px-4 py-3 rounded-xl border ${
            flash.tone === "ok" ? NOTICE.ok : NOTICE.error
          }`}
        >
          {flash.text}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          {monthly ? "ไม่มีคิวรับ-ส่งรถในเดือนนี้" : "ไม่มีคิวรับ-ส่งรถในวันนี้"}
        </div>
      ) : monthly ? (
        /* รายเดือน — แยกเป็นก้อนละวัน อ่านง่ายกว่าตารางยาวพันแถว
           และเห็นทันทีว่าวันไหนงานแน่นวันไหนว่าง */
        <div className="flex flex-col gap-6">
          {days.map((d) => (
            <section key={d.date}>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h2 className="font-semibold text-slate-900">{dayLabel(d.date)}</h2>
                <span className="text-xs text-slate-500">
                  {d.rows.length} งาน
                  {d.rows.filter((r) => !r.assignmentId).length > 0 && (
                    <span className="text-red-700 font-medium">
                      {" "}
                      · ยังไม่มีคนรับ {d.rows.filter((r) => !r.assignmentId).length}
                    </span>
                  )}
                </span>
              </div>
              <JobTable rows={d.rows} back={back} />
              <JobCards rows={d.rows} back={back} />
            </section>
          ))}
        </div>
      ) : (
        <>
          <JobTable rows={rows} back={back} />
          <JobCards rows={rows} back={back} />
        </>
      )}
    </div>
  );
}

/** ตารางสำหรับจอใหญ่ */
function JobTable({ rows, back }: { rows: ScheduleRow[]; back: string }) {
  return (
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
            <Th className="no-print">เปลี่ยนสถานะ</Th>
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
                  <p className="text-xs text-slate-500 font-mono">{r.licensePlate}</p>
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
                <Td className="no-print">
                  <MarkButtons row={r} back={back} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** การ์ดสำหรับจอเล็ก — ตารางเก้าคอลัมน์ใช้บนมือถือไม่ได้ */
function JobCards({ rows, back }: { rows: ScheduleRow[]; back: string }) {
  return (
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
              <span className="font-mono text-xs text-slate-500">{r.licensePlate}</span>
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

            <div className="mt-3 pt-3 border-t border-slate-100">
              <MarkButtons row={r} back={back} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const TH_MONTH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** "2026-09" → "กันยายน 2569" — ปีพุทธเหมือนที่ใช้ทั้งระบบ */
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${TH_MONTH[m - 1]} ${y + 543}`;
}

/** "2026-09-19" → "19 กันยายน 2569" */
function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${TH_MONTH[m - 1]} ${y + 543}`;
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

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`text-left font-medium px-4 py-3 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

/** ข้อความยืนยันหลังเปลี่ยนสถานะจากหน้านี้ */
const FLASH: Record<string, { text: string; tone: "ok" | "error" }> = {
  acked: { text: "บันทึกว่ารับทราบงานแล้ว", tone: "ok" },
  done: { text: "ปิดงานเรียบร้อยแล้ว", tone: "ok" },
  reset: { text: "ย้อนสถานะกลับเป็นรอรับทราบแล้ว", tone: "ok" },
  mark: { text: "ข้อมูลไม่ครบ กรุณาลองใหม่", tone: "error" },
  notfound: { text: "ไม่พบงานนี้ — อาจถูกถอนไปแล้ว", tone: "error" },
  forbidden: { text: "แก้ได้เฉพาะงานของตัวเองเท่านั้น", tone: "error" },
};

/**
 * ปุ่มเปลี่ยนสถานะงานจากหน้าเว็บ — สำรองไว้ให้ตอนคนรับ-ส่งลืมกดในแชท LINE
 * งานที่ยังไม่มีคนรับเปลี่ยนสถานะไม่ได้ ต้องไปมอบหมายก่อน
 */
function MarkButtons({ row, back }: { row: ScheduleRow; back: string }) {
  if (!row.assignmentId) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const st = rowStatus(row);
  return (
    <form action={markJobAction} className="flex flex-wrap gap-1.5">
      <input type="hidden" name="assignmentId" value={row.assignmentId} />
      <input type="hidden" name="back" value={back} />
      {st === "waiting" && (
        <ActionButton
          name="to"
          value="acked"
          pendingText="…"
          className="min-h-0 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          รับทราบ
        </ActionButton>
      )}
      {st !== "done" && (
        <ActionButton
          name="to"
          value="done"
          pendingText="…"
          confirm={`ปิดงาน ${HANDOFF_LABEL[row.kind]} เวลา ${formatBangkokTime(row.at)} น.\nของ ${row.customerName}\n\nยืนยันหรือไม่?`}
          className="min-h-0 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
        >
          ปิดงาน
        </ActionButton>
      )}
      {st !== "waiting" && (
        <ActionButton
          name="to"
          value="reset"
          pendingText="…"
          confirm="ย้อนสถานะงานนี้กลับเป็นรอรับทราบ\n\nยืนยันหรือไม่?"
          className="min-h-0 text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 disabled:opacity-60"
        >
          ย้อนสถานะ
        </ActionButton>
      )}
    </form>
  );
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
