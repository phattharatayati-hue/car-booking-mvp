import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

/**
 * สรุปเงินประกันความเสียหาย สำหรับแสดงให้ลูกค้าเห็น
 *
 * ค่ากลางมาจาก /admin/settings — รถคันไหนตั้งเงินประกันเฉพาะคันไว้ในหน้าแก้ไขรถ
 * (และไม่เท่าค่ากลาง) จะถูกแจกแจงเป็น "เฉพาะ Fortuner 5,000 บาท"
 * ไม่ตั้งแยกเลย = ขึ้นแค่ค่ากลาง
 */

export type DepositException = {
  /** ชื่อรุ่น เช่น "Fortuner" — หลายรุ่นที่ยอดเท่ากันรวมเป็น "Fortuner, Camry" */
  label: string;
  amount: number;
};

export type DepositSummary = {
  defaultAmount: number;
  exceptions: DepositException[];
  /** "เงินประกันความเสียหาย 3,000 บาท · เฉพาะ Fortuner 5,000 บาท" */
  text: string;
  /** ข้อความคืนเงินประกันแบบบรรทัดเดียว (หน้าเว็บ) */
  refundNote: string;
  /** ข้อความคืนเงินประกันแยกบรรทัด (กล่องล่างการ์ด LINE) */
  refundLines: string[];
};

export const DEPOSIT_REFUND_LINES = [
  "กรณีคืนรถ ตรวจเช็ครถแล้วไม่มีความเสียหายใดๆ",
  "เติมน้ำมันเต็มถัง",
  "คืนเงินประกันเต็มจำนวน",
];

export const DEPOSIT_REFUND_NOTE =
  "กรณีคืนรถ ตรวจเช็ครถแล้วไม่มีความเสียหายใดๆ และเติมน้ำมันเต็มถัง คืนเงินประกันเต็มจำนวน";

const baht = (n: number) => `${n.toLocaleString()} บาท`;

export function depositText(defaultAmount: number, exceptions: DepositException[]): string {
  const extra = exceptions.map((e) => `เฉพาะ ${e.label} ${baht(e.amount)}`);
  return [`เงินประกันความเสียหาย ${baht(defaultAmount)}`, ...extra].join(" · ");
}

export async function getDepositSummary(): Promise<DepositSummary> {
  const settings = await getSettings();
  const defaultAmount = settings.securityDeposit;

  const cars = (await prisma.car.findMany({
    where: { status: "AVAILABLE", securityDeposit: { not: null } },
    select: { name: true, securityDeposit: true },
    orderBy: { name: "asc" },
  })) as { name: string; securityDeposit: number | null }[];

  // รวมตามยอด แล้วตัดชื่อรุ่นซ้ำ (หลายคันรุ่นเดียวกัน)
  const byAmount = new Map<number, Set<string>>();
  for (const c of cars) {
    if (c.securityDeposit == null || c.securityDeposit === defaultAmount) continue;
    const set = byAmount.get(c.securityDeposit) ?? new Set<string>();
    set.add(c.name);
    byAmount.set(c.securityDeposit, set);
  }

  const exceptions = [...byAmount.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([amount, names]) => ({ amount, label: [...names].join(", ") }));

  return {
    defaultAmount,
    exceptions,
    text: depositText(defaultAmount, exceptions),
    refundNote: DEPOSIT_REFUND_NOTE,
    refundLines: DEPOSIT_REFUND_LINES,
  };
}
