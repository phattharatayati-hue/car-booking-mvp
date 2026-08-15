import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Image from "next/image";

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
  revalidatePath("/admin/bookings");
}

async function rejectDepositAction(formData: FormData) {
  "use server";
  const bookingId = formData.get("bookingId") as string;
  await prisma.deposit.update({
    where: { bookingId },
    data: { status: "REJECTED" },
  });
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

const statusLabel: Record<string, string> = {
  PENDING_DEPOSIT: "รอตรวจสลิปมัดจำ",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
};

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { car: true, customer: true, deposit: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-white">รายการจอง</h1>

      <div className="flex flex-col gap-4">
        {bookings.map((b) => (
          <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-white">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-medium">
                  {b.car.brand} {b.car.name} · {b.customer.fullName} ({b.customer.phone})
                </p>
                <p className="text-sm text-neutral-400 mt-1">
                  {new Date(b.startDate).toLocaleDateString("th-TH")} - {new Date(b.endDate).toLocaleDateString("th-TH")} · {b.totalPrice.toLocaleString()} บาท
                </p>
              </div>
              <span className="text-sm px-3 py-1 h-fit rounded-full bg-neutral-800">
                {statusLabel[b.status]}
              </span>
            </div>

            {b.deposit && (
              <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap items-center gap-4">
                <div className="relative w-28 h-40 rounded-md overflow-hidden bg-neutral-800 shrink-0">
                  <Image src={b.deposit.slipImageUrl} alt="สลิปมัดจำ" fill className="object-cover" unoptimized />
                </div>
                <div className="text-sm">
                  <p>ยอดมัดจำ: {b.deposit.amount.toLocaleString()} บาท</p>
                  <p className="text-neutral-400">สถานะสลิป: {b.deposit.status === "PENDING" ? "รอตรวจ" : b.deposit.status === "CONFIRMED" ? "ยืนยันแล้ว" : "ปฏิเสธ"}</p>
                </div>
                {b.deposit.status === "PENDING" && (
                  <div className="flex gap-2 ml-auto">
                    <form action={confirmDepositAction}>
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md">
                        ยืนยันมัดจำ
                      </button>
                    </form>
                    <form action={rejectDepositAction}>
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button className="text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md">
                        ปฏิเสธ
                      </button>
                    </form>
                  </div>
                )}
                {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                  <form action={cancelBookingAction} className="ml-auto">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <button className="text-xs text-neutral-400 hover:text-red-400">ยกเลิกการจอง</button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="text-center text-neutral-500 py-10">ยังไม่มีรายการจอง</div>
        )}
      </div>
    </div>
  );
}
