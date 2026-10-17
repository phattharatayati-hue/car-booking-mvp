import { prisma } from "@/lib/prisma";
import { PAYMENT_LABEL, type ReceiptItem } from "@/lib/receipt";

/**
 * ข้อมูลที่ส่งออกให้บริษัทตอนปิดระบบ (หน้า /admin/export)
 *
 * หลักการ
 *   - ระบุคอลัมน์เอง "ทุกช่อง" ไม่ใช้ spread ทั้งแถว — ฟิลด์ใหม่ในอนาคตจะไม่หลุดออกไปโดยไม่ตั้งใจ
 *   - ไม่ส่งออก: รหัสผ่าน/โทเคนทุกชนิด, เลขบัตรประชาชน, URL ไฟล์ใน Blob (ใช้ไม่ได้หลังปิดระบบ),
 *     เลขบัญชีคืนเงินที่โอนแล้ว (ระบบลบทิ้งตามนโยบายอยู่แล้ว)
 *   - เวลาทุกช่องเป็นเวลาไทย (UTC+7) รูปแบบ YYYY-MM-DD HH:mm:ss เรียงลำดับใน Excel ได้ตรง ๆ
 */

export type ExportOptions = {
  /** กรองใบเสร็จตามปี พ.ศ. (ใช้ตอนแบ่งดาวน์โหลดใบเสร็จ PDF ทีละปี) */
  receiptYear?: number | null;
  /** ใส่ชื่อไฟล์ PDF ลงในตารางใบเสร็จ — true เมื่อ ZIP นี้มี PDF จริง */
  withPdf?: boolean;
};

export type Dataset = {
  file: string;
  title: string;
  note: string;
  count: (o?: ExportOptions) => Promise<number>;
  build: (o: ExportOptions) => Promise<string>;
};

/* ---------- CSV ---------- */

/** ข้อความที่ต้องให้ Excel มองเป็นข้อความ (เบอร์โทร เลขผู้เสียภาษี) ไม่ให้ตัดเลข 0 หน้าทิ้ง */
export class Txt {
  constructor(readonly v: string) {}
}
const txt = (v: string | null | undefined) => (v ? new Txt(v) : null);

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Txt) {
    // เฉพาะตัวเลข/ขีด/เว้นวรรคเท่านั้นถึงใช้รูปแบบ ="..." (ปลอดภัยจากการแทรกสูตร) นอกนั้นเป็นข้อความธรรมดา
    if (/^\+?[0-9][0-9 -]*$/.test(v.v)) return `="${v.v}"`;
    return csvCell(v.v);
  }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = typeof v === "string" ? v : JSON.stringify(v);
  // กัน CSV injection: ข้อความที่ลูกค้าพิมพ์เองแล้วขึ้นต้นด้วย = @ + - จะถูก Excel มองเป็นสูตร
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]?[0-9][0-9 ()-]*$/.test(s))) {
    s = `'${s}`;
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** คืนข้อความ CSV (ขึ้นต้นด้วย BOM ให้ Excel อ่านภาษาไทยถูก, ขึ้นบรรทัดแบบ CRLF) */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** เวลาไทย YYYY-MM-DD HH:mm:ss */
export function ts(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const STATUS_TH: Record<string, string> = {
  REQUESTED: "รอเช็คกับเจ้าของรถ",
  REJECTED: "เจ้าของรถปฏิเสธ",
  PENDING_DEPOSIT: "รอค่าจอง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
};
const DEPOSIT_TH: Record<string, string> = {
  PENDING: "รอตรวจ",
  CONFIRMED: "ยืนยันแล้ว",
  REJECTED: "ไม่ผ่าน",
};
const KIND_TH: Record<string, string> = { DELIVERY: "ไปส่งรถ", PICKUP: "ไปรับรถคืน" };

/* ---------- ชุดข้อมูล ---------- */

export const DATASETS: Dataset[] = [
  {
    file: "bookings.csv",
    title: "การจองทั้งหมด (ไฟล์หลัก)",
    note: "ใบจองละหนึ่งแถว รวมลูกค้า รถ ค่าจอง เงินประกัน และเลขที่ใบเสร็จไว้ด้วยกัน — เริ่มดูจากไฟล์นี้",
    count: () => prisma.booking.count(),
    build: async () => {
      const rows = await prisma.booking.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          car: { include: { partner: true } },
          customer: true,
          deposit: true,
          refund: true,
          receipts: { select: { number: true, voidedAt: true }, orderBy: { seq: "asc" } },
        },
      });
      return toCsv(
        [
          "รหัสการจอง", "สถานะ", "ช่องทางจอง", "วันเวลารับรถ", "วันเวลาคืนรถ",
          "ทะเบียนรถ", "รถ", "เจ้าของรถ (พาร์ตเนอร์)",
          "ชื่อลูกค้า", "เบอร์โทรลูกค้า", "อีเมลลูกค้า",
          "ยอดรวม (บาท)", "ส่วนลด (บาท)", "ชื่อโปรโมชัน", "ค่าบริการแผนเดินทาง (บาท)",
          "จุดรับรถ", "จุดคืนรถ",
          "ค่าจอง (บาท)", "สถานะสลิปค่าจอง", "ยืนยันค่าจองเมื่อ",
          "เงินประกัน (บาท)", "ยอดหักจากเงินประกัน (บาท)", "เหตุผลที่หัก", "โอนคืนเงินประกันเมื่อ",
          "เลขที่ใบเสร็จ", "หมายเหตุ", "หมายเหตุภายใน", "เหตุผลที่ยกเลิก",
          "สร้างเมื่อ", "แก้ไขล่าสุด",
        ],
        rows.map((b) => [
          b.id, STATUS_TH[b.status] ?? b.status, b.channel, ts(b.startDate), ts(b.endDate),
          b.car.licensePlate, `${b.car.brand} ${b.car.name}`, b.car.partner?.name,
          b.customer.fullName, txt(b.customer.phone), b.customer.email,
          b.totalPrice, b.discountAmount, b.discountLabel, b.tripSurcharge,
          b.pickupPlace, b.returnPlace,
          b.deposit?.amount, b.deposit ? (DEPOSIT_TH[b.deposit.status] ?? b.deposit.status) : "",
          ts(b.deposit?.confirmedAt),
          b.refund?.depositAmount, b.refund?.deductAmount, b.refund?.deductReason, ts(b.refund?.paidAt),
          b.receipts.map((r) => (r.voidedAt ? `${r.number} (ยกเลิก)` : r.number)).join("; "),
          b.note, b.adminNote, b.cancelReason,
          ts(b.createdAt), ts(b.updatedAt),
        ])
      );
    },
  },
  {
    file: "customers.csv",
    title: "ลูกค้า",
    note: "ไม่รวมเลขบัตรประชาชน · LINE User ID ใช้จับคู่กับผู้ติดตาม LINE OA เดิมเท่านั้น",
    count: () => prisma.customer.count(),
    build: async () => {
      const rows = await prisma.customer.findMany({
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { bookings: true } } },
      });
      return toCsv(
        ["รหัสลูกค้า", "ชื่อ-นามสกุล", "เบอร์โทร", "อีเมล", "LINE User ID", "อยู่ใน Blacklist", "จำนวนการจอง", "สร้างเมื่อ"],
        rows.map((c) => [
          c.id, c.fullName, txt(c.phone), c.email, c.lineUserId, c.isBlacklisted, c._count.bookings, ts(c.createdAt),
        ])
      );
    },
  },
  {
    file: "receipts.csv",
    title: "ใบเสร็จรับเงิน",
    note: "ข้อมูลหัวใบเสร็จ ณ วันที่ออก รวมใบที่ยกเลิก (ดูคอลัมน์ 'ยกเลิกเมื่อ')",
    count: (o) => prisma.receipt.count({ where: o?.receiptYear ? { year: o.receiptYear } : {} }),
    build: async (o) => {
      const rows = await prisma.receipt.findMany({
        where: o.receiptYear ? { year: o.receiptYear } : {},
        orderBy: [{ year: "asc" }, { seq: "asc" }],
        include: { issuedBy: { select: { name: true } } },
      });
      return toCsv(
        [
          "เลขที่ใบเสร็จ", "ออกเมื่อ", "รหัสการจอง", "ชื่อในใบเสร็จ", "เลขผู้เสียภาษี", "สาขา", "ที่อยู่", "เบอร์โทร",
          "รวมก่อนลด (บาท)", "ส่วนลด (บาท)", "รวมสุทธิ (บาท)", "จำนวนเงินเป็นตัวอักษร",
          "วิธีชำระ", "รายละเอียดการชำระ", "ผู้ลงนาม", "ผู้ออกใบเสร็จ", "ส่งเข้า LINE ลูกค้าเมื่อ",
          "ยกเลิกเมื่อ", "เหตุผลที่ยกเลิก", "ไฟล์ PDF",
        ],
        rows.map((r) => [
          r.number, ts(r.issuedAt), r.bookingId, r.customerName, txt(r.taxId), r.branch, r.address, txt(r.phone),
          r.subtotal, r.discount, r.total, r.totalText,
          PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod, r.paymentDetail, r.signerName, r.issuedBy?.name,
          ts(r.sentToLineAt), ts(r.voidedAt), r.voidReason,
          o.withPdf ? `receipts/${r.number}.pdf` : "",
        ])
      );
    },
  },
  {
    file: "receipt_items.csv",
    title: "รายการในใบเสร็จ",
    note: "รายการสินค้า/บริการทีละบรรทัด เชื่อมกับ receipts.csv ด้วยเลขที่ใบเสร็จ",
    count: async (o) => {
      const rows = await prisma.receipt.findMany({
        where: o?.receiptYear ? { year: o.receiptYear } : {},
        select: { items: true },
      });
      return rows.reduce((n, r) => n + ((r.items as unknown as ReceiptItem[])?.length ?? 0), 0);
    },
    build: async (o) => {
      const rows = await prisma.receipt.findMany({
        where: o.receiptYear ? { year: o.receiptYear } : {},
        orderBy: [{ year: "asc" }, { seq: "asc" }],
        select: { number: true, items: true },
      });
      const out: unknown[][] = [];
      for (const r of rows) {
        ((r.items as unknown as ReceiptItem[]) ?? []).forEach((it, i) =>
          out.push([r.number, i + 1, it.name, it.qty, it.unitPrice, it.discount, it.amount])
        );
      }
      return toCsv(
        ["เลขที่ใบเสร็จ", "ลำดับ", "รายการ", "จำนวน", "ราคาต่อหน่วย (บาท)", "ส่วนลด (บาท)", "จำนวนเงิน (บาท)"],
        out
      );
    },
  },
  {
    file: "deposits.csv",
    title: "ค่าจอง (สลิปโอน)",
    note: "ยอดและสถานะ — ไม่รวมรูปสลิป",
    count: () => prisma.deposit.count(),
    build: async () => {
      const rows = await prisma.deposit.findMany({ orderBy: { createdAt: "asc" } });
      return toCsv(
        ["รหัสการจอง", "จำนวนเงิน (บาท)", "สถานะ", "ยืนยันเมื่อ", "บันทึกเมื่อ"],
        rows.map((d) => [d.bookingId, d.amount, DEPOSIT_TH[d.status] ?? d.status, ts(d.confirmedAt), ts(d.createdAt)])
      );
    },
  },
  {
    file: "refunds.csv",
    title: "การคืนเงินประกัน",
    note: "เลขบัญชีลูกค้าแสดงเฉพาะรายที่ 'ยังไม่ได้โอนคืน' เพื่อให้บริษัทโอนต่อได้ — รายที่โอนแล้วไม่มี",
    count: () => prisma.depositRefund.count(),
    build: async () => {
      const rows = await prisma.depositRefund.findMany({ orderBy: { createdAt: "asc" } });
      return toCsv(
        [
          "รหัสการจอง", "เงินประกัน (บาท)", "ยอดหัก (บาท)", "เหตุผลที่หัก", "ลูกค้าแจ้งว่ารีวิวแล้ว",
          "วิธีรับเงินคืน", "ชื่อบัญชี", "เลขบัญชี/พร้อมเพย์", "ธนาคาร",
          "ลูกค้ากรอกบัญชีเมื่อ", "กำหนดโอนคืน", "โอนคืนแล้วเมื่อ", "โอนโดย", "สถานะ",
        ],
        rows.map((r) => {
          const pending = !r.paidAt && !r.purgedAt;
          return [
            r.bookingId, r.depositAmount, r.deductAmount, r.deductReason, r.reviewed,
            r.method, pending ? r.accountName : "", pending ? txt(r.accountNo) : "", pending ? r.bankName : "",
            ts(r.submittedAt), ts(r.dueAt), ts(r.paidAt), r.paidBy,
            r.paidAt ? "โอนคืนแล้ว" : r.submittedAt ? "รอโอนคืน" : "รอลูกค้ากรอกบัญชี",
          ];
        })
      );
    },
  },
  {
    file: "assignments.csv",
    title: "งานรับ-ส่งรถ",
    note: "ใครไปส่ง/รับรถ เวลานัด สถานที่ เลขไมล์ และระดับน้ำมัน",
    count: () => prisma.bookingAssignment.count(),
    build: async () => {
      const rows = await prisma.bookingAssignment.findMany({
        orderBy: { meetAt: "asc" },
        include: { admin: { select: { name: true } } },
      });
      return toCsv(
        ["รหัสการจอง", "ประเภทงาน", "ผู้รับงาน", "เวลานัดเจอลูกค้า", "สถานที่", "หมายเหตุ", "รับทราบเมื่อ", "ปิดงานเมื่อ", "เลขไมล์", "ระดับน้ำมัน"],
        rows.map((a) => [
          a.bookingId, KIND_TH[a.kind] ?? a.kind, a.admin.name, ts(a.meetAt), a.place, a.note,
          ts(a.ackedAt), ts(a.doneAt), a.odometer, a.fuelLevel,
        ])
      );
    },
  },
  {
    file: "trip_plans.csv",
    title: "แผนเดินทางของแต่ละใบจอง",
    note: "สถานที่ที่ลูกค้าเลือกไปและค่าบริการเพิ่ม ณ วันที่จอง",
    count: () => prisma.bookingTripPlan.count(),
    build: async () => {
      const rows = await prisma.bookingTripPlan.findMany({ orderBy: [{ bookingId: "asc" }, { sortOrder: "asc" }] });
      return toCsv(
        ["รหัสการจอง", "ลำดับ", "จังหวัด", "อำเภอ", "สถานที่", "นอกพื้นที่บริการ", "ค่าบริการเพิ่ม (บาท)"],
        rows.map((p) => [p.bookingId, p.sortOrder, p.province, p.district, p.placeName, p.outsideArea, p.surcharge])
      );
    },
  },
  {
    file: "cars.csv",
    title: "รถ",
    note: "รวมราคาทุนของรถพาร์ตเนอร์ — ข้อมูลภายในบริษัท",
    count: () => prisma.car.count(),
    build: async () => {
      const rows = await prisma.car.findMany({ orderBy: { createdAt: "asc" }, include: { partner: true } });
      return toCsv(
        [
          "รหัสรถ", "ยี่ห้อ", "รุ่น", "ทะเบียน", "ราคาต่อวัน (บาท)", "ราคาทุนต่อวัน (บาท)",
          "ค่าจองเฉพาะคัน (บาท)", "เงินประกันเฉพาะคัน (บาท)", "ประเภทตัวถัง", "ขนาดเครื่อง (cc)", "แรงม้า", "เชื้อเพลิง",
          "แหล่งที่มา", "สถานะ", "เจ้าของรถ (พาร์ตเนอร์)", "สร้างเมื่อ",
        ],
        rows.map((c) => [
          c.id, c.brand, c.name, c.licensePlate, c.pricePerDay, c.costPerDay,
          c.bookingFee, c.securityDeposit, c.bodyType, c.engineCc, c.horsepower, c.fuelType,
          c.source === "OWN" ? "รถของบริษัท" : "รถพาร์ตเนอร์", c.status === "AVAILABLE" ? "พร้อมให้เช่า" : "ปิดให้เช่า",
          c.partner?.name, ts(c.createdAt),
        ])
      );
    },
  },
  {
    file: "car_rates.csv",
    title: "ราคาตามช่วงวัน / ช่วงปิดรับจอง",
    note: "เรทพิเศษและช่วงที่ปิดรับจองของรถแต่ละคัน",
    count: () => prisma.carRate.count(),
    build: async () => {
      const rows = await prisma.carRate.findMany({
        orderBy: [{ carId: "asc" }, { startDate: "asc" }],
        include: { car: { select: { licensePlate: true } } },
      });
      return toCsv(
        ["ทะเบียนรถ", "ประเภท", "ชื่อช่วง", "เริ่ม", "สิ้นสุด (รวมวันนี้)", "ราคาต่อวัน (บาท)", "เช่าขั้นต่ำ (วัน)", "หมายเหตุ"],
        rows.map((r) => [
          r.car.licensePlate, r.kind === "PRICE" ? "ตั้งราคา" : "ปิดรับจอง", r.label,
          ts(r.startDate).slice(0, 10), ts(r.endDate).slice(0, 10), r.pricePerDay, r.minDays, r.note,
        ])
      );
    },
  },
  {
    file: "partners.csv",
    title: "เจ้าของรถ (พาร์ตเนอร์)",
    note: "ชื่อและเบอร์ติดต่อ",
    count: () => prisma.partner.count(),
    build: async () => {
      const rows = await prisma.partner.findMany({ orderBy: { createdAt: "asc" } });
      return toCsv(
        ["รหัส", "ชื่อ", "เบอร์โทร", "LINE ID", "หมายเหตุ", "ใช้งานอยู่", "สร้างเมื่อ"],
        rows.map((p) => [p.id, p.name, txt(p.phone), p.lineId, p.note, p.isActive, ts(p.createdAt)])
      );
    },
  },
  {
    file: "settings.csv",
    title: "ตั้งค่าระบบ",
    note: "ค่าค่าจอง เงินประกัน ค่าปรับ ข้อมูลหัวใบเสร็จ ฯลฯ (ชื่อคอลัมน์ตามโค้ดเดิม)",
    count: async () => 1,
    build: async () => {
      const s = await prisma.settings.findUnique({ where: { id: "default" } });
      const rows = Object.entries(s ?? {})
        .filter(([k]) => k !== "stampUrl" && k !== "signerAdminUserId")
        .map(([k, v]) => [k, v instanceof Date ? ts(v) : v]);
      return toCsv(["ชื่อค่า", "ค่า"], rows);
    },
  },
  {
    file: "pricing_and_fees.csv",
    title: "ค่าปรับ/ค่าบริการเพิ่มเติม",
    note: "รายการที่แสดงบนหน้าเว็บ (หน้าค่าธรรมเนียม)",
    count: () => prisma.feeItem.count(),
    build: async () => {
      const rows = await prisma.feeItem.findMany({ orderBy: { sortOrder: "asc" } });
      return toCsv(
        ["ลำดับ", "รายการ", "จำนวนเงิน/เงื่อนไข", "หมายเหตุ", "แสดงในสรุปย่อ", "ใช้งานอยู่"],
        rows.map((f) => [f.sortOrder, f.title, f.amount, f.note, f.highlight, f.isActive])
      );
    },
  },
  {
    file: "promotions.csv",
    title: "โปรโมชัน",
    note: "ส่วนลดตามช่วงวัน",
    count: () => prisma.promotion.count(),
    build: async () => {
      const rows = await prisma.promotion.findMany({ orderBy: { startDate: "asc" } });
      return toCsv(
        ["ชื่อโปรโมชัน", "เริ่ม", "สิ้นสุด (รวมวันนี้)", "เช่าขั้นต่ำ (วัน)", "ลดต่อวัน (บาท)", "เพดานส่วนลด (บาท)", "ใช้งานอยู่"],
        rows.map((p) => [p.name, ts(p.startDate).slice(0, 10), ts(p.endDate).slice(0, 10), p.minDays, p.discountPerDay, p.maxDiscount, p.isActive])
      );
    },
  },
  {
    file: "pickup_points.csv",
    title: "จุดรับ-ส่งรถ",
    note: "รวมค่าบริการรับ-ส่ง",
    count: () => prisma.pickupPoint.count(),
    build: async () => {
      const rows = await prisma.pickupPoint.findMany({ orderBy: { sortOrder: "asc" } });
      return toCsv(
        ["ลำดับ", "ชื่อจุด", "ค่าบริการ (บาท)", "ใช้งานอยู่"],
        rows.map((p) => [p.sortOrder, p.name, p.fee, p.isActive])
      );
    },
  },
  {
    file: "after_hours_rates.csv",
    title: "ค่าธรรมเนียมนอกเวลาทำการ",
    note: "ช่วงเวลาเป็นเวลาไทย (HH:MM)",
    count: () => prisma.afterHoursRate.count(),
    build: async () => {
      const rows = await prisma.afterHoursRate.findMany({ orderBy: { startMinute: "asc" } });
      return toCsv(
        ["ชื่อช่วง", "เริ่ม", "สิ้นสุด", "ค่าธรรมเนียมต่อครั้ง (บาท)", "ใช้งานอยู่"],
        rows.map((r) => [r.label, hhmm(r.startMinute), hhmm(r.endMinute), r.fee, r.isActive])
      );
    },
  },
  {
    file: "trip_places.csv",
    title: "สถานที่ท่องเที่ยวและเรทพื้นที่",
    note: "สถานที่ในแผนเดินทาง ค่าบริการเพิ่ม และข้อจำกัดรถ",
    count: () => prisma.tripPlace.count(),
    build: async () => {
      const rows = await prisma.tripPlace.findMany({ orderBy: { sortOrder: "asc" } });
      return toCsv(
        ["สถานที่", "จังหวัด", "อำเภอ", "ค่าบริการเพิ่ม (บาท)", "ทางชันมาก", "ห้ามรถเก๋ง", "หมายเหตุภายใน", "ใช้งานอยู่"],
        rows.map((p) => [p.name, p.province, p.district, p.surcharge, p.steep, p.noSedan, p.note, p.isActive])
      );
    },
  },
  {
    file: "admin_users.csv",
    title: "บัญชีผู้ใช้หลังบ้าน",
    note: "ชื่อ อีเมล และสิทธิ์ — ไม่มีรหัสผ่านและโทเคนใด ๆ",
    count: () => prisma.adminUser.count(),
    build: async () => {
      const rows = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
      return toCsv(
        ["รหัส", "ชื่อ", "อีเมล", "สิทธิ์", "สร้างเมื่อ"],
        rows.map((u) => [u.id, u.name, u.email, u.role, ts(u.createdAt)])
      );
    },
  },
  {
    file: "audit_log.csv",
    title: "ประวัติการใช้งานหลังบ้าน",
    note: "ใครทำอะไรเมื่อไร ตั้งแต่เริ่มใช้ระบบ",
    count: () => prisma.auditLog.count(),
    build: async () => {
      const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
      return toCsv(
        ["เวลา", "ผู้ทำ", "สิทธิ์", "รหัสการกระทำ", "ชนิดข้อมูล", "รหัสข้อมูล", "สรุป", "รายละเอียด"],
        rows.map((a) => [ts(a.createdAt), a.actorName, a.actorRole, a.action, a.entity, a.entityId, a.summary, a.detail])
      );
    },
  },
];

/** ไฟล์ที่ใส่ใน ZIP ตามขอบเขต: all = ทุกอย่าง · data = CSV อย่างเดียว · receipts = ใบเสร็จ (รายปี) */
export function datasetsForScope(scope: "all" | "data" | "receipts"): Dataset[] {
  if (scope === "receipts") {
    return DATASETS.filter((d) => d.file === "receipts.csv" || d.file === "receipt_items.csv");
  }
  return DATASETS;
}
