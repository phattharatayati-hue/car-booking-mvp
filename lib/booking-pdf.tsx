import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { registerFonts } from "@/lib/receipt-pdf";
import { formatBangkokDate } from "@/lib/settings";

export type BookingPdfImage = { label: string; data: Buffer | null; format: "jpg" | "png" | null; note?: string };

export type BookingPdfData = {
  id: string;
  status: string;
  channel: string | null;
  createdAt: Date;
  customer: { fullName: string; phone: string; email: string | null };
  car: string;
  startDate: Date;
  endDate: Date;
  pickupPlace: string | null;
  returnPlace: string | null;
  totalPrice: number;
  discountAmount: number;
  discountLabel: string | null;
  deposit: { amount: number; status: string } | null;
  refund: string | null;
  note: string | null;
  adminNote: string | null;
  docs: { label: string; status: string; reason: string | null }[];
  images: BookingPdfImage[];
};

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Sarabun", fontSize: 11, color: "#132A22" },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 10, color: "#6B7C75", marginBottom: 12 },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 4, color: "#0B3B2E" },
  row: { flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#CBD5D0" },
  k: { width: 120, color: "#6B7C75" },
  v: { flex: 1 },
  imgTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  img: { objectFit: "contain", maxHeight: 700 },
});

const baht = (n: number) => `${n.toLocaleString("en-US")} บาท`;

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <View style={s.row}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v && v.length ? v : "-"}</Text>
    </View>
  );
}

function BookingDoc({ b }: { b: BookingPdfData }) {
  return (
    <Document title={`booking ${b.id}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>รายละเอียดการจอง</Text>
        <Text style={s.sub}>รหัสการจอง {b.id}</Text>

        <Text style={s.h2}>ลูกค้า</Text>
        <Row k="ชื่อ" v={b.customer.fullName} />
        <Row k="เบอร์โทร" v={b.customer.phone} />
        <Row k="อีเมล" v={b.customer.email} />

        <Text style={s.h2}>การเช่า</Text>
        <Row k="รถ" v={b.car} />
        <Row k="วันรับรถ" v={formatBangkokDate(b.startDate)} />
        <Row k="วันคืนรถ" v={formatBangkokDate(b.endDate)} />
        <Row k="จุดรับรถ" v={b.pickupPlace} />
        <Row k="จุดคืนรถ" v={b.returnPlace} />
        <Row k="สถานะ" v={b.status} />
        <Row k="ช่องทางจอง" v={b.channel} />
        <Row k="สร้างเมื่อ" v={formatBangkokDate(b.createdAt)} />

        <Text style={s.h2}>การเงิน</Text>
        <Row k="ยอดรวม" v={baht(b.totalPrice)} />
        <Row k="ส่วนลด" v={b.discountAmount ? `${baht(b.discountAmount)} ${b.discountLabel ?? ""}` : "-"} />
        <Row k="ค่าจอง" v={b.deposit ? `${baht(b.deposit.amount)} (${b.deposit.status})` : "-"} />
        <Row k="คืนเงินประกัน" v={b.refund} />

        <Text style={s.h2}>เอกสารที่ลูกค้าส่ง</Text>
        {b.docs.length === 0 ? (
          <Row k="-" v="ไม่มี" />
        ) : (
          b.docs.map((d, i) => (
            <Row key={i} k={d.label} v={`${d.status}${d.reason ? ` — ${d.reason}` : ""}`} />
          ))
        )}

        <Text style={s.h2}>หมายเหตุ</Text>
        <Row k="ของลูกค้า" v={b.note} />
        <Row k="ภายใน (แอดมิน)" v={b.adminNote} />
      </Page>

      {b.images.map((im, i) => (
        <Page key={i} size="A4" style={s.page}>
          <Text style={s.imgTitle}>{im.label}</Text>
          {im.data && im.format ? (
            <Image src={{ data: im.data, format: im.format }} style={s.img} />
          ) : (
            <Text>{im.note ?? "แสดงรูปในเอกสารนี้ไม่ได้"}</Text>
          )}
        </Page>
      ))}
    </Document>
  );
}

export async function renderBookingPdf(b: BookingPdfData, baseUrl: string): Promise<Buffer> {
  registerFonts(baseUrl);
  const stream = await pdf(<BookingDoc b={b} />).toBuffer();
  const chunks: Buffer[] = [];
  for await (const c of stream as unknown as AsyncIterable<Buffer | string>) chunks.push(Buffer.from(c));
  const buf = Buffer.concat(chunks);
  if (buf.length === 0) throw new Error("empty booking pdf");
  return buf;
}

/** react-pdf รองรับเฉพาะ JPEG/PNG — ดูจากไบต์แรกของไฟล์ ไม่เชื่อนามสกุล */
export function imageFormat(buf: Buffer): "jpg" | "png" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  return null;
}
