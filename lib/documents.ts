/** เอกสารที่ลูกค้าต้องส่งก่อนรับรถ */

export const DOCUMENT_KINDS = ["ID_CARD", "DRIVER_LICENSE", "TRAVEL_PROOF"] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABEL: Record<DocumentKind, string> = {
  ID_CARD: "บัตรประชาชน / Passport",
  DRIVER_LICENSE: "ใบขับขี่",
  TRAVEL_PROOF: "เอกสารการจองเดินทาง / ที่พัก",
};

export const DOCUMENT_HINT: Record<DocumentKind, string> = {
  ID_CARD: "ถ่ายให้เห็นหน้าบัตรชัดเจน ชาวต่างชาติใช้หน้า Passport",
  DRIVER_LICENSE: "ต้องยังไม่หมดอายุ ชาวต่างชาติใช้ใบที่ใช้ในไทยได้",
  TRAVEL_PROOF: "เช่น ตั๋วเครื่องบิน ตั๋วรถ หรือใบยืนยันที่พัก",
};

export function isDocumentKind(value: unknown): value is DocumentKind {
  return DOCUMENT_KINDS.includes(value as DocumentKind);
}

/** ยังขาดเอกสารชนิดไหนบ้าง */
export function missingDocuments(uploaded: { kind: string }[]): DocumentKind[] {
  const have = new Set(uploaded.map((d) => d.kind));
  return DOCUMENT_KINDS.filter((k) => !have.has(k));
}

export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "ผ่านแล้ว",
  REJECTED: "ไม่ผ่าน",
};

export const DOC_STATUS_CLASS: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

/** เอกสารที่ยังต้องจัดการ — ยังไม่ส่ง หรือส่งแล้วไม่ผ่าน */
export function unresolvedDocuments(
  uploaded: { kind: string; status: string }[]
): DocumentKind[] {
  const ok = new Set(
    uploaded.filter((d) => d.status !== "REJECTED").map((d) => d.kind)
  );
  return DOCUMENT_KINDS.filter((k) => !ok.has(k));
}
