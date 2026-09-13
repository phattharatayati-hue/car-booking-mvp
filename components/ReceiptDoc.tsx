import { COMPANY } from "@/lib/contact";
import { PAYMENT_LABEL, type ReceiptItem } from "@/lib/receipt";
import { formatBangkokDate } from "@/lib/settings";

/**
 * เอกสารใบเสร็จ — ใช้ตัวเดียวกันทั้งหน้าปริ้นของแอดมินและลิงก์ที่ส่งให้ลูกค้า
 *
 * จัดหน้าเป็น A4 ด้วยหน่วย mm ตรง ๆ ไม่ใช้ระบบ spacing ของ Tailwind
 * เพราะเอกสารนี้ต้องออกมาเท่ากันเป๊ะทุกเครื่องพิมพ์ ไม่ใช่ยืดตามหน้าจอ
 *
 * ยังไม่มี VAT ตามที่ร้านใช้จริง — ถ้าจดทะเบียนภาษีเมื่อไหร่ ต้องเพิ่มบรรทัด
 * ภาษีมูลค่าเพิ่มในกล่องสรุปยอด และเปลี่ยนหัวเอกสารเป็น "ใบเสร็จรับเงิน/ใบกำกับภาษี"
 */

export type ReceiptView = {
  number: string;
  issuedAt: Date;
  customerName: string;
  taxId: string | null;
  branch: string | null;
  address: string | null;
  phone: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  totalText: string;
  paymentMethod: string;
  paymentDetail: string | null;
  customerSignatureUrl: string | null;
  signerName: string | null;
  signerSignatureUrl: string | null;
  stampUrl: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
};

export type CompanyView = {
  taxId: string;
  branch: string;
  address: string;
};

const GREEN = "#0B3B2E";
const GOLD = "#C9A227";
const LINE = "#CBD5D0";
const INK = "#132A22";

/** จำนวนแถวว่างที่เติมให้ตารางสูงเท่ากันทุกใบ — เอกสารที่สูงไม่เท่ากันดูเหมือนของปลอม */
const MIN_ROWS = 8;

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Th({
  children,
  width,
  align = "center",
}: {
  children: React.ReactNode;
  width: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      style={{
        width,
        textAlign: align,
        color: "#fff",
        fontWeight: 700,
        fontSize: "3mm",
        padding: "2mm 2mm",
        border: `0.3mm solid ${GREEN}`,
        lineHeight: 1.25,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <td
      style={{
        textAlign: align,
        fontSize: "3.2mm",
        padding: "1.8mm 2mm",
        borderLeft: `0.3mm solid ${LINE}`,
        borderRight: `0.3mm solid ${LINE}`,
        color: INK,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

/** บรรทัดสรุปยอดฝั่งขวา */
function SumRow({
  th,
  en,
  value,
  strong = false,
}: {
  th: string;
  en: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", marginBottom: "1mm" }}>
      <div style={{ flex: 1, padding: "1.5mm 2mm" }}>
        <div style={{ fontSize: "3.2mm", fontWeight: 700, color: INK }}>{th}</div>
        <div style={{ fontSize: "2.4mm", color: "#6B7C75" }}>{en}</div>
      </div>
      <div
        style={{
          width: "40mm",
          textAlign: "right",
          padding: "2.5mm 3mm",
          fontSize: "3.6mm",
          fontWeight: 700,
          background: strong ? GREEN : "#F2F6F4",
          color: strong ? "#fff" : INK,
          border: `0.3mm solid ${strong ? GREEN : LINE}`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Field({ th, en, children }: { th: string; en: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "2mm", marginBottom: "1.5mm" }}>
      <div style={{ width: "26mm", flexShrink: 0 }}>
        <div style={{ fontSize: "3mm", fontWeight: 700, color: INK }}>{th}</div>
        <div style={{ fontSize: "2.3mm", color: "#6B7C75" }}>{en}</div>
      </div>
      <div style={{ flex: 1, fontSize: "3.1mm", color: INK, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

export default function ReceiptDoc({
  r,
  company,
}: {
  r: ReceiptView;
  company: CompanyView;
}) {
  const blanks = Math.max(0, MIN_ROWS - r.items.length);

  return (
    <div
      className="receipt-page"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm 10mm",
        background: "#fff",
        color: INK,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {r.voidedAt && (
        // ใบที่ยกเลิกแล้วต้องดูออกทันทีแม้ปริ้นออกมาเป็นกระดาษ
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-24deg)",
            fontSize: "28mm",
            fontWeight: 800,
            color: "rgba(200,30,30,0.14)",
            letterSpacing: "4mm",
            pointerEvents: "none",
          }}
        >
          ยกเลิก
        </div>
      )}

      {/* หัวกระดาษ — โลโก้จริงจากไฟล์ ไม่ใช่ตัวอักษรที่จัดเลียนแบบ
          ไฟล์อยู่ใน public/ ไม่ใช่ Blob เพราะเป็นของบริษัทที่ไม่เปลี่ยนบ่อย
          และต้องโหลดได้ทั้งในหน้าเว็บและตอนเซิร์ฟเวอร์สร้าง PDF */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "6mm" }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/receipt-logo.png"
            alt={COMPANY.nameTh}
            style={{ height: "22mm", width: "auto", objectFit: "contain" }}
          />
        </div>
        <div style={{ textAlign: "right", fontSize: "2.9mm", lineHeight: 1.5, color: INK }}>
          <div style={{ fontWeight: 700 }}>{COMPANY.nameTh}</div>
          <div>{company.address}</div>
          <div>
            เลขที่ผู้เสียภาษี {company.taxId} | ({company.branch})
          </div>
        </div>
      </div>

      {/* แถบชื่อเอกสาร */}
      <div style={{ display: "flex", marginTop: "5mm", alignItems: "stretch" }}>
        <div
          style={{
            flex: 1,
            background: GREEN,
            color: "#fff",
            textAlign: "center",
            padding: "3mm",
          }}
        >
          <div style={{ fontSize: "6mm", fontWeight: 800, letterSpacing: "0.5mm" }}>Receipt</div>
          <div style={{ fontSize: "3.2mm", color: GOLD }}>ใบเสร็จรับเงิน</div>
        </div>
        <div style={{ width: "55mm", border: `0.3mm solid ${LINE}`, borderLeft: "none" }}>
          <div
            style={{
              fontSize: "2.6mm",
              textAlign: "center",
              padding: "1.5mm",
              borderBottom: `0.3mm solid ${LINE}`,
              color: "#6B7C75",
            }}
          >
            ต้นฉบับ / Original
          </div>
          <div
            style={{
              fontSize: "4.4mm",
              fontWeight: 800,
              textAlign: "center",
              padding: "2.5mm",
              color: GREEN,
            }}
          >
            {r.number}
          </div>
        </div>
      </div>

      {/* ข้อมูลลูกค้า + ข้อมูลเอกสาร */}
      <div style={{ display: "flex", border: `0.3mm solid ${LINE}`, borderTop: "none" }}>
        <div style={{ flex: 1.6, padding: "3mm", borderRight: `0.3mm solid ${LINE}` }}>
          <Field th="ชื่อลูกค้า" en="Customer Name">
            {r.customerName}
          </Field>
          <Field th="เลขที่ผู้เสียภาษี" en="Tax ID">
            {r.taxId ? `${r.taxId}${r.branch ? ` (${r.branch})` : ""}` : "-"}
          </Field>
          <Field th="ที่อยู่" en="Address">
            {r.address || "-"}
            {r.phone ? <div>โทร {r.phone}</div> : null}
          </Field>
        </div>
        <div style={{ flex: 1, padding: "3mm" }}>
          <Field th="วันที่" en="Issue Date">
            : {formatBangkokDate(r.issuedAt)}
          </Field>
          <Field th="ชำระโดย" en="Payment">
            : {PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}
          </Field>
          <Field th="เอกสารอ้างอิง" en="Ref Document">
            : {r.paymentDetail ? "" : "-"}
          </Field>
        </div>
      </div>

      {/* ตารางรายการ */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "4mm",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: GREEN }}>
            <Th width="14mm">
              เลขที่
              <div style={{ fontSize: "2.3mm", fontWeight: 400, color: GOLD }}>No.</div>
            </Th>
            <Th width="auto" align="center">
              รายการ
              <div style={{ fontSize: "2.3mm", fontWeight: 400, color: GOLD }}>Description</div>
            </Th>
            <Th width="20mm">
              จำนวน
              <div style={{ fontSize: "2.3mm", fontWeight: 400, color: GOLD }}>Quantity</div>
            </Th>
            <Th width="27mm">
              ราคา/หน่วย
              <div style={{ fontSize: "2.3mm", fontWeight: 400, color: GOLD }}>Unit Price</div>
            </Th>
            <Th width="24mm">
              ส่วนลด
              <div style={{ fontSize: "2.3mm", fontWeight: 400, color: GOLD }}>Discount</div>
            </Th>
            <Th width="32mm">
              จำนวนเงิน (THB)
              <div style={{ fontSize: "2.3mm", fontWeight: 400, color: GOLD }}>Amount</div>
            </Th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((it, i) => (
            <tr key={i}>
              <Td align="center">{i + 1}</Td>
              <Td>{it.name}</Td>
              <Td align="center">{it.qty.toLocaleString()}</Td>
              <Td align="right">{money(it.unitPrice)}</Td>
              <Td align="right">{money(it.discount)}</Td>
              <Td align="right">{money(it.amount)}</Td>
            </tr>
          ))}
          {Array.from({ length: blanks }).map((_, i) => (
            <tr key={`b${i}`} style={{ height: "8mm" }}>
              <Td> </Td>
              <Td> </Td>
              <Td> </Td>
              <Td> </Td>
              <Td> </Td>
              <Td> </Td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} style={{ borderTop: `0.3mm solid ${LINE}` }} />
          </tr>
        </tbody>
      </table>

      {/* จำนวนเงินตัวอักษร + สรุปยอด */}
      <div style={{ display: "flex", gap: "4mm", marginTop: "4mm" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              background: "#F2F6F4",
              border: `0.3mm solid ${LINE}`,
              padding: "3mm",
              display: "flex",
              gap: "3mm",
              alignItems: "center",
            }}
          >
            <div style={{ width: "20mm" }}>
              <div style={{ fontSize: "3mm", fontWeight: 700 }}>จำนวนเงิน</div>
              <div style={{ fontSize: "2.3mm", color: "#6B7C75" }}>Amount</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "3.6mm", fontWeight: 700 }}>
              {r.totalText}
            </div>
          </div>

          <div style={{ marginTop: "3mm", fontSize: "3.2mm", fontWeight: 700 }}>
            การชำระเงิน (Conditions of Payments)
          </div>
          <div style={{ display: "flex", gap: "6mm", marginTop: "1.5mm", flexWrap: "wrap" }}>
            {(["CASH", "TRANSFER", "CHEQUE", "OTHER"] as const).map((m) => (
              <div key={m} style={{ display: "flex", gap: "1.5mm", alignItems: "flex-start" }}>
                <span style={{ fontSize: "3.4mm", lineHeight: 1 }}>
                  {r.paymentMethod === m ? "☑" : "☐"}
                </span>
                <span style={{ fontSize: "3mm" }}>{PAYMENT_LABEL[m]}</span>
              </div>
            ))}
          </div>
          {r.paymentDetail && (
            <div style={{ marginTop: "2mm", display: "flex", gap: "2mm" }}>
              <div style={{ width: "22mm", fontSize: "3mm", fontWeight: 700 }}>รายละเอียด</div>
              <div style={{ flex: 1, fontSize: "3mm" }}>{r.paymentDetail}</div>
            </div>
          )}
        </div>

        <div style={{ width: "78mm" }}>
          <SumRow th="รวมเป็นเงิน" en="Subtotal" value={money(r.subtotal)} />
          <SumRow th="หักส่วนลดพิเศษ" en="Special Discount" value={money(r.discount)} />
          <SumRow th="ยอดรวมหลังหักส่วนลด" en="After Discount" value={money(r.total)} />
          <SumRow th="จำนวนเงินรวมทั้งสิ้น" en="Total" value={money(r.total)} strong />
        </div>
      </div>

      {/* ลายเซ็น */}
      <div
        style={{
          display: "flex",
          marginTop: "6mm",
          border: `0.3mm solid ${LINE}`,
          textAlign: "center",
        }}
      >
        <div style={{ flex: 1, padding: "3mm", borderRight: `0.3mm solid ${LINE}` }}>
          <div style={{ height: "18mm", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            {r.signerSignatureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.signerSignatureUrl}
                alt=""
                style={{ maxHeight: "17mm", maxWidth: "50mm", objectFit: "contain" }}
              />
            )}
          </div>
          <div style={{ borderTop: `0.3mm dashed ${INK}`, marginTop: "1mm", paddingTop: "1.5mm" }}>
            <div style={{ fontSize: "2.9mm", fontWeight: 700 }}>
              ผู้รับเงิน / Bill Receiver Signature
            </div>
            <div style={{ fontSize: "2.7mm", marginTop: "1mm" }}>
              {r.signerName ? r.signerName : "______________"}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "3mm", borderRight: `0.3mm solid ${LINE}` }}>
          <div style={{ height: "18mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {r.stampUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.stampUrl}
                alt=""
                style={{ maxHeight: "20mm", maxWidth: "34mm", objectFit: "contain", opacity: 0.9 }}
              />
            )}
          </div>
          <div style={{ fontSize: "2.7mm", color: "#6B7C75" }}>ตราประทับบริษัท</div>
        </div>

        <div style={{ flex: 1, padding: "3mm" }}>
          <div style={{ height: "18mm", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            {r.signerSignatureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.signerSignatureUrl}
                alt=""
                style={{ maxHeight: "17mm", maxWidth: "50mm", objectFit: "contain" }}
              />
            )}
          </div>
          <div style={{ borderTop: `0.3mm dashed ${INK}`, marginTop: "1mm", paddingTop: "1.5mm" }}>
            <div style={{ fontSize: "2.9mm", fontWeight: 700 }}>
              ผู้มีอำนาจลงนาม / Authorized Signature
            </div>
            <div style={{ fontSize: "2.7mm", marginTop: "1mm" }}>
              {r.signerName ? r.signerName : "______________"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "4mm",
          background: GREEN,
          color: "#fff",
          textAlign: "center",
          fontSize: "2.8mm",
          padding: "2mm",
        }}
      >
        {company.address}
      </div>

      {r.voidedAt && r.voidReason && (
        <div style={{ marginTop: "3mm", fontSize: "3mm", color: "#B42318" }}>
          ใบเสร็จนี้ถูกยกเลิก — {r.voidReason}
        </div>
      )}
    </div>
  );
}
