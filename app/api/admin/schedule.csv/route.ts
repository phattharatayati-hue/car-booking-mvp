import { currentAdmin } from "@/lib/roles";
import { bangkokDateStr, formatBangkokDateTime } from "@/lib/settings";
import { HANDOFF_LABEL } from "@/lib/assignments";
import {
  scheduleForDay,
  scheduleBetween,
  monthRange,
  rowStatus,
  STATUS_TEXT,
  filterRows,
  isScheduleFilter,
} from "@/lib/schedule";

export const dynamic = "force-dynamic";

/** ครอบค่าให้ปลอดภัยกับ CSV — คั่นด้วยจุลภาคและมีข้อความไทยที่อาจมีเครื่องหมายคำพูด */
function cell(v: string | null | undefined): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

/**
 * ตารางรับ-ส่งของวันหนึ่งเป็นไฟล์ CSV
 * เอาไปเปิดใน Excel หรือ Google Sheets ต่อเองได้ โดยไม่ต้องซิงก์อะไรค้างไว้
 */
export async function GET(request: Request) {
  const me = await currentAdmin();
  if (!me) return new Response("unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawDay = searchParams.get("d") ?? "";
  const rawMonth = searchParams.get("m") ?? "";

  const monthly = /^\d{4}-\d{2}$/.test(rawMonth);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? rawDay : bangkokDateStr(new Date());

  // คนรับ-ส่งรถโหลดได้เฉพาะงานของตัวเอง เหมือนที่เห็นบนหน้าจอ
  const onlyMe = me.role === "DRIVER" ? me.id : null;

  const all = monthly
    ? await scheduleBetween(
        monthRange(rawMonth).start,
        monthRange(rawMonth).end,
        onlyMe
      )
    : await scheduleForDay(date, onlyMe);

  // กรองแบบเดียวกับที่หน้าจอกำลังแสดงอยู่ — โหลดไปแล้วต้องได้ของที่เห็น
  const rawFilter = searchParams.get("f") ?? "all";
  const filter = isScheduleFilter(rawFilter) ? rawFilter : "all";
  const rows = filterRows(all, filter);

  const header = [
    "เวลา",
    "งาน",
    "รถ",
    "ทะเบียน",
    "ลูกค้า",
    "เบอร์โทร",
    "จุดนัด",
    "สถานะ",
    "คนรับผิดชอบ",
    "หมายเหตุ",
    "รหัสจอง",
  ];

  const lines = [
    header.map(cell).join(","),
    ...rows.map((r) =>
      [
        formatBangkokDateTime(r.at),
        HANDOFF_LABEL[r.kind],
        r.carLabel,
        r.licensePlate,
        r.customerName,
        r.phone,
        r.place,
        STATUS_TEXT[rowStatus(r)],
        r.assigneeName ?? "ยังไม่มีคนรับ",
        r.note ?? "",
        r.bookingId.slice(0, 8).toUpperCase(),
      ]
        .map(cell)
        .join(",")
    ),
  ];

  // BOM ข้างหน้า ไม่งั้น Excel บนวินโดวส์เปิดภาษาไทยเป็นตัวยึกยือ
  const body = "﻿" + lines.join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="schedule-${
        monthly ? rawMonth : date
      }${filter === "all" ? "" : `-${filter}`}.csv"`,
    },
  });
}
