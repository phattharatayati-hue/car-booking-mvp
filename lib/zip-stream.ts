import { deflateRawSync } from "node:zlib";

/**
 * ตัวเขียนไฟล์ ZIP แบบสตรีมมิง — ไม่พึ่งไลบรารีภายนอก
 *
 * ทำไมเขียนเอง: ต้องการแค่ "ใส่ไฟล์ทีละไฟล์แล้วส่งออกทันที" ซึ่งใช้โค้ดไม่ถึง 100 บรรทัด
 * และไม่ต้องเพิ่ม dependency ในระบบที่กำลังจะปิด
 *
 * ข้อจำกัดที่ตั้งใจไว้ (ไม่ใช้ ZIP64): รวมไม่เกิน 4GB และไม่เกิน 65,535 ไฟล์ — เกินแล้ว throw ชัด ๆ
 * ไม่ปล่อยให้ได้ไฟล์ ZIP พังเงียบ ๆ
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Entry = {
  name: Buffer;
  method: number;
  crc: number;
  csize: number;
  usize: number;
  offset: number;
};

/** เวลาแบบ DOS (ไม่มีเขตเวลา) — ใช้เวลาไทยให้ตรงกับที่คนเห็นในหน้าต่างไฟล์ */
function dosDateTime(now: Date): { time: number; date: number } {
  const t = new Date(now.getTime() + 7 * 3600 * 1000);
  const year = Math.max(1980, t.getUTCFullYear());
  return {
    time: (t.getUTCHours() << 11) | (t.getUTCMinutes() << 5) | (t.getUTCSeconds() >> 1),
    date: ((year - 1980) << 9) | ((t.getUTCMonth() + 1) << 5) | t.getUTCDate(),
  };
}

export class ZipWriter {
  private entries: Entry[] = [];
  private offset = 0;
  private stamp = dosDateTime(new Date());

  /**
   * เพิ่มหนึ่งไฟล์ คืนไบต์ที่ต้องส่งออกทันที
   * compress=true ใช้กับข้อความ (CSV) · PDF บีบมาแล้วจึงเก็บตรง ๆ
   */
  add(name: string, data: Uint8Array, compress: boolean): Buffer {
    if (this.entries.length >= 0xfffe) throw new Error("ไฟล์ใน ZIP มากเกินไป");
    const raw = Buffer.from(data);
    const body = compress ? deflateRawSync(raw) : raw;
    // ถ้าบีบแล้วไม่เล็กลง เก็บตรง ๆ ดีกว่า
    const useDeflate = compress && body.length < raw.length;
    const payload = useDeflate ? body : raw;
    const nameBuf = Buffer.from(name, "utf8");

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0x0800, 6); // ชื่อไฟล์เป็น UTF-8
    header.writeUInt16LE(useDeflate ? 8 : 0, 8);
    header.writeUInt16LE(this.stamp.time, 10);
    header.writeUInt16LE(this.stamp.date, 12);
    const crc = crc32(raw);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(payload.length, 18);
    header.writeUInt32LE(raw.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    this.entries.push({
      name: nameBuf,
      method: useDeflate ? 8 : 0,
      crc,
      csize: payload.length,
      usize: raw.length,
      offset: this.offset,
    });

    const chunk = Buffer.concat([header, nameBuf, payload]);
    this.offset += chunk.length;
    if (this.offset > 0xfffffff0) throw new Error("ZIP ใหญ่เกิน 4GB");
    return chunk;
  }

  /** ปิดท้ายไฟล์: สารบัญ (central directory) + ตัวจบ — เรียกครั้งเดียวหลังเพิ่มไฟล์ครบ */
  finish(): Buffer {
    const parts: Buffer[] = [];
    let cdSize = 0;
    for (const e of this.entries) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0);
      h.writeUInt16LE(20, 4);
      h.writeUInt16LE(20, 6);
      h.writeUInt16LE(0x0800, 8);
      h.writeUInt16LE(e.method, 10);
      h.writeUInt16LE(this.stamp.time, 12);
      h.writeUInt16LE(this.stamp.date, 14);
      h.writeUInt32LE(e.crc, 16);
      h.writeUInt32LE(e.csize, 20);
      h.writeUInt32LE(e.usize, 24);
      h.writeUInt16LE(e.name.length, 28);
      // extra, comment, disk, internal attr, external attr = 0
      h.writeUInt32LE(e.offset, 42);
      parts.push(h, e.name);
      cdSize += h.length + e.name.length;
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(cdSize, 12);
    end.writeUInt32LE(this.offset, 16);
    parts.push(end);
    return Buffer.concat(parts);
  }
}
