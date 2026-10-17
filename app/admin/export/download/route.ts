import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { currentAdmin } from "@/lib/roles";
import { isExportOwner } from "@/lib/export-guard";
import { auditAs } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import type { ReceiptItem } from "@/lib/receipt";
import { ZipWriter } from "@/lib/zip-stream";
import { datasetsForScope, ts, type ExportOptions } from "@/lib/export-data";

/* react-pdf ต้องรันบน Node ไม่ใช่ Edge */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** เพดานสูงสุดของ Vercel Hobby คือ 300 วินาที — ดูงบเวลาด้านล่างที่หยุดสร้าง PDF ก่อนหมดเวลา */
export const maxDuration = 300;

/** หยุดสร้าง PDF เมื่อใช้เวลาไปเท่านี้ เหลือเวลาให้เขียน README และปิดไฟล์ ZIP ให้สมบูรณ์ */
const PDF_BUDGET_MS = 230_000;

type FileInfo = { name: string; title: string; note: string; rows: number | null; bytes: number; sha256: string };

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function buildReadme(args: {
  exportedAt: Date;
  by: string;
  scope: string;
  year: number | null;
  files: FileInfo[];
  pdfFailed: string[];
  pdfSkipped: string[];
  pdfCount: number;
}): string {
  const { files, pdfFailed, pdfSkipped } = args;
  const L: string[] = [];
  L.push("ชุดข้อมูลส่งออกจากระบบจองรถเช่า (car-booking)");
  L.push("=".repeat(56));
  L.push(`ส่งออกเมื่อ : ${ts(args.exportedAt)} (เวลาไทย)`);
  L.push(`ส่งออกโดย  : ${args.by}`);
  L.push(
    `ขอบเขต     : ${
      args.scope === "all"
        ? "ข้อมูลทั้งระบบ + ใบเสร็จ PDF"
        : args.scope === "data"
          ? "ข้อมูล CSV อย่างเดียว (ไม่มี PDF)"
          : `ใบเสร็จ PDF เฉพาะปี พ.ศ. ${args.year ?? "-"}`
    }`
  );
  L.push("");
  L.push("!! ไฟล์ชุดนี้มีข้อมูลส่วนบุคคลของลูกค้า (ชื่อ เบอร์โทร อีเมล LINE ID)");
  L.push("   เก็บไว้เฉพาะผู้ที่ได้รับมอบหมาย ห้ามส่งต่อทางช่องทางที่ไม่ปลอดภัย");
  L.push("   และควรกำหนดระยะเวลาเก็บ/วันลบ ตามนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของบริษัท");
  L.push("");
  L.push("เริ่มอ่านจากไหน");
  L.push("-".repeat(56));
  L.push("1. bookings.csv คือไฟล์หลัก — ใบจองละหนึ่งแถว มีลูกค้า รถ ค่าจอง เงินประกัน และเลขที่ใบเสร็จครบ");
  L.push("2. ไฟล์อื่นเชื่อมกับ bookings.csv ด้วย 'รหัสการจอง' และเชื่อมใบเสร็จด้วย 'เลขที่ใบเสร็จ'");
  L.push("3. ใบเสร็จ PDF อยู่ในโฟลเดอร์ receipts/ ตั้งชื่อตามเลขที่ใบเสร็จ (เช่น RE-2569-00001.pdf)");
  L.push("");
  L.push("วิธีเปิดไฟล์ CSV");
  L.push("-".repeat(56));
  L.push("- ดับเบิลคลิกเปิดด้วย Excel ได้เลย (ไฟล์เข้ารหัส UTF-8 พร้อม BOM ภาษาไทยจะไม่เพี้ยน)");
  L.push("- ใช้ Google Sheets: File > Import > Upload แล้วเลือก 'Comma' เป็นตัวคั่น");
  L.push("- เวลาทุกช่องเป็นเวลาไทย (UTC+7) รูปแบบ ปปปป-ดด-วว ชช:นน:วว เป็นปี ค.ศ.");
  L.push("- เบอร์โทร/เลขผู้เสียภาษีถูกเขียนเป็นข้อความ (เช่น =\"0812345678\") เพื่อให้ Excel ไม่ตัดเลข 0 หน้าทิ้ง");
  L.push("  ถ้านำไปประมวลผลด้วยโปรแกรมอื่นให้ตัด =\"...\" ออก");
  L.push("- ข้อความที่ขึ้นต้นด้วย = + - @ ที่ไม่ใช่ตัวเลข จะมีเครื่องหมาย ' นำหน้า เพื่อป้องกัน Excel มองเป็นสูตร");
  L.push("- ช่อง TRUE/FALSE คือ ใช่/ไม่ใช่");
  L.push("");
  L.push("รายการไฟล์ พร้อมจำนวนแถวและลายนิ้วมือไฟล์ (SHA-256) ไว้ตรวจว่าไฟล์ไม่ถูกแก้");
  L.push("-".repeat(56));
  for (const f of files) {
    L.push(`${f.name}  —  ${f.title}`);
    L.push(`    ${f.note}`);
    L.push(`    ${f.rows === null ? "" : `${f.rows} แถว · `}${f.bytes.toLocaleString("en-US")} ไบต์`);
    L.push(`    SHA-256: ${f.sha256}`);
  }
  if (args.pdfCount > 0) {
    L.push("");
    L.push(`ใบเสร็จ PDF ในชุดนี้: ${args.pdfCount} ฉบับ (โฟลเดอร์ receipts/ — SHA-256 ของแต่ละฉบับอยู่ท้ายไฟล์นี้)`);
  }
  if (pdfFailed.length > 0) {
    L.push("");
    L.push(`!! ใบเสร็จที่สร้าง PDF ไม่สำเร็จ ${pdfFailed.length} ฉบับ (ข้อมูลยังอยู่ใน receipts.csv): ${pdfFailed.join(", ")}`);
  }
  if (pdfSkipped.length > 0) {
    L.push("");
    L.push(
      `!! ใบเสร็จ ${pdfSkipped.length} ฉบับยังไม่ได้สร้าง PDF เพราะเวลาไม่พอ (ข้อมูลยังอยู่ใน receipts.csv): ` +
        `${pdfSkipped.join(", ")}`
    );
    L.push("   วิธีแก้: กลับไปหน้าส่งออกข้อมูล แล้วโหลดใบเสร็จ PDF แยกทีละปี");
  }
  L.push("");
  L.push("สิ่งที่ 'ไม่รวม' ในชุดนี้ (ตั้งใจ)");
  L.push("-".repeat(56));
  L.push("- รูปและเอกสารทั้งหมดใน Vercel Blob: บัตรประชาชน/Passport ใบขับขี่ เอกสารการเดินทาง");
  L.push("  สลิปโอนเงิน รูปสภาพรถจากคนส่งรถ รูปรถ ลายเซ็นและตราประทับ");
  L.push("- เลขบัตรประชาชนของลูกค้า");
  L.push("- รหัสผ่านและโทเคนทุกชนิด (รหัสแอดมิน, LINE, Google) และค่าตั้งค่าลับของระบบ");
  L.push("- เลขบัญชีคืนเงินประกันของรายที่โอนคืนแล้ว (ระบบลบทิ้งตามนโยบายอยู่แล้ว)");
  L.push("  รายที่ยังไม่ได้โอนคืนจะมีเลขบัญชีใน refunds.csv เพื่อให้บริษัทโอนต่อได้");
  L.push("");
  return L.join("\r\n");
}

export async function GET(request: Request) {
  const me = await currentAdmin();
  if (!me || !isExportOwner(me)) {
    return new Response("forbidden", { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const scopeRaw = sp.get("scope");
  const scope: "all" | "data" | "receipts" =
    scopeRaw === "data" || scopeRaw === "receipts" ? scopeRaw : "all";
  const yearRaw = Number(sp.get("year"));
  const year = Number.isInteger(yearRaw) && yearRaw >= 2400 && yearRaw <= 2700 ? yearRaw : null;
  if (scope === "receipts" && !year) {
    return new Response("ระบุปี พ.ศ. ของใบเสร็จด้วย (year)", { status: 400 });
  }

  const withPdf = scope !== "data";
  const opts: ExportOptions = {
    receiptYear: scope === "receipts" ? year : null,
    withPdf,
  };
  const origin = new URL(request.url).origin;
  const actor = { id: me.id, name: me.name, role: me.role };
  const by = `${me.name} <${me.email}>`;
  const label = `${scope}${scope === "receipts" ? ` ปี ${year}` : ""}`;

  await auditAs(actor, {
    action: "export.download",
    entity: "export",
    summary: `เริ่มส่งออกข้อมูลทั้งระบบ (${label})`,
  });

  async function* build(): AsyncGenerator<Uint8Array> {
    const zip = new ZipWriter();
    const files: FileInfo[] = [];
    const exportedAt = new Date();
    const started = Date.now();

    // 1) ไฟล์ CSV
    for (const d of datasetsForScope(scope)) {
      const buf = Buffer.from(await d.build(opts), "utf8");
      files.push({
        name: d.file,
        title: d.title,
        note: d.note,
        rows: await d.count(opts),
        bytes: buf.length,
        sha256: sha256(buf),
      });
      yield zip.add(d.file, buf, true);
    }

    // 2) ใบเสร็จ PDF — ทีละใบ ใบไหนพังข้ามไปบันทึกไว้ใน README ไม่ล้มทั้งชุด
    const pdfHashes: string[] = [];
    const pdfFailed: string[] = [];
    const pdfSkipped: string[] = [];
    let pdfCount = 0;

    if (withPdf) {
      const [settings, receipts] = await Promise.all([
        getSettings(),
        prisma.receipt.findMany({
          where: opts.receiptYear ? { year: opts.receiptYear } : {},
          orderBy: [{ year: "asc" }, { seq: "asc" }],
        }),
      ]);
      const company = {
        taxId: settings.companyTaxId,
        branch: settings.companyBranch,
        address: settings.companyAddress,
      };
      const abs = (u: string | null) => (u ? (u.startsWith("http") ? u : `${origin}${u}`) : null);

      for (const r of receipts) {
        if (Date.now() - started > PDF_BUDGET_MS) {
          pdfSkipped.push(r.number);
          continue;
        }
        try {
          const buf = await renderReceiptPdf(
            { ...r, items: r.items as unknown as ReceiptItem[] },
            company,
            origin,
            abs
          );
          pdfHashes.push(`${sha256(buf)}  receipts/${r.number}.pdf`);
          pdfCount++;
          yield zip.add(`receipts/${r.number}.pdf`, buf, false);
        } catch (err) {
          console.error("export: render receipt pdf failed:", r.number, err);
          pdfFailed.push(r.number);
        }
      }
    }

    // 3) README ท้ายสุด เพราะต้องมีลายนิ้วมือของทุกไฟล์ก่อน
    let readme = buildReadme({
      exportedAt,
      by,
      scope,
      year,
      files,
      pdfFailed,
      pdfSkipped,
      pdfCount,
    });
    if (pdfHashes.length > 0) {
      readme += ["SHA-256 ของใบเสร็จ PDF", "-".repeat(56), ...pdfHashes, ""].join("\r\n");
    }
    yield zip.add("README.txt", Buffer.from("﻿" + readme, "utf8"), true);
    yield zip.finish();

    await auditAs(actor, {
      action: "export.finish",
      entity: "export",
      summary: `ส่งออกข้อมูลเสร็จ (${label}) — CSV ${files.length} ไฟล์, PDF ${pdfCount} ฉบับ`,
      detail:
        pdfFailed.length || pdfSkipped.length
          ? `PDF ล้มเหลว ${pdfFailed.length} · ข้ามเพราะเวลา ${pdfSkipped.length}`
          : undefined,
    });
  }

  const it = build();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await it.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (err) {
        // ปล่อยให้การดาวน์โหลดล้มเหลวชัด ๆ ดีกว่าได้ ZIP ครึ่งเดียวที่ดูเหมือนสมบูรณ์
        console.error("export failed:", err);
        await auditAs(actor, {
          action: "export.failed",
          entity: "export",
          summary: `ส่งออกข้อมูลไม่สำเร็จ (${label})`,
          detail: err instanceof Error ? err.message : String(err),
        });
        controller.error(err);
      }
    },
    async cancel() {
      await it.return(undefined);
    },
  });

  const stamp = ts(new Date()).slice(0, 10);
  const name =
    scope === "receipts"
      ? `receipts-${year}-${stamp}.zip`
      : scope === "data"
        ? `car-booking-data-${stamp}.zip`
        : `car-booking-export-${stamp}.zip`;

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
