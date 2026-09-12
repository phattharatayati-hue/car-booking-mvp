import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/contact";
import { PAYMENT_LABEL, type ReceiptItem } from "@/lib/receipt";
import { formatBangkokDate } from "@/lib/settings";
import type { CompanyView, ReceiptView } from "@/components/ReceiptDoc";

/**
 * ใบเสร็จฉบับ PDF
 *
 * ทำแยกจาก components/ReceiptDoc.tsx เพราะ @react-pdf/renderer ไม่ได้ใช้ HTML/CSS จริง
 * มันมี element กับ style ของตัวเอง (คล้าย flexbox แต่ไม่ใช่ทั้งหมด)
 * สองไฟล์นี้จึงต้องแก้คู่กันเวลาเปลี่ยนหน้าตาเอกสาร
 *
 * ทำไมไม่ใช้ Chromium สั่งพิมพ์หน้า HTML แทน: puppeteer + chromium กินพื้นที่
 * ระดับ 50MB+ ต่อ serverless function ซึ่งเสี่ยงชนเพดานขนาดของ Vercel
 * ส่วนตัวนี้เป็น JS ล้วน ไม่กี่ MB
 */

const GREEN = "#0B3B2E";
const GOLD = "#C9A227";
const LINE = "#CBD5D0";
const INK = "#132A22";
const MUTED = "#6B7C75";

let fontsReady = false;

/**
 * ลงทะเบียนฟอนต์ไทย — ต้องเป็นไฟล์ .ttf เท่านั้น react-pdf อ่าน woff ไม่ได้
 *
 * โหลดผ่าน URL ของเว็บตัวเอง (public/fonts/) ไม่ใช่ path ในเครื่อง
 * เพราะไฟล์ใน public/ ไม่ได้ถูกรวมเข้า bundle ของ serverless function เสมอไป
 * แต่เสิร์ฟผ่าน HTTP ได้แน่นอน
 */
export function registerFonts(baseUrl: string) {
  if (fontsReady) return;

  Font.register({
    family: "Sarabun",
    fonts: [
      { src: `${baseUrl}/fonts/Sarabun-Regular.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/fonts/Sarabun-Bold.ttf`, fontWeight: 700 },
    ],
  });

  /* ภาษาไทยไม่มีช่องว่างระหว่างคำ ทั้งประโยคจึงถูกมองเป็น "คำเดียว"
     ถ้าคืนค่าเป็น [word] เฉย ๆ react-pdf จะขึ้นบรรทัดใหม่ไม่ได้เลย
     พอข้อความยาวเกินกล่องมันจะล้นออกไปแล้วถูกตัดหาย — อย่างที่อยู่ท้ายกระดาษ
     ที่กลายเป็น "จังหวัดเชียงให" โดยหายไปตัวสองตัวท้าย

     จึงซอยเป็นตัวอักษรให้ตัดบรรทัดตรงไหนก็ได้ แต่ต้องเก็บสระบน-ล่างกับวรรณยุกต์
     ไว้กับพยัญชนะตัวที่มันเกาะอยู่ ไม่งั้นจะมีสระลอยไปขึ้นบรรทัดใหม่ตัวเดียว */
  Font.registerHyphenationCallback((word) => {
    const clusters = word.match(
      /[\u0E00-\u0E7F][\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]*|[\s\S]/gu
    );
    return clusters && clusters.length > 0 ? clusters : [word];
  });

  fontsReady = true;
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 9,
    color: INK,
    paddingTop: 34,
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  row: { flexDirection: "row" },
  logo: { height: 62, width: 130, objectFit: "contain" },
  headRight: { textAlign: "right", fontSize: 8, lineHeight: 1.5 },
  headRightBox: { width: 320, paddingLeft: 12 },

  titleBar: { flexDirection: "row", marginTop: 14 },
  titleBox: { flex: 1, backgroundColor: GREEN, paddingVertical: 9, alignItems: "center" },
  titleEn: { fontSize: 17, fontWeight: 700, color: "#fff" },
  titleTh: { fontSize: 9, color: GOLD, marginTop: 1 },
  numBox: { width: 150, borderWidth: 1, borderColor: LINE, borderLeftWidth: 0 },
  numTop: {
    fontSize: 7,
    textAlign: "center",
    color: MUTED,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  numVal: { fontSize: 13, fontWeight: 700, textAlign: "center", color: GREEN, paddingVertical: 7 },

  infoWrap: { flexDirection: "row", borderWidth: 1, borderColor: LINE, borderTopWidth: 0 },
  infoLeft: { flex: 1.6, padding: 9, borderRightWidth: 1, borderRightColor: LINE },
  infoRight: { flex: 1, padding: 9 },
  fieldRow: { flexDirection: "row", marginBottom: 5 },
  fieldLabel: { width: 74 },
  fieldTh: { fontSize: 8, fontWeight: 700 },
  fieldEn: { fontSize: 6.5, color: MUTED },
  fieldVal: { flex: 1, fontSize: 8.5, lineHeight: 1.45 },

  th: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 8,
    textAlign: "center",
    paddingVertical: 5,
    paddingHorizontal: 3,
  },
  thEn: { fontSize: 6.5, fontWeight: 400, color: GOLD, textAlign: "center" },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 4 },

  sumRow: { flexDirection: "row", marginBottom: 3, alignItems: "stretch" },
  sumLabel: { flex: 1, paddingVertical: 4, paddingHorizontal: 5 },
  sumValue: {
    width: 110,
    textAlign: "right",
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: 700,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "#F2F6F4",
  },
  signBox: { flex: 1, padding: 8, alignItems: "center" },
  signImage: { height: 44, objectFit: "contain", marginBottom: 2 },
  footer: {
    marginTop: 12,
    backgroundColor: GREEN,
    color: "#fff",
    textAlign: "center",
    fontSize: 7.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});

const COLS = [30, 0, 48, 62, 55, 74]; // ความกว้างคอลัมน์ (0 = ยืดเต็มที่เหลือ)

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Field({ th, en, value }: { th: string; en: string; value: string }) {
  return (
    <View style={s.fieldRow}>
      <View style={s.fieldLabel}>
        <Text style={s.fieldTh}>{th}</Text>
        <Text style={s.fieldEn}>{en}</Text>
      </View>
      <Text style={s.fieldVal}>{value}</Text>
    </View>
  );
}

function Sum({
  th,
  en,
  value,
  strong,
}: {
  th: string;
  en: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={s.sumRow}>
      <View style={s.sumLabel}>
        <Text style={{ fontSize: 8.5, fontWeight: 700 }}>{th}</Text>
        <Text style={{ fontSize: 6.5, color: MUTED }}>{en}</Text>
      </View>
      <Text
        style={[
          s.sumValue,
          strong ? { backgroundColor: GREEN, color: "#fff", borderColor: GREEN } : {},
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ReceiptPdfDoc({
  r,
  company,
  baseUrl,
}: {
  r: ReceiptView;
  company: CompanyView;
  baseUrl: string;
}) {
  const blanks = Math.max(0, 8 - r.items.length);

  return (
    <Document title={`ใบเสร็จ ${r.number}`}>
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          {/* โลโก้จาก public/ — ส่ง URL เต็มเข้ามาเพราะฝั่งเซิร์ฟเวอร์โหลด path สั้นไม่ได้ */}
          <Image src={`${baseUrl}/receipt-logo.png`} style={s.logo} />
          <View style={s.headRightBox}>
            <Text style={[s.headRight, { fontWeight: 700 }]}>{COMPANY.nameTh}</Text>
            <Text style={s.headRight}>{company.address}</Text>
            <Text style={s.headRight}>
              เลขที่ผู้เสียภาษี {company.taxId} | ({company.branch})
            </Text>
          </View>
        </View>

        <View style={s.titleBar}>
          <View style={s.titleBox}>
            <Text style={s.titleEn}>Receipt</Text>
            <Text style={s.titleTh}>ใบเสร็จรับเงิน</Text>
          </View>
          <View style={s.numBox}>
            <Text style={s.numTop}>ต้นฉบับ / Original</Text>
            <Text style={s.numVal}>{r.number}</Text>
          </View>
        </View>

        <View style={s.infoWrap}>
          <View style={s.infoLeft}>
            <Field th="ชื่อลูกค้า" en="Customer Name" value={r.customerName} />
            <Field
              th="เลขที่ผู้เสียภาษี"
              en="Tax ID"
              value={r.taxId ? `${r.taxId}${r.branch ? ` (${r.branch})` : ""}` : "-"}
            />
            <Field
              th="ที่อยู่"
              en="Address"
              value={`${r.address || "-"}${r.phone ? `\nโทร ${r.phone}` : ""}`}
            />
          </View>
          <View style={s.infoRight}>
            <Field th="วันที่" en="Issue Date" value={`: ${formatBangkokDate(r.issuedAt)}`} />
            <Field
              th="ชำระโดย"
              en="Payment"
              value={`: ${PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}`}
            />
          </View>
        </View>

        {/* ตารางรายการ */}
        <View style={{ marginTop: 12 }}>
          <View style={[s.row, { backgroundColor: GREEN }]}>
            {[
              ["เลขที่", "No."],
              ["รายการ", "Description"],
              ["จำนวน", "Quantity"],
              ["ราคา/หน่วย", "Unit Price"],
              ["ส่วนลด", "Discount"],
              ["จำนวนเงิน (THB)", "Amount"],
            ].map(([th, en], i) => (
              <View key={th} style={COLS[i] ? { width: COLS[i] } : { flex: 1 }}>
                <Text style={s.th}>{th}</Text>
                <Text style={[s.thEn, { paddingBottom: 4 }]}>{en}</Text>
              </View>
            ))}
          </View>

          {r.items.map((it, i) => (
            <View
              key={i}
              style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: LINE }]}
            >
              <Text style={[s.td, { width: COLS[0], textAlign: "center" }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 1 }]}>{it.name}</Text>
              <Text style={[s.td, { width: COLS[2], textAlign: "center" }]}>
                {it.qty.toLocaleString()}
              </Text>
              <Text style={[s.td, { width: COLS[3], textAlign: "right" }]}>
                {money(it.unitPrice)}
              </Text>
              <Text style={[s.td, { width: COLS[4], textAlign: "right" }]}>
                {money(it.discount)}
              </Text>
              <Text style={[s.td, { width: COLS[5], textAlign: "right" }]}>
                {money(it.amount)}
              </Text>
            </View>
          ))}

          {/* แถวว่างให้ตารางสูงเท่ากันทุกใบ — เอกสารที่สูงไม่เท่ากันดูเหมือนของปลอม */}
          {Array.from({ length: blanks }).map((_, i) => (
            <View
              key={`b${i}`}
              style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: LINE }]}
            >
              <Text style={[s.td, { width: COLS[0] }]}> </Text>
              <Text style={[s.td, { flex: 1 }]}> </Text>
              <Text style={[s.td, { width: COLS[2] }]}> </Text>
              <Text style={[s.td, { width: COLS[3] }]}> </Text>
              <Text style={[s.td, { width: COLS[4] }]}> </Text>
              <Text style={[s.td, { width: COLS[5] }]}> </Text>
            </View>
          ))}
        </View>

        {/* ตัวอักษร + สรุปยอด */}
        <View style={[s.row, { marginTop: 12 }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View
              style={{
                backgroundColor: "#F2F6F4",
                borderWidth: 1,
                borderColor: LINE,
                padding: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ width: 56 }}>
                <Text style={{ fontSize: 8, fontWeight: 700 }}>จำนวนเงิน</Text>
                <Text style={{ fontSize: 6.5, color: MUTED }}>Amount</Text>
              </View>
              <Text style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700 }}>
                {r.totalText}
              </Text>
            </View>

            <Text style={{ fontSize: 8.5, fontWeight: 700, marginTop: 8, paddingLeft: 1 }}>
              การชำระเงิน (Conditions of Payments)
            </Text>
            <View style={[s.row, { marginTop: 4, flexWrap: "wrap" }]}>
              {(["CASH", "TRANSFER", "CHEQUE", "OTHER"] as const).map((m) => (
                <Text key={m} style={{ fontSize: 8, marginRight: 14 }}>
                  {r.paymentMethod === m ? "[x]" : "[ ]"} {PAYMENT_LABEL[m]}
                </Text>
              ))}
            </View>
            {r.paymentDetail ? (
              <Text style={{ fontSize: 8, marginTop: 5 }}>
                รายละเอียด: {r.paymentDetail}
              </Text>
            ) : null}
          </View>

          <View style={{ width: 215 }}>
            <Sum th="รวมเป็นเงิน" en="Subtotal" value={money(r.subtotal)} />
            <Sum th="หักส่วนลดพิเศษ" en="Special Discount" value={money(r.discount)} />
            <Sum th="ยอดรวมหลังหักส่วนลด" en="After Discount" value={money(r.total)} />
            <Sum th="จำนวนเงินรวมทั้งสิ้น" en="Total" value={money(r.total)} strong />
          </View>
        </View>

        {/* ลายเซ็น */}
        <View
          style={[s.row, { marginTop: 18, borderWidth: 1, borderColor: LINE }]}
        >
          <View style={[s.signBox, { borderRightWidth: 1, borderRightColor: LINE }]}>
            {r.customerSignatureUrl ? (
              <Image src={r.customerSignatureUrl} style={s.signImage} />
            ) : (
              <View style={{ height: 44 }} />
            )}
            <Text style={{ fontSize: 8, fontWeight: 700 }}>
              ผู้รับเงิน / Bill Receiver Signature
            </Text>
            <Text style={{ fontSize: 7.5, marginTop: 3 }}>วันที่ / Date ____________</Text>
          </View>

          <View style={[s.signBox, { borderRightWidth: 1, borderRightColor: LINE }]}>
            {r.stampUrl ? (
              <Image src={r.stampUrl} style={[s.signImage, { height: 50 }]} />
            ) : (
              <View style={{ height: 50 }} />
            )}
            <Text style={{ fontSize: 7.5, color: MUTED }}>ตราประทับบริษัท</Text>
          </View>

          <View style={s.signBox}>
            {r.signerSignatureUrl ? (
              <Image src={r.signerSignatureUrl} style={s.signImage} />
            ) : (
              <View style={{ height: 44 }} />
            )}
            <Text style={{ fontSize: 8, fontWeight: 700 }}>
              ผู้มีอำนาจลงนาม / Authorized Signature
            </Text>
            <Text style={{ fontSize: 7.5, marginTop: 3 }}>
              {r.signerName ?? "____________"}
            </Text>
          </View>
        </View>

        {r.voidedAt ? (
          <Text style={{ marginTop: 8, fontSize: 9, color: "#B42318", fontWeight: 700 }}>
            *** ใบเสร็จนี้ถูกยกเลิก {r.voidReason ? `— ${r.voidReason}` : ""} ***
          </Text>
        ) : null}

        <Text style={s.footer}>{company.address}</Text>
      </Page>
    </Document>
  );
}

/** สร้างไฟล์ PDF เป็น Buffer พร้อมส่งออกทาง HTTP */
export async function renderReceiptPdf(
  r: ReceiptView,
  company: CompanyView,
  baseUrl: string,
  /** รูปลายเซ็น/ตราประทับเก็บเป็น path ภายใน ต้องเติมโดเมนให้ react-pdf โหลดได้ */
  absolutize: (u: string | null) => string | null
): Promise<Buffer> {
  registerFonts(baseUrl);

  const doc = {
    ...r,
    customerSignatureUrl: absolutize(r.customerSignatureUrl),
    signerSignatureUrl: absolutize(r.signerSignatureUrl),
    stampUrl: absolutize(r.stampUrl),
  };

  /* pdf(...).toBuffer() คืน "สตรีม" ของ Node ไม่ใช่ Buffer ทั้งที่ชื่อบอกว่า Buffer
     ถ้าเอาไปห่อ Uint8Array ตรง ๆ จะได้ไฟล์ 0 ไบต์ที่ตอบ 200 ตามปกติ — พังแบบเงียบ
     จึงต้องอ่านสตรีมให้จบก่อนแล้วค่อยต่อเป็น Buffer เอง */
  const stream = await pdf(
    <ReceiptPdfDoc r={doc} company={company} baseUrl={baseUrl} />
  ).toBuffer();

  const chunks: Buffer[] = [];
  for await (const chunk of stream as unknown as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  // กันพังเงียบอีกชั้น ไฟล์ PDF ที่ถูกต้องต้องมีเนื้อหาเสมอ
  if (buffer.length === 0) {
    throw new Error("สร้าง PDF ได้ไฟล์เปล่า — ตรวจการตั้งค่าฟอนต์");
  }
  return buffer;
}
