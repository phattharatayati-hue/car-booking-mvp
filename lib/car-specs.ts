/**
 * สเปครถที่แสดงให้ลูกค้าเห็น — ซีซี แรงม้า น้ำมันที่ใช้
 * ทุกช่องไม่บังคับ ช่องที่ว่างจะไม่แสดง
 */

export const FUEL_TYPES = [
  "แก๊สโซฮอล์ 91",
  "แก๊สโซฮอล์ 95",
  "แก๊สโซฮอล์ E20",
  "เบนซิน 95",
  "ดีเซล",
  "ไฮบริด (แก๊สโซฮอล์ 91/95)",
  "ไฟฟ้า (EV)",
] as const;

export const BODY_TYPES = [
  { value: "SEDAN", label: "เก๋ง" },
  { value: "SUV", label: "SUV / รถยกสูง" },
  { value: "MPV", label: "MPV / รถ 7 ที่นั่ง" },
  { value: "PICKUP", label: "กระบะ" },
] as const;

export type CarSpecs = {
  engineCc?: number | null;
  horsepower?: number | null;
  fuelType?: string | null;
};

/** รายการสเปคที่มีค่า — ใช้วาดเป็นป้ายหรือแถว */
export function specItems(c: CarSpecs): { key: string; label: string; value: string }[] {
  const out: { key: string; label: string; value: string }[] = [];
  if (c.engineCc) out.push({ key: "cc", label: "เครื่องยนต์", value: `${c.engineCc.toLocaleString()} cc` });
  if (c.horsepower) out.push({ key: "hp", label: "แรงม้า", value: `${c.horsepower.toLocaleString()} แรงม้า` });
  if (c.fuelType) out.push({ key: "fuel", label: "น้ำมัน", value: c.fuelType });
  return out;
}

/** แปลงค่าจากฟอร์ม: ว่าง = null, ไม่ส่งมา = undefined (ไม่แก้) */
export function optionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function optionalText(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  const s = String(v ?? "").trim().slice(0, 60);
  return s || null;
}
