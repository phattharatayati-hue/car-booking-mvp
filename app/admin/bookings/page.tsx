export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { pushMessage, siteUrl } from "@/lib/line";
import { notifyBookingProgress } from "@/lib/booking-notify";
import { formatBangkokDateTime, getSettings } from "@/lib/settings";
import {
  DOCUMENT_KINDS,
  DOCUMENT_LABEL,
  DOC_STATUS_LABEL,
  DOC_STATUS_CLASS,
  type DocumentKind,
  type DocumentStatus,
} from "@/lib/documents";
import { STATUS_LABEL, STATUS_CLASS } from "@/lib/booking-status";
import AssignmentBox from "@/components/AssignmentBox";

type BookingRow = {
  id: string;
  status: string;
  totalPrice: number;
  startDate: Date;
  endDate: Date;
  note: string | null;
  pickupPlace: string | null;
  returnPlace: string | null;
  adminNote: string | null;
  car: {
    brand: string;
    name: string;
    licensePlate: string;
    costPerDay: number | null;
    partner: { name: string; phone: string; lineId: string | null } | null;
  };
  customer: { fullName: string; phone: string };
  deposit: {
    amount: number;
    slipImageUrl: string;
    status: string;
  } | null;
  assignments: {
    id: string;
    kind: string;
    adminUserId: string;
    meetAt: Date;
    place: string | null;
    note: string | null;
    googleEventId: string | null;
    syncError: string | null;
    ackedAt: Date | null;
    doneAt: Date | null;
    odometer: number | null;
    fuelLevel: string | null;
    photos: { id: string; fileUrl: string }[];
    admin: { name: string };
  }[];
  documents: {
    id: string;
    kind: string;
    fileUrl: string;
    status: string;
    rejectReason: string | null;
  }[];
};

/** แจ้งลูกค้าทาง LINE ถ้าเขาผูกบัญชีไว้ — ส่งไม่สำเร็จก็ไม่ให้กระทบงานหลัก */
async function notifyCustomer(bookingId: string, text: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });
    const lineUserId = booking?.customer.lineUserId;
    if (lineUserId) await pushMessage(lineUserId, text);
  } catch (err) {
    console.error("notifyCustomer failed:", err);
  }
}

async function confirmDepositAction(formData: FormData) {
  "use server";
  const bookingId = formData.get("bookingId") as string;
  await prisma.$transaction([
    prisma.deposit.update({
      where: { bookingId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    }),
  ]);

  await audit({
    action: "booking.deposit_confirm",
    summary: `ยืนยันค่าจองของการจอง ${bookingId.slice(0, 8).toUpperCase()}`,
    entity: "booking",
    entityId: bookingId,
  });

  // แจ้งลูกค้าครั้งเดียวเมื่อครบทั้งสลิปและเอกสาร — ตรรกะอยู่ที่ lib/booking-notify.ts
  await notifyBookingProgress(bookingId);

  revalidatePath("/admin/bookings");
}

/** แอดมินกดผ่านเอกสารหนึ่งใบ */
async function approveDocumentAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("documentId") ?? "");

  const doc = await prisma.bookingDocument.update({
    where: { id },
    data: {
      status: "APPROVED",
      rejectReason: null,
      reviewedBy: session.user.email ?? null,
      reviewedAt: new Date(),
    },
  });

  await audit({
    action: "booking.document_approve",
    summary: `อนุมัติเอกสาร ${DOCUMENT_LABEL[doc.kind as DocumentKind]} ของการจอง ${doc.bookingId
      .slice(0, 8)
      .toUpperCase()}`,
    entity: "booking",
    entityId: doc.bookingId,
  });

  // แจ้งลูกค้าเฉพาะตอนเอกสารผ่านครบทุกใบ ไม่ใช่ทีละใบ
  const all = await prisma.bookingDocument.findMany({
    where: { bookingId: doc.bookingId },
    select: { kind: true, status: true },
  });
  const allApproved =
    all.length === DOCUMENT_KINDS.length &&
    all.every((d: { status: string }) => d.status === "APPROVED");

  if (allApproved) {
    // เอกสารครบแล้ว — จะส่งจริงก็ต่อเมื่อสลิปผ่านด้วย
    await notifyBookingProgress(doc.bookingId);
  }

  revalidatePath("/admin/bookings");
}

/** แอดมินกดไม่ผ่าน พร้อมบอกเหตุผลให้ลูกค้าส่งใหม่ได้ถูก */
async function rejectDocumentAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("documentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const doc = await prisma.bookingDocument.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectReason: reason || "รูปไม่ชัด กรุณาถ่ายใหม่",
      reviewedBy: session.user.email ?? null,
      reviewedAt: new Date(),
    },
  });

  await audit({
    action: "booking.document_reject",
    summary: `ปฏิเสธเอกสาร ${DOCUMENT_LABEL[doc.kind as DocumentKind]} ของการจอง ${doc.bookingId
      .slice(0, 8)
      .toUpperCase()}`,
    entity: "booking",
    entityId: doc.bookingId,
    detail: `เหตุผล: ${doc.rejectReason}`,
  });

  await notifyCustomer(
    doc.bookingId,
    [
      "⚠️ เอกสารไม่ผ่านการตรวจสอบ",
      "",
      `เอกสาร: ${DOCUMENT_LABEL[doc.kind as DocumentKind]}`,
      `เหตุผล: ${doc.rejectReason}`,
      "",
      "กรุณาถ่ายใหม่แล้วอัปโหลดอีกครั้งครับ",
      `${siteUrl()}/booking/${doc.bookingId}`,
    ].join("\n")
  );

  revalidatePath("/admin/bookings");
}

async function rejectDepositAction(formData: FormData) {
  "use server";
  const bookingId = formData.get("bookingId") as string;
  await prisma.deposit.update({
    where: { bookingId },
    data: { status: "REJECTED" },
  });

  await audit({
    action: "booking.deposit_reject",
    summary: `ปฏิเสธสลิปค่าจองของการจอง ${bookingId.slice(0, 8).toUpperCase()}`,
    entity: "booking",
    entityId: bookingId,
  });

  await notifyCustomer(
    bookingId,
    [
      "⚠️ สลิปค่าจองไม่ผ่านการตรวจสอบ",
      "",
      `รหัสจอง: ${bookingId.slice(0, 8).toUpperCase()}`,
      "",
      "กรุณาติดต่อแอดมินเพื่อตรวจสอบอีกครั้ง",
      `${siteUrl()}/booking/${bookingId}`,
    ].join("\n")
  );

  revalidatePath("/admin/bookings");
}

/** เจ้าของรถแจ้งว่าว่าง — เปิดให้ลูกค้าโอนค่าจอง */
async function approveRequestAction(formData: FormData) {
  "use server";
  const bookingId = formData.get("bookingId") as string;
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "PENDING_DEPOSIT", adminNote },
    include: { car: true },
  });

  await audit({
    action: "booking.request_approve",
    summary: `อนุมัติคำขอจอง ${bookingId.slice(0, 8).toUpperCase()} — ${booking.car.brand} ${
      booking.car.name
    }`,
    entity: "booking",
    entityId: bookingId,
    detail: adminNote ? `หมายเหตุ: ${adminNote}` : undefined,
  });

  await notifyCustomer(
    bookingId,
    [
      "✅ รถว่าง! ยืนยันคำขอจองแล้ว",
      "",
      `รถ: ${booking.car.brand} ${booking.car.name}`,
      `รับรถ: ${formatBangkokDateTime(booking.startDate)}`,
      `คืนรถ: ${formatBangkokDateTime(booking.endDate)}`,
      `ยอดรวม: ${booking.totalPrice.toLocaleString()} บาท`,
      "",
      `กรุณาโอนค่าจอง ${(await getSettings()).bookingFee.toLocaleString()} บาท`,
      "แล้วส่งรูปสลิปเข้ามาในแชทนี้ได้เลยครับ",
      "",
      `${siteUrl()}/booking/${bookingId}`,
    ].join("\n")
  );

  revalidatePath("/admin/bookings");
}

/** เจ้าของรถแจ้งว่าไม่ว่าง */
async function rejectRequestAction(formData: FormData) {
  "use server";
  const bookingId = formData.get("bookingId") as string;
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED", adminNote },
    include: { car: true },
  });

  await audit({
    action: "booking.request_reject",
    summary: `ปฏิเสธคำขอจอง ${bookingId.slice(0, 8).toUpperCase()} — ${booking.car.brand} ${
      booking.car.name
    }`,
    entity: "booking",
    entityId: bookingId,
    detail: adminNote ? `หมายเหตุ: ${adminNote}` : undefined,
  });

  await notifyCustomer(
    bookingId,
    [
      "😔 ขออภัย รถไม่ว่างในช่วงที่ขอ",
      "",
      `รถ: ${booking.car.brand} ${booking.car.name}`,
      `รับรถ: ${formatBangkokDateTime(booking.startDate)}`,
      "",
      "เจ้าของรถแจ้งว่ารถไม่ว่างในช่วงเวลานี้",
      'พิมพ์ "จองรถ" เพื่อเลือกรถคันอื่นหรือวันอื่นได้เลยครับ',
    ].join("\n")
  );

  revalidatePath("/admin/bookings");
}

async function cancelBookingAction(formData: FormData) {
  "use server";
  const bookingId = formData.get("bookingId") as string;
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  await audit({
    action: "booking.cancel",
    summary: `ยกเลิกการจอง ${bookingId.slice(0, 8).toUpperCase()}`,
    entity: "booking",
    entityId: bookingId,
  });

  revalidatePath("/admin/bookings");
}

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "REQUESTED", label: "คำขอรอเช็ค" },
  { key: "PENDING_DEPOSIT", label: "รอตรวจสลิป" },
  { key: "CONFIRMED", label: "ยืนยันแล้ว" },
  { key: "COMPLETED", label: "เสร็จสิ้น" },
  { key: "CANCELLED", label: "ยกเลิก" },
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();

  const { status } = await searchParams;
  const active = status && status !== "all" ? status : null;

  const bookings = await prisma.booking.findMany({
    where: active ? { status: active as never } : {},
    orderBy: { createdAt: "desc" },
    include: {
      car: { include: { partner: true } },
      customer: true,
      deposit: true,
      documents: true,
      assignments: {
        include: {
          admin: true,
          photos: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // รายชื่อแอดมินสำหรับเลือกผู้รับงาน
  const admins = await prisma.adminUser.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, googleConnectedAt: true },
  });

  const requestCount = await prisma.booking.count({ where: { status: "REQUESTED" } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">รายการจอง</h1>
        <p className="text-slate-500 text-sm mt-1">
          พบ {bookings.length} รายการ
          {requestCount > 0 && (
            <span className="ml-2 text-violet-700 font-medium">
              · มีคำขอรอเช็ค {requestCount} รายการ
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const isActive = (status ?? "all") === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/bookings" : `/admin/bookings?status=${f.key}`}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {bookings.map((b: BookingRow) => {
          const label = STATUS_LABEL[b.status] ?? b.status;
          const cls = STATUS_CLASS[b.status] ?? STATUS_CLASS.PENDING_DEPOSIT;
          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold text-slate-900">
                      {b.car.brand} {b.car.name}
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {b.car.licensePlate}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {b.customer.fullName} · {b.customer.phone}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    รับ {formatBangkokDateTime(b.startDate)}
                  </p>
                  <p className="text-sm text-slate-500">
                    คืน {formatBangkokDateTime(b.endDate)}
                  </p>
                  {(b.pickupPlace || b.returnPlace) && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      จุดรับ-ส่ง: {b.pickupPlace ?? "—"} → {b.returnPlace ?? "—"}
                    </p>
                  )}
                  {b.note && (
                    <p className="text-sm text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      หมายเหตุ: {b.note}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-slate-900">
                    {b.totalPrice.toLocaleString()} ฿
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}
                  >
                    {label}
                  </span>
                </div>
              </div>

              {b.status === "REQUESTED" && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-violet-900 mb-2">
                      ติดต่อเจ้าของรถเพื่อเช็ควันว่าง
                    </p>
                    {b.car.partner ? (
                      <div className="text-sm text-violet-900/90 space-y-0.5">
                        <p>ชื่อ: {b.car.partner.name}</p>
                        <p>
                          โทร:{" "}
                          <a href={`tel:${b.car.partner.phone}`} className="underline font-medium">
                            {b.car.partner.phone}
                          </a>
                        </p>
                        {b.car.partner.lineId && <p>LINE: {b.car.partner.lineId}</p>}
                        {b.car.costPerDay != null && (
                          <p className="pt-1">
                            ทุน {b.car.costPerDay.toLocaleString()} ฿/วัน · กำไรประมาณ{" "}
                            <strong>
                              {(
                                b.totalPrice -
                                b.car.costPerDay *
                                  Math.max(
                                    1,
                                    Math.ceil(
                                      (new Date(b.endDate).getTime() -
                                        new Date(b.startDate).getTime()) /
                                        86400000
                                    )
                                  )
                              ).toLocaleString()}{" "}
                              ฿
                            </strong>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-violet-900/90">
                        ยังไม่ได้ผูกรถคันนี้กับเจ้าของรถ — ไปตั้งค่าได้ที่หน้าจัดการรถ
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={approveRequestAction} className="flex flex-wrap gap-2 flex-1">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input
                        name="adminNote"
                        placeholder="บันทึกภายใน (ไม่บังคับ)"
                        className="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                      />
                      <button className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-600/25 transition-colors">
                        รถว่าง — แจ้งลูกค้าโอนค่าจอง
                      </button>
                    </form>
                    <form action={rejectRequestAction}>
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button className="text-sm font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors">
                        รถไม่ว่าง
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {b.adminNote && (
                <p className="mt-3 text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  บันทึกภายใน: {b.adminNote}
                </p>
              )}

              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-2.5">
                  เอกสารลูกค้า{" "}
                  <span className="text-slate-400 font-normal">
                    (ผ่านแล้ว{" "}
                    {b.documents.filter((d) => d.status === "APPROVED").length}/
                    {DOCUMENT_KINDS.length})
                  </span>
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {DOCUMENT_KINDS.map((kind: DocumentKind) => {
                    const doc = b.documents.find((d) => d.kind === kind);

                    if (!doc) {
                      return (
                        <div
                          key={kind}
                          className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="text-[11px] font-medium text-slate-500 mb-2">
                            {DOCUMENT_LABEL[kind]}
                          </p>
                          <div className="h-24 grid place-items-center text-xs text-slate-400">
                            ยังไม่ส่ง
                          </div>
                        </div>
                      );
                    }

                    const status = doc.status as DocumentStatus;

                    return (
                      <div key={kind} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-[11px] font-medium text-slate-600 leading-tight">
                            {DOCUMENT_LABEL[kind]}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${DOC_STATUS_CLASS[status]}`}
                          >
                            {DOC_STATUS_LABEL[status]}
                          </span>
                        </div>

                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-400 transition-colors"
                          title="เปิดดูขนาดเต็ม"
                        >
                          <Image
                            src={doc.fileUrl}
                            alt={DOCUMENT_LABEL[kind]}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </a>

                        {doc.rejectReason && (
                          <p className="mt-2 text-[11px] text-red-700 leading-relaxed">
                            {doc.rejectReason}
                          </p>
                        )}

                        {status !== "APPROVED" && (
                          <form action={approveDocumentAction} className="mt-2">
                            <input type="hidden" name="documentId" value={doc.id} />
                            <button
                              type="submit"
                              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                            >
                              ผ่าน
                            </button>
                          </form>
                        )}

                        {status !== "REJECTED" && (
                          <form action={rejectDocumentAction} className="mt-2 flex flex-col gap-2">
                            <input type="hidden" name="documentId" value={doc.id} />
                            <input
                              name="reason"
                              placeholder="เหตุผล เช่น รูปเบลอ"
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-400"
                            />
                            <button
                              type="submit"
                              className="w-full py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
                            >
                              ไม่ผ่าน
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {b.deposit && (
                <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-5">
                  <a
                    href={b.deposit.slipImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="relative w-24 h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 hover:border-blue-400 transition-colors"
                    title="เปิดดูสลิปขนาดเต็ม"
                  >
                    <Image
                      src={b.deposit.slipImageUrl}
                      alt="สลิปค่าจอง"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </a>

                  <div className="text-sm">
                    <p className="text-slate-500">ยอดค่าจองที่แจ้ง</p>
                    <p className="text-lg font-bold text-slate-900">
                      {b.deposit.amount.toLocaleString()} ฿
                    </p>
                    <p className="text-slate-500 mt-1">
                      สถานะสลิป:{" "}
                      <span
                        className={
                          b.deposit.status === "CONFIRMED"
                            ? "text-emerald-700 font-medium"
                            : b.deposit.status === "REJECTED"
                            ? "text-red-700 font-medium"
                            : "text-amber-700 font-medium"
                        }
                      >
                        {b.deposit.status === "PENDING"
                          ? "รอตรวจ"
                          : b.deposit.status === "CONFIRMED"
                          ? "ยืนยันแล้ว"
                          : "ปฏิเสธ"}
                      </span>
                    </p>
                  </div>

                  {b.deposit.status === "PENDING" && (
                    <div className="flex gap-2 sm:ml-auto">
                      <form action={confirmDepositAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-600/25 transition-colors">
                          ยืนยันค่าจอง
                        </button>
                      </form>
                      <form action={rejectDepositAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button className="text-sm font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors">
                          ปฏิเสธ
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {!b.deposit && b.status === "PENDING_DEPOSIT" && (
                <div className="mt-5 pt-5 border-t border-slate-100 text-sm text-slate-500">
                  ลูกค้ายังไม่ได้อัปโหลดสลิปค่าจอง
                </div>
              )}

              {b.status !== "CANCELLED" && b.status !== "REJECTED" && (
                <AssignmentBox
                  booking={{
                    id: b.id,
                    startDate: b.startDate,
                    endDate: b.endDate,
                    pickupPlace: b.pickupPlace ?? null,
                    returnPlace: b.returnPlace ?? null,
                  }}
                  admins={admins}
                  assignments={b.assignments}
                />
              )}

              {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <form action={cancelBookingAction}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <button className="text-xs text-slate-400 hover:text-red-600 transition-colors">
                      ยกเลิกการจองนี้
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}

        {bookings.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-20 text-center">
            <p className="text-slate-500">ไม่มีรายการจองในหมวดนี้</p>
          </div>
        )}
      </div>
    </div>
  );
}
