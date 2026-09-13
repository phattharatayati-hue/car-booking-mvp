"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignatureModal from "@/components/SignatureModal";

/**
 * ให้ลูกค้าเซ็นรับใบเสร็จบนมือถือของคนไปส่ง/รับรถ
 *
 * คนเซ็นคือลูกค้า ไม่ใช่เจ้าของเครื่อง จึงต้องกดเปิดเองก่อน
 * ไม่โผล่ค้างไว้ให้กดพลาดระหว่างใช้งานหน้าอื่น
 *
 * เปิดเป็นกล่องเต็มจอ เพราะถ้าเซ็นคาอยู่ในหน้ายาว ๆ การลากนิ้วจะไปโดน
 * "ลากลงเพื่อปิด" ของ in-app browser ใน LINE แล้วหน้าเว็บพับปิดกลางคัน
 *
 * ไม่เซ็นก็ได้ — ใบเสร็จออกได้ตามปกติ ช่องลายเซ็นจะว่างไว้ให้เซ็นด้วยปากกาบนกระดาษ
 */
export default function ReceiptSign({
  token,
  receiptId,
  number,
  total,
  signed,
  viewToken,
}: {
  token: string;
  receiptId: string;
  number: string;
  total: number;
  signed: boolean;
  /** กุญแจของใบเสร็จเอง ใช้เปิดหน้าใบเสร็จให้ลูกค้าดูก่อนเซ็น */
  viewToken: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(signed);

  async function submit(blob: Blob) {
    setError(null);
    const fd = new FormData();
    fd.append("file", new File([blob], "signature.png", { type: "image/png" }));
    fd.append("receiptId", receiptId);

    const res = await fetch(`/api/job/${token}/receipt-sign`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "บันทึกลายเซ็นไม่สำเร็จ");
      return;
    }

    setDone(true);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-900">{number}</p>
          <p className="text-sm text-slate-500">{total.toLocaleString()} บาท</p>
        </div>
        {done ? (
          <span className="text-sm font-medium text-emerald-700">✓ ลูกค้าเซ็นแล้ว</span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            ให้ลูกค้าเซ็น
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <a
          href={`/receipt/${viewToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          เปิดดูใบเสร็จ
        </a>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}

      <SignatureModal
        open={open && !done}
        onClose={() => setOpen(false)}
        title={`ให้ลูกค้าเซ็นรับใบเสร็จ ${number}`}
        subtitle={`${total.toLocaleString()} บาท`}
        buttonText="บันทึกลายเซ็นลูกค้า"
        submit={submit}
      />
    </div>
  );
}
