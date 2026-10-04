/**
 * ช่วงวันที่ของแดชบอร์ด — แปลงค่าจาก URL เป็นช่วงเวลาไทย
 *
 * ?range=today|7d|month|lastmonth|year|all|custom  (ค่าเริ่มต้น month)
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD                    (ใช้กับ custom — นับ to รวมวันนั้นด้วย)
 * ?by=start|created                                (นับตามวันรับรถ หรือวันที่ลูกค้ากดจอง)
 *
 * ทุกช่วงคิดตามเวลาไทย (UTC+7 ไม่มีเวลาออมแสง) ไม่ใช่เวลาเซิร์ฟเวอร์
 * ไม่งั้นการจองตอนตีหนึ่งจะไปตกอยู่ในวันก่อนหน้า
 */

export type RangeKey = "today" | "7d" | "month" | "lastmonth" | "year" | "all" | "custom";
export type CountBy = "start" | "created";

export type DashboardRange = {
  key: RangeKey;
  by: CountBy;
  /** null = ไม่จำกัด (ทั้งหมด) */
  start: Date | null;
  end: Date | null;
  /** วันแรก/วันสุดท้ายแบบ YYYY-MM-DD สำหรับเติมในช่องเลือกวัน */
  fromStr: string;
  toStr: string;
  /** ป้ายอ่านง่าย เช่น "ต.ค. 2569" */
  label: string;
};

export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "7d", label: "7 วันล่าสุด" },
  { key: "month", label: "เดือนนี้" },
  { key: "lastmonth", label: "เดือนที่แล้ว" },
  { key: "year", label: "ปีนี้" },
  { key: "all", label: "ทั้งหมด" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** วันนี้ตามเวลาไทย [ปี, เดือน(1-12), วัน] */
function bangkokToday(): [number, number, number] {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return [y, m, d];
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** เที่ยงคืนเวลาไทยของวันนั้น */
const midnight = (s: string) => new Date(`${s}T00:00:00+07:00`);
/** วันถัดไปของสตริง YYYY-MM-DD */
function nextDay(s: string): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function addDays(s: string, n: number): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function thaiLabel(fromStr: string, toStr: string): string {
  const f = (s: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...opts }).format(midnight(s));
  if (fromStr === toStr) return f(fromStr, { day: "numeric", month: "short", year: "numeric" });
  return `${f(fromStr, { day: "numeric", month: "short" })} – ${f(toStr, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export function parseDashboardRange(sp: {
  range?: string;
  from?: string;
  to?: string;
  by?: string;
}): DashboardRange {
  const by: CountBy = sp.by === "created" ? "created" : "start";
  const [y, m, d] = bangkokToday();
  const today = ymd(y, m, d);

  let key = (RANGE_PRESETS.some((p) => p.key === sp.range) || sp.range === "custom"
    ? sp.range
    : "month") as RangeKey;

  let fromStr = today;
  let toStr = today;

  switch (key) {
    case "today":
      break;
    case "7d":
      fromStr = addDays(today, -6);
      break;
    case "month":
      fromStr = ymd(y, m, 1);
      toStr = ymd(y, m, lastDayOfMonth(y, m));
      break;
    case "lastmonth": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      fromStr = ymd(py, pm, 1);
      toStr = ymd(py, pm, lastDayOfMonth(py, pm));
      break;
    }
    case "year":
      fromStr = ymd(y, 1, 1);
      toStr = ymd(y, 12, 31);
      break;
    case "custom":
      if (sp.from && DATE_RE.test(sp.from) && sp.to && DATE_RE.test(sp.to)) {
        // สลับให้ถ้ากรอกกลับด้าน ดีกว่าขึ้นผลว่างเปล่าโดยไม่บอกเหตุผล
        [fromStr, toStr] = sp.from <= sp.to ? [sp.from, sp.to] : [sp.to, sp.from];
      } else {
        key = "month";
        fromStr = ymd(y, m, 1);
        toStr = ymd(y, m, lastDayOfMonth(y, m));
      }
      break;
    case "all":
      return { key, by, start: null, end: null, fromStr: "", toStr: "", label: "ทั้งหมด" };
  }

  return {
    key,
    by,
    start: midnight(fromStr),
    end: midnight(nextDay(toStr)),
    fromStr,
    toStr,
    label: thaiLabel(fromStr, toStr),
  };
}

/** เงื่อนไข Prisma ของช่วงนี้ — ใส่ใน where ของ Booking */
export function bookingDateWhere(r: DashboardRange) {
  if (!r.start || !r.end) return {};
  const range = { gte: r.start, lt: r.end };
  return r.by === "created" ? { createdAt: range } : { startDate: range };
}
