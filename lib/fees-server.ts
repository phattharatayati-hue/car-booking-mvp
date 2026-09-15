import { prisma } from "@/lib/prisma";
import { DEFAULT_FEE_ITEMS, isFeeIconKey, type FeeItem } from "@/lib/fees";

/**
 * ค่าปรับที่ใช้แสดงจริง — อ่านจากตาราง FeeItem ที่แอดมินแก้ได้
 *
 * ถ้าตารางยังว่าง (ยังไม่ได้ seed) หรืออ่านฐานข้อมูลไม่ได้ จะคืนค่าตั้งต้นแทน
 * หน้าเว็บกับข้อความ LINE จึงไม่มีทางกลายเป็นหน้าว่างเพราะเรื่องนี้
 */
export async function getFeeItems(): Promise<FeeItem[]> {
  try {
    const rows = await prisma.feeItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    if (rows.length === 0) return DEFAULT_FEE_ITEMS;

    return rows.map((r) => ({
      // ไอคอนที่ไม่รู้จัก (เช่น แก้ชื่อในโค้ดแล้วแถวเก่ายังอ้างของเดิม) ไม่ควรทำหน้าพัง
      icon: isFeeIconKey(r.icon) ? r.icon : "ticket",
      title: r.title,
      amount: r.amount,
      note: r.note ?? undefined,
      highlight: r.highlight,
    }));
  } catch (err) {
    console.error("getFeeItems failed:", err);
    return DEFAULT_FEE_ITEMS;
  }
}

/** รายการที่ใช้แสดงแบบย่อ — ฟอร์มจอง การ์ดใน LINE และหน้าคู่มือ */
export async function getHighlightFees(): Promise<FeeItem[]> {
  const items = await getFeeItems();
  return items.filter((f) => f.highlight);
}

/** ของหลังบ้าน — เอาทุกแถวรวมที่ปิดใช้งานไว้ด้วย */
export async function getAllFeeItems() {
  return prisma.feeItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
