"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { pushRaw, siteUrl } from "@/lib/line";
import { flexReceipt } from "@/lib/line-flex";
import {
  bahtText,
  buddhistYear,
  nextReceiptSeq,
  parseItems,
  receiptNumber,
  sumItems,
  PAYMENT_METHODS,
  type ReceiptItem,
} from "@/lib/receipt";

/** อ่านรายการจากฟอร์ม — ฟอร์มส่งมาเป็นชุดช่องชื่อ item0name, item0qty, ... */
function itemsFromForm(formData: FormData): ReceiptItem[] | null {
  const raw: unknown[] = [];
  for (let i = 0; i < 12; i++) {
    const name = formData.get(`item${i}name`);
    if (name === null) continue;
    raw.push({
      name: String(name),
      qty: Number(formData.get(`item${i}qty`) ?? 1),
      unitPrice: Number(formData.get(`item${i}price`) ?? 0),
      discount: Number(formData.get(`item${i}discount`) ?? 0),
    });
  }
  return parseItems(raw);
}

export async function createReceiptAction(formData: FormData) {
  const me = await requireStaff();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) redirect("/admin/bookings?error=receipt");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });
  if (!booking) redirect("/admin/bookings?error=receipt");

  const items = itemsFromForm(formData);
  if (!items) redirect(`/admin/receipts/new?booking=${bookingId}&error=items`);

  /* ตรวจซ้ำฝั่งเซิร์ฟเวอร์ ไม่พึ่ง required ของฟอร์มอย่างเดียว
     เพราะ required ถูกข้ามได้ง่ายด้วยการยิง request ตรง
     และใบเสร็จที่ขาดที่อยู่หรือเลขผู้เสียภาษี ลูกค้าเอาไปใช้ทางบัญชีไม่ได้ */
  const customerName = String(formData.get("customerName") ?? "").trim();
  if (customerName.length < 2 || customerName.length > 150) {
    redirect(`/admin/receipts/new?booking=${bookingId}&error=name`);
  }

  /* ยาวอย่างน้อย 6 ตัว เพื่อรับเลขพาสปอร์ตของลูกค้าต่างชาติด้วย
     (เลขผู้เสียภาษีไทย 13 หลัก · พาสปอร์ตบางประเทศสั้นแค่ 6-8 ตัวและมีตัวอักษรปน)
     ไม่ตรวจรูปแบบละเอียดกว่านี้ เพราะแต่ละประเทศออกเลขคนละแบบ
     ตรวจเข้มไปจะบล็อกลูกค้าจริงมากกว่ากันพิมพ์ผิด */
  const taxId = String(formData.get("taxId") ?? "").trim();
  if (taxId.length < 6 || taxId.length > 30) {
    redirect(`/admin/receipts/new?booking=${bookingId}&error=taxId`);
  }

  const address = String(formData.get("address") ?? "").trim();
  if (address.length < 5 || address.length > 300) {
    redirect(`/admin/receipts/new?booking=${bookingId}&error=address`);
  }

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 8 || phone.length > 40) {
    redirect(`/admin/receipts/new?booking=${bookingId}&error=phone`);
  }

  const paymentMethod = String(formData.get("paymentMethod") ?? "TRANSFER");
  if (!PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])) {
    redirect(`/admin/receipts/new?booking=${bookingId}&error=payment`);
  }

  const { subtotal, discount, total } = sumItems(items);
  const settings = await getSettings();

  /* คัดลอกลายเซ็นกับตราประทับมาเก็บไว้ในใบเสร็จตอนออก ไม่ใช่อ้างอิงค่าปัจจุบัน
     ถ้าวันหนึ่งเปลี่ยนผู้มีอำนาจลงนาม ใบเก่าต้องยังมีลายเซ็นของคนที่เซ็นจริงในวันนั้น */
  const signer = settings.signerAdminUserId
    ? await prisma.adminUser.findUnique({
        where: { id: settings.signerAdminUserId },
        select: { name: true, signatureUrl: true },
      })
    : null;

  const year = buddhistYear();
  const seq = await nextReceiptSeq(year);

  const receipt = await prisma.receipt.create({
    data: {
      number: receiptNumber(year, seq),
      year,
      seq,
      bookingId,
      customerName,
      taxId,
      branch: String(formData.get("branch") ?? "").trim() || null,
      address,
      phone,
      items: items as unknown as object,
      subtotal,
      discount,
      total,
      totalText: bahtText(total),
      paymentMethod,
      paymentDetail: String(formData.get("paymentDetail") ?? "").trim() || null,
      signerName: signer?.name ?? null,
      signerSignatureUrl: signer?.signatureUrl ?? null,
      stampUrl: settings.stampUrl,
      viewToken: crypto.randomBytes(24).toString("base64url"),
      issuedById: me.id,
    },
  });

  await audit({
    action: "receipt.create",
    summary: `ออกใบเสร็จ ${receipt.number} — ${total.toLocaleString()} บาท`,
    entity: "booking",
    entityId: bookingId,
    detail: customerName,
  });

  revalidatePath("/admin/receipts");
  revalidatePath("/admin/bookings");
  redirect(`/admin/receipts/${receipt.id}?ok=created`);
}

export async function voidReceiptAction(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("receiptId") ?? "");
  const reason = String(formData.get("voidReason") ?? "").trim();
  if (!id) redirect("/admin/receipts?error=missing");
  if (reason.length < 3) redirect(`/admin/receipts/${id}?error=reason`);

  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) redirect("/admin/receipts?error=missing");
  if (receipt.voidedAt) redirect(`/admin/receipts/${id}?error=already`);

  /* ไม่ลบแถวทิ้ง — เลขที่ใบเสร็จต้องอธิบายได้ว่าหายไปไหน
     ถ้าลบ เลขจะขาดช่วงโดยไม่มีร่องรอย ซึ่งตรวจสอบย้อนหลังไม่ได้ */
  await prisma.receipt.update({
    where: { id },
    data: { voidedAt: new Date(), voidReason: reason.slice(0, 200) },
  });

  await audit({
    action: "receipt.void",
    summary: `ยกเลิกใบเสร็จ ${receipt.number}`,
    entity: "booking",
    entityId: receipt.bookingId,
    detail: reason,
  });

  revalidatePath("/admin/receipts");
  redirect(`/admin/receipts/${id}?ok=voided`);
}

export async function sendReceiptLineAction(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("receiptId") ?? "");
  if (!id) redirect("/admin/receipts?error=missing");

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { booking: { include: { customer: true, car: true } } },
  });
  if (!receipt) redirect("/admin/receipts?error=missing");
  if (receipt.voidedAt) redirect(`/admin/receipts/${id}?error=voided`);

  const lineUserId = receipt.booking.customer.lineUserId;
  if (!lineUserId) redirect(`/admin/receipts/${id}?error=noline`);

  /* LINE ส่งไฟล์ PDF เข้าแชทไม่ได้ (ไม่มี message type สำหรับไฟล์ในฝั่ง push)
     จึงส่งการ์ดพร้อมปุ่มเปิดใบเสร็จแทน ลูกค้ากดแล้วเปิดในเบราว์เซอร์ เซฟหรือแชร์ต่อได้ */
  try {
    await pushRaw(lineUserId, [
      flexReceipt({
        number: receipt.number,
        carLabel: `${receipt.booking.car.brand} ${receipt.booking.car.name}`,
        total: receipt.total,
        totalText: receipt.totalText,
        url: `${siteUrl()}/receipt/${receipt.viewToken}`,
        pdfUrl: `${siteUrl()}/receipt/${receipt.viewToken}/pdf?dl=1`,
      }),
    ]);
  } catch (err) {
    console.error("send receipt failed:", err);
    redirect(`/admin/receipts/${id}?error=sendfail`);
  }

  await prisma.receipt.update({
    where: { id },
    data: { sentToLineAt: new Date() },
  });

  await audit({
    action: "receipt.send",
    summary: `ส่งใบเสร็จ ${receipt.number} ให้ลูกค้าทาง LINE`,
    entity: "booking",
    entityId: receipt.bookingId,
  });

  revalidatePath(`/admin/receipts/${id}`);
  redirect(`/admin/receipts/${id}?ok=sent`);
}

export async function updateReceiptAction(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("receiptId") ?? "");
  if (!id) redirect("/admin/receipts?error=missing");

  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) redirect("/admin/receipts?error=missing");

  const back = `/admin/receipts/${id}/edit`;

  /* แก้ได้ทุกกรณีตามที่ร้านต้องการ รวมทั้งใบที่ยกเลิกแล้วและใบที่ลูกค้าเซ็นรับไปแล้ว
     แต่สองกรณีนั้นมีผลข้างเคียงที่ต้องตามเก็บ จึงบันทึกไว้ในประวัติให้ชัด
     และเปิดทางให้ลบลายเซ็นลูกค้าออกพร้อมกันได้ (ดูตัวเลือกในหน้าแก้ไข) */
  const wasSigned = Boolean(receipt.customerSignatureUrl);
  const clearSignature = formData.get("clearSignature") === "on";

  const items = itemsFromForm(formData);
  if (!items) redirect(`${back}?error=items`);

  const customerName = String(formData.get("customerName") ?? "").trim();
  if (customerName.length < 2 || customerName.length > 150) redirect(`${back}?error=name`);

  const taxId = String(formData.get("taxId") ?? "").trim();
  if (taxId.length < 6 || taxId.length > 30) redirect(`${back}?error=taxId`);

  const address = String(formData.get("address") ?? "").trim();
  if (address.length < 5 || address.length > 300) redirect(`${back}?error=address`);

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 8 || phone.length > 40) redirect(`${back}?error=phone`);

  const paymentMethod = String(formData.get("paymentMethod") ?? "TRANSFER");
  if (!PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])) {
    redirect(`${back}?error=payment`);
  }

  const { subtotal, discount, total } = sumItems(items);

  await prisma.receipt.update({
    where: { id },
    data: {
      customerName,
      taxId,
      branch: String(formData.get("branch") ?? "").trim() || null,
      address,
      phone,
      items: items as unknown as object,
      subtotal,
      discount,
      total,
      totalText: bahtText(total),
      paymentMethod,
      paymentDetail: String(formData.get("paymentDetail") ?? "").trim() || null,
      ...(clearSignature && wasSigned
        ? { customerSignatureUrl: null, customerSignedAt: null }
        : {}),
    },
  });

  /* บันทึกว่ายอดเปลี่ยนจากเท่าไรเป็นเท่าไร ไม่ใช่แค่ "แก้ใบเสร็จ"
     เอกสารการเงินที่แก้ได้ต้องตอบให้ได้ว่าใครแก้อะไรเมื่อไหร่

     สองกรณีท้ายสำคัญเป็นพิเศษ เพราะเป็นการแก้เอกสารที่มีผลผูกพันไปแล้ว
     ถ้าไม่บันทึกไว้ จะไม่มีทางรู้ย้อนหลังว่าลายเซ็นหรือสถานะยกเลิกเกิดก่อนหรือหลังการแก้ */
  const notes = [
    receipt.total !== total
      ? `ยอด ${receipt.total.toLocaleString()} → ${total.toLocaleString()} บาท`
      : "ยอดรวมเท่าเดิม",
    receipt.voidedAt ? "แก้ใบที่ยกเลิกไปแล้ว" : null,
    wasSigned
      ? clearSignature
        ? "ลบลายเซ็นลูกค้าออกเพื่อให้เซ็นใหม่"
        : "แก้หลังลูกค้าเซ็นรับแล้ว โดยคงลายเซ็นเดิมไว้"
      : null,
    receipt.sentToLineAt ? "ใบนี้เคยส่งให้ลูกค้าทาง LINE แล้ว" : null,
  ].filter(Boolean);

  await audit({
    action: "receipt.update",
    summary: `แก้ไขใบเสร็จ ${receipt.number}`,
    entity: "booking",
    entityId: receipt.bookingId,
    detail: notes.join(" · "),
  });

  revalidatePath("/admin/receipts");
  revalidatePath(`/admin/receipts/${id}`);
  redirect(`/admin/receipts/${id}?ok=updated`);
}
