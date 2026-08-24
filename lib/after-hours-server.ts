import { prisma } from "@/lib/prisma";
import type { AfterHoursRate } from "@/lib/pricing";

/**
 * ดึงช่วงเวลาที่คิดค่าธรรมเนียมนอกเวลา (เฉพาะที่เปิดใช้งาน)
 * ไฟล์นี้แตะ prisma ได้ ส่วน lib/pricing.ts ห้าม เพราะ client component ใช้
 */
export async function getAfterHoursRates(): Promise<AfterHoursRate[]> {
  try {
    const rows = await prisma.afterHoursRate.findMany({
      where: { isActive: true },
      orderBy: { startMinute: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      fee: r.fee,
    }));
  } catch (err) {
    console.error("getAfterHoursRates failed:", err);
    return [];
  }
}

/** รวมทั้งที่ปิดใช้งานด้วย — สำหรับหน้าจัดการในหลังบ้าน */
export async function getAllAfterHoursRates() {
  return prisma.afterHoursRate.findMany({ orderBy: { startMinute: "asc" } });
}
