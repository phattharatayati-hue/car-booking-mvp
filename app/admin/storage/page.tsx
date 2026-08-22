export const dynamic = "force-dynamic";

import { list } from "@vercel/blob";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBangkokDateTime } from "@/lib/settings";

/**
 * โควตาพื้นที่ Blob (GB) — ตั้งผ่าน env `BLOB_QUOTA_GB`
 * Hobby ราว 1 GB · Pro แถม 5 GB (เกินแล้วคิด $0.023/GB/เดือน)
 */
const QUOTA_GB = Number(process.env.BLOB_QUOTA_GB || 1);
const QUOTA_BYTES = QUOTA_GB * 1024 ** 3;

/** ชื่อโฟลเดอร์ที่รู้จัก + คำอธิบายว่าใครดูได้ */
const FOLDERS: Record<string, { label: string; note: string; tone: string }> = {
  "cars/": {
    label: "รูปรถ",
    note: "เปิดสาธารณะ",
    tone: "bg-blue-500",
  },
  "slips/": {
    label: "สลิปค่าจอง",
    note: "เฉพาะแอดมิน",
    tone: "bg-emerald-500",
  },
  "documents/": {
    label: "เอกสารลูกค้า",
    note: "เฉพาะแอดมิน · ข้อมูลส่วนบุคคล",
    tone: "bg-amber-500",
  },
};
const OTHER = { label: "อื่นๆ", note: "ไม่อยู่ใน allowlist", tone: "bg-slate-400" };

type Row = {
  key: string;
  label: string;
  note: string;
  tone: string;
  count: number;
  bytes: number;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** ดึงรายการไฟล์ทั้งหมด (ไล่ cursor ให้ครบ) */
async function loadAllBlobs() {
  const all: { pathname: string; size: number; uploadedAt: Date }[] = [];
  let cursor: string | undefined;

  // กันหลุดลูปถ้าไฟล์เยอะผิดปกติ — 20 รอบ = 20,000 ไฟล์
  for (let i = 0; i < 20; i++) {
    const res = await list({ cursor, limit: 1000 });
    for (const b of res.blobs) {
      all.push({ pathname: b.pathname, size: b.size, uploadedAt: new Date(b.uploadedAt) });
    }
    if (!res.hasMore || !res.cursor) break;
    cursor = res.cursor;
  }

  return all;
}

export default async function StoragePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let blobs: Awaited<ReturnType<typeof loadAllBlobs>> = [];
  let loadError: string | null = null;

  try {
    blobs = await loadAllBlobs();
  } catch (err) {
    console.error("blob list failed:", err);
    loadError =
      "อ่านข้อมูลจาก Blob ไม่สำเร็จ — ตรวจว่า BLOB_READ_WRITE_TOKEN ถูกตั้งไว้แล้ว";
  }

  // รวมยอดแยกโฟลเดอร์
  const buckets = new Map<string, Row>();
  for (const key of Object.keys(FOLDERS)) {
    buckets.set(key, { key, ...FOLDERS[key], count: 0, bytes: 0 });
  }
  buckets.set("other/", { key: "other/", ...OTHER, count: 0, bytes: 0 });

  for (const b of blobs) {
    const prefix = Object.keys(FOLDERS).find((p) => b.pathname.startsWith(p)) ?? "other/";
    const row = buckets.get(prefix)!;
    row.count++;
    row.bytes += b.size;
  }

  const rows = [...buckets.values()].filter((r) => r.count > 0 || r.key !== "other/");
  const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
  const totalCount = blobs.length;
  const usedPct = Math.min(100, (totalBytes / QUOTA_BYTES) * 100);

  // ไฟล์ใหญ่สุด 5 อันดับ — ตัวช่วยหาไฟล์ที่ไม่ถูกย่อ
  const biggest = [...blobs].sort((a, b) => b.size - a.size).slice(0, 5);

  // ประมาณการโต — ดูจากไฟล์ที่อัปเข้ามาใน 30 วันล่าสุด
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const recent = blobs.filter((b) => b.uploadedAt >= cutoff);
  const recentBytes = recent.reduce((sum, b) => sum + b.size, 0);
  const monthsLeft =
    recentBytes > 0 ? Math.max(0, (QUOTA_BYTES - totalBytes) / recentBytes) : null;

  // เอกสารที่ลบได้แล้ว — การจองที่จบไปเกิน 90 วัน
  const staleCutoff = new Date(Date.now() - 90 * 86400000);
  const staleDocs = await prisma.bookingDocument.count({
    where: {
      booking: {
        status: { in: ["COMPLETED", "CANCELLED", "REJECTED"] },
        endDate: { lt: staleCutoff },
      },
    },
  });

  const barColor =
    usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-500" : "bg-blue-600";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">พื้นที่เก็บไฟล์</h1>
        <p className="text-slate-500 text-sm mt-1">
          รูปรถ สลิปค่าจอง และเอกสารลูกค้าทั้งหมดที่เก็บใน Vercel Blob
        </p>
      </div>

      {loadError && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {loadError}
        </div>
      )}

      {/* ยอดรวม */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <div>
            <p className="text-sm text-slate-500">ใช้ไปแล้ว</p>
            <p className="text-3xl font-bold text-slate-900 mt-0.5">
              {humanSize(totalBytes)}
              <span className="text-base font-medium text-slate-400">
                {" "}
                / {QUOTA_GB} GB
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">จำนวนไฟล์</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {totalCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
          {rows
            .filter((r) => r.bytes > 0)
            .map((r) => (
              <div
                key={r.key}
                className={r.tone}
                style={{ width: `${(r.bytes / QUOTA_BYTES) * 100}%` }}
                title={`${r.label} ${humanSize(r.bytes)}`}
              />
            ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          ใช้ไป <strong className={usedPct >= 70 ? "text-amber-700" : ""}>
            {usedPct.toFixed(1)}%
          </strong>{" "}
          ของโควตา
          {monthsLeft !== null && (
            <>
              {" · "}
              จากอัตราการอัปโหลด 30 วันล่าสุด ({humanSize(recentBytes)}/เดือน) เต็มในอีกราว{" "}
              <strong>
                {monthsLeft > 120 ? "10 ปีขึ้นไป" : `${monthsLeft.toFixed(0)} เดือน`}
              </strong>
            </>
          )}
        </p>

        {usedPct >= 80 && (
          <div className="mt-4 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl leading-relaxed">
            ใกล้เต็มแล้ว — บนแพลน Hobby ถ้าใช้เกินโควตา จะ<strong>เปิดดูไฟล์ทั้งหมดไม่ได้จนครบ 30 วัน</strong>{" "}
            แปลว่าตรวจสลิปและเอกสารไม่ได้เลย ควรอัปเป็น Pro หรือลบเอกสารของงานที่จบไปแล้ว
          </div>
        )}
      </div>

      {/* แยกตามโฟลเดอร์ */}
      <div className="mt-5 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">แยกตามประเภท</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.key} className="px-6 py-4 flex items-center gap-4">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{r.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.note}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-900">{humanSize(r.bytes)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.count.toLocaleString()} ไฟล์
                  {r.count > 0 && ` · เฉลี่ย ${humanSize(Math.round(r.bytes / r.count))}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ไฟล์ใหญ่สุด */}
      {biggest.length > 0 && (
        <div className="mt-5 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">ไฟล์ใหญ่สุด 5 อันดับ</h2>
            <p className="text-sm text-slate-500 mt-1">
              ปกติรูปที่ผ่านการย่อในเบราว์เซอร์จะไม่เกินราว 500 KB
              ถ้าเห็นไฟล์ใหญ่กว่านี้มาก แปลว่าอัปเข้ามาโดยไม่ได้ย่อ
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {biggest.map((b) => (
              <div key={b.pathname} className="px-6 py-3 flex items-center gap-4">
                <p className="text-xs text-slate-600 font-mono truncate flex-1 min-w-0">
                  {b.pathname}
                </p>
                <p className="text-sm font-medium text-slate-900 shrink-0">
                  {humanSize(b.size)}
                </p>
                <p className="text-xs text-slate-400 shrink-0 hidden sm:block">
                  {formatBangkokDateTime(b.uploadedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* เอกสารที่ลบได้ */}
      <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">เอกสารที่ลบได้แล้ว</h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          เอกสารของการจองที่ปิดงานไปแล้วเกิน 90 วัน (จบงาน ยกเลิก หรือถูกปฏิเสธ):{" "}
          <strong className="text-slate-900">{staleDocs} ใบ</strong>
          {staleDocs > 0 && " — เก็บบัตรประชาชนและใบขับขี่ไว้นานกว่าที่จำเป็นเป็นความเสี่ยงโดยไม่ได้ประโยชน์"}
        </p>
      </div>

      <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <p className="text-xs text-slate-500 leading-relaxed">
          หน้านี้อ่านรายการไฟล์สดจาก Blob ทุกครั้งที่เปิด (นับเป็น Advanced Operation
          ของ Vercel — ที่สเกลนี้ไม่มีนัยด้านค่าใช้จ่าย) · โควตาที่ใช้เทียบตั้งไว้{" "}
          {QUOTA_GB} GB แก้ได้ที่ env <code>BLOB_QUOTA_GB</code> เมื่ออัปเป็น Pro (แถม 5 GB)
        </p>
      </div>
    </div>
  );
}
