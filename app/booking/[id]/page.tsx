import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SlipUpload from "./SlipUpload";

const statusLabel: Record<string, string> = {
  PENDING_DEPOSIT: "รอตรวจสลิปมัดจำ",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { car: true, customer: true, deposit: true },
  });

  if (!booking) notFound();

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-1">สถานะการจอง</h1>
        <p className="text-neutral-400 text-sm mb-6">รหัสการจอง: {booking.id.slice(0, 8)}</p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
          <p className="font-medium">{booking.car.brand} {booking.car.name}</p>
          <p className="text-sm text-neutral-400 mt-1">
            {new Date(booking.startDate).toLocaleDateString("th-TH")} - {new Date(booking.endDate).toLocaleDateString("th-TH")}
          </p>
          <p className="text-sm text-neutral-400">ยอดรวม {booking.totalPrice.toLocaleString()} บาท</p>
          <p className="mt-3 text-sm">
            สถานะ: <span className="text-blue-400">{statusLabel[booking.status]}</span>
          </p>
        </div>

        {!booking.deposit && booking.status === "PENDING_DEPOSIT" && (
          <SlipUpload bookingId={booking.id} suggestedAmount={Math.round(booking.totalPrice * 0.3)} />
        )}

        {booking.deposit && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-sm">
              อัปโหลดสลิปแล้ว ยอด {booking.deposit.amount.toLocaleString()} บาท
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              สถานะ:{" "}
              {booking.deposit.status === "PENDING"
                ? "รอแอดมินตรวจสอบ"
                : booking.deposit.status === "CONFIRMED"
                ? "ยืนยันแล้ว"
                : "ถูกปฏิเสธ กรุณาติดต่อแอดมิน"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
