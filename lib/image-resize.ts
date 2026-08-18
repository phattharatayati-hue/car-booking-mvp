/**
 * ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด
 *
 * Vercel จำกัด request body ของ serverless function ไว้ราว 4.5MB
 * รูปจากมือถือทุกวันนี้เกินง่ายๆ แล้วจะถูกปฏิเสธด้วย 413 ก่อนถึงโค้ดเราเลย
 * ย่อฝั่ง client จึงแก้ที่ต้นเหตุ และได้ผลพลอยได้คือเว็บโหลดเร็วขึ้น
 *
 * ไฟล์นี้ใช้ได้เฉพาะฝั่ง client (ต้องมี document / canvas)
 */

/** ถ้าไฟล์เล็กและภาพไม่ใหญ่อยู่แล้ว ไม่ต้องแปลงซ้ำให้เสียคุณภาพ */
const SKIP_BELOW_BYTES = 1_200_000;

export type ShrinkOptions = {
  /** ด้านที่ยาวที่สุดหลังย่อ (พิกเซล) */
  maxEdge?: number;
  /** คุณภาพ JPEG 0-1 */
  quality?: number;
};

export async function shrinkImage(
  file: File,
  { maxEdge = 1600, quality = 0.85 }: ShrinkOptions = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    // from-image ให้เคารพ EXIF orientation ไม่งั้นรูปจากมือถือจะตะแคง
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // เบราว์เซอร์บางตัวถอด HEIC ไม่ได้ — ส่งไฟล์เดิมไป ให้ server เป็นคนบอกว่าไม่รองรับ
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);

  if (longest <= maxEdge && file.size <= SKIP_BELOW_BYTES) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, maxEdge / longest);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  // ย่อแล้วไม่ได้เล็กลงก็ไม่ต้องเปลี่ยน
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
