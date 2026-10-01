/**
 * ตัวอย่างข้อความ LINE ของแต่ละการแจ้งเตือน — สร้างจากฟังก์ชันการ์ดตัวจริงด้วยข้อมูลสมมติ
 * หน้าตั้งค่าจึงแสดงหน้าตาเดียวกับที่ลูกค้า/แอดมินได้รับเสมอ แม้จะแก้ดีไซน์การ์ดภายหลัง
 */
import {
  flexSlipReceived,
  flexDepositConfirmed,
  flexReadyForPickup,
  flexPickupReminder,
  flexReturnReminder,
  flexReturnComplete,
  flexSlipUploadedAdmin,
  flexNewBookingAdmin,
  flexUnassignedAdmin,
} from "@/lib/line-flex";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type SampleMessage = any;

const SITE = "https://example.com";
const ID = "sample0000000000demo";
const CAR = "Toyota Corolla Cross";
const day = (n: number, h: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return d;
};
const text = (t: string) => ({ type: "text", text: t });

export function sampleMessages(key: string): SampleMessage[] {
  switch (key) {
    case "customer_slip_received":
      return [
        flexSlipReceived({
          bookingId: ID,
          carLabel: CAR,
          missing: ["บัตรประชาชน / Passport", "ใบขับขี่"],
          bookingUrl: SITE,
          tripPlans: ["เชียงใหม่ · แม่ริม · ม่อนแจ่ม"],
        }),
      ];
    case "customer_deposit_confirmed":
      return [
        flexDepositConfirmed({ bookingId: ID, missing: ["ใบขับขี่"], bookingUrl: SITE }),
        flexReadyForPickup({
          bookingId: ID,
          carLabel: CAR,
          plate: "กข 1234",
          start: day(2, 10),
          end: day(5, 10),
          total: 6000,
          paid: 500,
          rentalBalance: 5500,
          securityDeposit: 3000,
          dueOnPickup: 8500,
          fees: [
            { title: "สูบบุหรี่ในรถ", amount: "3,000 บาท" },
            { title: "คืนรถก่อนกำหนด", amount: "ไม่คืนเงินทุกกรณี" },
          ],
          feesUrl: SITE,
          bookingUrl: SITE,
        }),
      ];
    case "customer_pickup_reminder":
      return [
        flexPickupReminder({
          bookingId: ID,
          carLabel: CAR,
          start: day(1, 10),
          pickupPlace: "สนามบินเชียงใหม่",
          bookingUrl: SITE,
        }),
      ];
    case "customer_return_reminder":
      return [
        flexReturnReminder({
          bookingId: ID,
          carLabel: CAR,
          plate: "กข 1234",
          end: day(0, 18),
          returnPlace: "สนามบินเชียงใหม่",
          headline: "อีกประมาณ 2 ชั่วโมง ถึงกำหนดคืนรถครับ",
          securityDeposit: 3000,
          feesUrl: SITE,
          bookingUrl: SITE,
        }),
      ];
    case "customer_return_complete":
      return [
        flexReturnComplete({
          bookingId: ID,
          carLabel: CAR,
          plate: "กข 1234",
          refundAmount: 3000,
          reviewedHours: 1,
          normalHours: 12,
          openHour: 8,
          closeHour: 20,
          reviewUrl: SITE,
          refundUrl: SITE,
        }),
      ];
    case "admin_slip_uploaded":
      return [
        flexSlipUploadedAdmin({
          bookingId: ID,
          carLabel: CAR,
          customerName: "สมชาย ใจดี",
          amount: 500,
          adminUrl: SITE,
        }),
      ];
    case "admin_documents_uploaded":
      return [
        text(
          "📄 ลูกค้าส่งเอกสารครบแล้ว\n\nลูกค้า: สมชาย ใจดี\nเบอร์: 0812345678\nรถ: " +
            CAR +
            "\nรหัสจอง: SAMPLE00\n\nกรุณาตรวจสอบเอกสารในหลังบ้าน"
        ),
      ];
    case "admin_new_request":
      return [
        flexNewBookingAdmin({
          bookingId: ID,
          carLabel: CAR,
          customerName: "สมชาย ใจดี",
          phone: "0812345678",
          start: day(3, 10),
          end: day(6, 10),
          total: 6000,
          isRequest: true,
          partnerName: "คุณมาลี (เจ้าของรถ)",
          partnerPhone: "0899999999",
          pickupPlace: "สนามบินเชียงใหม่",
          returnPlace: "สนามบินเชียงใหม่",
          adminUrl: SITE,
        }),
      ];
    case "admin_pickup_reply":
      return [
        text("✅ ลูกค้ายืนยันมารับรถแล้ว\nSAMPLE00 · " + CAR + "\nสมชาย ใจดี · รับ พรุ่งนี้ 10:00 น."),
        text("⚠️ ลูกค้าขอเปลี่ยนนัดรับรถ\nSAMPLE00 · " + CAR + "\nสมชาย ใจดี · 0812345678\nนัดเดิม พรุ่งนี้ 10:00 น."),
      ];
    case "admin_unassigned_jobs":
      return [
        flexUnassignedAdmin({
          count: 2,
          jobs: [
            "ไปส่งรถ · พรุ่งนี้ 10:00 น.\n   " + CAR + " (กข 1234) · สมชาย ใจดี",
            "ไปรับรถคืน · พรุ่งนี้ 18:00 น.\n   Honda City (ขค 5678) · มาลี ทดสอบ",
          ],
          more: 0,
          adminUrl: SITE,
        }),
      ];
    case "admin_unpaid_digest":
      return [
        text(
          "🧾 สรุปใบจองที่ยังไม่โอน (24 ชม.ล่าสุด)\n\nกำลังรอสลิป: 2 ใบ\nยกเลิกอัตโนมัติเพราะไม่โอน: 1 ใบ"
        ),
      ];
    default:
      return [];
  }
}
