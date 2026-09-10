"use client";

/**
 * ปุ่มสั่งพิมพ์ — หน้าตารางงานมักถูกปรินต์แปะไว้หน้าร้านตอนเช้า
 * สไตล์ตอนพิมพ์อยู่ใน app/globals.css (@media print)
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
    >
      พิมพ์ตาราง
    </button>
  );
}
