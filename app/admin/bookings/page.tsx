export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { pushMessage, siteUrl } from "@/lib/line";

type BookingRow = {
  id: string;
  status: string;
  totalPrice: number;
  startDate: Date;
  endDate: Date;
  note: string | null;
  car: { brand: string; name: string; licensePlate: string };
  customer: { fullName: string; phone: string };
  deposit: {
    amount: number;
    slipImageUrl: string;
    status: string;
  } | null;
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

  await notifyCustomer(
    bookingId,
    [
      "✅ ยืนยันการจองเรียบร้อยแล้ว",
      "",
      "เราตรวจสอบสลิปมัดจำของคุณเรียบร้อยแล้ว",
      `รหัสจอง: ${bookingId.slice(0, 8).toUpperCase()}`,
      "",
      "แล้วพบกันวันรับรถครับ 🚗",
      `${siteUrl()}/booking/${bookingId}`,
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

  await notifyCustomer(
    bookingId,
    [
      "⚠️ สลิปมัดจำไม่ผ่านการตรวจสอบ",
      "",
      `รหัสจอง: ${bookingId.slice(0, 8).toUpperCase()}`,
      "",
      "กรุณาติดต่อแอดมินเพื่อตรวจสอบอีกครั้ง",
      `${siteUrl()}/booking/${bookingId}`,
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
  revalidatePath("/admin/bookings");
}

const STATUS: Record<string, { text: string; cls: string }> = {
  PENDING_DEPOSIT: { text: "รอตรวจสลิปมัดจำ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CONFIRMED: { text: "ยืนยันแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { text: "ยกเลิก", cls: "bg-red-50 text-red-700 border-red-200" },
  COMPLETED: { text: "เสร็จสิ้น", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
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
  const { status } = await searchParams;
  const active = status && status !== "all" ? status : null;

  const bookings = await prisma.booking.findMany({
    where: active ? { status: active as never } : {},
    orderBy: { createdAt: "desc" },
    include: { car: true, customer: true, deposit: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">รายการจอง</h1>
        <p className="text-slate-500 text-sm mt-1">
          พบ {bookings.length} รายการ
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
          const st = STATUS[b.status] ?? STATUS.PENDING_DEPOSIT;
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
                    {new Date(b.startDate).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    –{" "}
                    {new Date(b.endDate).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
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
                    className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${st.cls}`}
                  >
                    {st.text}
                  </span>
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
                      alt="สลิปมัดจำ"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </a>

                  <div className="text-sm">
                    <p className="text-slate-500">ยอดมัดจำที่แจ้ง</p>
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
                          ยืนยันมัดจำ
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
                  ลูกค้ายังไม่ได้อัปโหลดสลิปมัดจำ
                </div>
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
