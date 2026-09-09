import { prisma } from "@/lib/prisma";
import { bangkokDayRange, bangkokDateStr } from "@/lib/settings";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { HANDOFF_KINDS, type HandoffKind } from "@/lib/assignments";

/**
 * ข้อมูลของกระดานคิวรับ-ส่งรายวัน (/admin/schedule)
 *
 * หนึ่งแถว = หนึ่งงานที่ต้องวิ่งจริง ไม่ใช่หนึ่งการจอง
 * การจองหนึ่งใบให้สองแถวเสมอ — ไปส่งรถวันเริ่ม และไปรับคืนวันจบ
 *
 * แถวที่ยังไม่มีคนรับก็ต้องอยู่ในกระดานด้วย เพราะนั่นคือสิ่งที่ทำให้ลูกค้ารอเก้อ
 * ไม่ใช่งานที่มอบหมายแล้วซึ่งมีคนดูแลอยู่
 */

export type ScheduleRow = {
  /** id ของงานมอบหมาย — null คือยังไม่มีคนรับ */
  assignmentId: string | null;
  bookingId: string;
  kind: HandoffKind;
  /** เวลานัดเจอลูกค้า */
  at: Date;
  carLabel: string;
  licensePlate: string;
  customerName: string;
  phone: string;
  place: string;
  note: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  ackedAt: Date | null;
  doneAt: Date | null;
};

export type ScheduleStatus = "unassigned" | "waiting" | "acked" | "done";

export function rowStatus(r: ScheduleRow): ScheduleStatus {
  if (r.doneAt) return "done";
  if (!r.assignmentId) return "unassigned";
  if (r.ackedAt) return "acked";
  return "waiting";
}

export const STATUS_TEXT: Record<ScheduleStatus, string> = {
  unassigned: "ยังไม่มีคนรับ",
  waiting: "รอรับทราบ",
  acked: "รับทราบแล้ว",
  done: "เสร็จแล้ว",
};

export const STATUS_STYLE: Record<ScheduleStatus, string> = {
  unassigned: "bg-red-50 text-red-700 border-red-200",
  waiting: "bg-amber-50 text-amber-700 border-amber-200",
  acked: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/**
 * รวมคิวของวันหนึ่ง
 * @param dateStr วันที่แบบ YYYY-MM-DD ตามเวลาไทย
 * @param onlyAdminId ถ้าใส่มาจะเห็นเฉพาะงานของคนนั้น (ใช้กับ role DRIVER)
 */
export async function scheduleForDay(
  dateStr: string,
  onlyAdminId?: string | null
): Promise<ScheduleRow[]> {
  const day = bangkokDayRange(dateStr);
  return scheduleBetween(day.start, day.end, onlyAdminId);
}

/**
 * ช่วงเวลาของเดือน YYYY-MM ตามเวลาไทย
 * คิดจาก "วันที่ 1 ของเดือนถัดไป" แทนการบวก 30 วัน จะได้ไม่พลาดเดือนที่มี 28/31 วัน
 */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;

  return {
    start: bangkokDayRange(`${month}-01`).start,
    end: bangkokDayRange(`${nextY}-${String(nextM).padStart(2, "0")}-01`).start,
  };
}

/** คิวทั้งหมดในช่วงเวลาที่กำหนด — ใช้ได้ทั้งรายวันและรายเดือน */
export async function scheduleBetween(
  rangeStart: Date,
  rangeEnd: Date,
  onlyAdminId?: string | null
): Promise<ScheduleRow[]> {
  const day = { start: rangeStart, end: rangeEnd };

  // 1. งานที่มอบหมายแล้ว — ยึดเวลานัดจริงเป็นหลัก เพราะแอดมินแก้เวลาได้
  const assignments = await prisma.bookingAssignment.findMany({
    where: {
      meetAt: { gte: day.start, lt: day.end },
      ...(onlyAdminId ? { adminUserId: onlyAdminId } : {}),
    },
    include: {
      admin: { select: { id: true, name: true } },
      booking: { include: { car: true, customer: true } },
    },
  });

  const rows: ScheduleRow[] = assignments.map((a) => ({
    assignmentId: a.id,
    bookingId: a.bookingId,
    kind: a.kind as HandoffKind,
    at: a.meetAt,
    carLabel: `${a.booking.car.brand} ${a.booking.car.name}`,
    licensePlate: a.booking.car.licensePlate,
    customerName: a.booking.customer.fullName,
    phone: a.booking.customer.phone,
    place:
      a.place ??
      (a.kind === "DELIVERY"
        ? a.booking.pickupPlace ?? "-"
        : a.booking.returnPlace ?? "-"),
    note: a.note,
    assigneeId: a.admin.id,
    assigneeName: a.admin.name,
    ackedAt: a.ackedAt,
    doneAt: a.doneAt,
  }));

  /* 2. งานที่ยังไม่มีคนรับ — ดูจากการจองที่รับหรือคืนรถในวันนี้
        แล้วยังไม่มี assignment ของฝั่งนั้น
        คนรับ-ส่งรถไม่ต้องเห็น เพราะมอบหมายเองไม่ได้อยู่แล้ว */
  if (!onlyAdminId) {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        OR: [
          { startDate: { gte: day.start, lt: day.end } },
          { endDate: { gte: day.start, lt: day.end } },
        ],
      },
      include: { car: true, customer: true, assignments: true },
    });

    for (const b of bookings) {
      for (const kind of HANDOFF_KINDS) {
        const at = kind === "DELIVERY" ? b.startDate : b.endDate;
        if (at < day.start || at >= day.end) continue;
        if (b.assignments.some((a) => a.kind === kind)) continue;

        rows.push({
          assignmentId: null,
          bookingId: b.id,
          kind,
          at,
          carLabel: `${b.car.brand} ${b.car.name}`,
          licensePlate: b.car.licensePlate,
          customerName: b.customer.fullName,
          phone: b.customer.phone,
          place:
            (kind === "DELIVERY" ? b.pickupPlace : b.returnPlace) ?? "-",
          note: null,
          assigneeId: null,
          assigneeName: null,
          ackedAt: null,
          doneAt: null,
        });
      }
    }
  }

  // งานที่ยังไม่มีคนรับขึ้นก่อนเสมอ ที่เหลือเรียงตามเวลา
  return rows.sort((a, b) => {
    const aOpen = a.assignmentId ? 1 : 0;
    const bOpen = b.assignmentId ? 1 : 0;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return a.at.getTime() - b.at.getTime();
  });
}

export function summarize(rows: ScheduleRow[]) {
  return {
    total: rows.length,
    delivery: rows.filter((r) => r.kind === "DELIVERY").length,
    pickup: rows.filter((r) => r.kind === "PICKUP").length,
    done: rows.filter((r) => r.doneAt).length,
    left: rows.filter((r) => !r.doneAt).length,
    unassigned: rows.filter((r) => !r.assignmentId).length,
  };
}

/** จัดกลุ่มแถวตามวัน (คีย์เป็น YYYY-MM-DD เวลาไทย) เรียงวันจากน้อยไปมาก */
export function groupByDay(rows: ScheduleRow[]): { date: string; rows: ScheduleRow[] }[] {
  const map = new Map<string, ScheduleRow[]>();

  for (const r of rows) {
    const key = bangkokDateStr(r.at);
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, list]) => ({
      date,
      // ในมุมมองเดือน เรียงตามเวลาอย่างเดียว ไม่ต้องดันงานค้างขึ้นบนสุดของทั้งเดือน
      rows: [...list].sort((x, y) => x.at.getTime() - y.at.getTime()),
    }));
}
