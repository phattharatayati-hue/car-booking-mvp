export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import SlipUpload from "./SlipUpload";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING_DEPOSIT: {
    label: "รอตรวจสลิปมัดจำ",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  CONFIRMED: {
    label: "ยืนยันแล้ว",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  CANCELLED: {
    label: "ยกเลิกแล้ว",
    className: "bg-red-50 text-red-800 border-red-200",
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
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

  const status = STATUS_STYLE[booking.status] ?? STATUS_STYLE.PENDING_DEPOSIT;

  // ขั้นตอน: จองแล้ว → อัปโหลดสลิป → ยืนยันแล้ว
  const stepDone = [
    true,
    Boolean(booking.deposit),
    booking.status === "CONFIRMED" || booking.status === "COMPLETED",
  ];
  const steps = ["จองสำเร็จ", "อัปโหลดสลิป", "ยืนยันแล้ว"];

  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8">
          <span className="w-14 h-14 rounded-2xl bg-blue-600 text-white grid place-items-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold text-slate-900">สถานะการจอง</h1>
          <p className="text-slate-500 text-sm mt-1">
            รหัสการจอง{" "}
            <span className="font-mono font-medium text-slate-700">
              {booking.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>

        {/* ขั้นตอน */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-center">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center text-sm font-semibold border-2 transition-colors ${
                      stepDone[i]
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    {stepDone[i] ? (
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={`text-[11px] text-center whitespace-nowrap ${
                      stepDone[i] ? "text-slate-900 font-medium" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 -mt-6 rounded ${
                      stepDone[i + 1] ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* รายละเอียด */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs text-slate-500">{booking.car.brand}</p>
              <h2 className="text-lg font-bold text-slate-900">{booking.car.name}</h2>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full border shrink-0 ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">ผู้เช่า</dt>
              <dd className="font-medium text-slate-900">{booking.customer.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">วันรับรถ</dt>
              <dd className="font-medium text-slate-900">
                {new Date(booking.startDate).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">วันคืนรถ</dt>
              <dd className="font-medium text-slate-900">
                {new Date(booking.endDate).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <dt className="text-slate-500">ยอดรวม</dt>
              <dd className="text-lg font-bold text-slate-900">
                {booking.totalPrice.toLocaleString()} ฿
              </dd>
            </div>
          </dl>
        </div>

        {/* รับแจ้งเตือนทาง LINE */}
        {booking.customer.lineUserId ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white grid place-items-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-sm text-emerald-900">
              เปิดรับแจ้งเตือนทาง LINE แล้ว — เราจะแจ้งทันทีที่ตรวจสลิปเสร็จ
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl bg-[#06C755] text-white grid place-items-center shrink-0 font-bold text-sm">
                L
              </span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  รับแจ้งเตือนทาง LINE
                </p>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                  รู้ผลทันทีที่แอดมินตรวจสลิปเสร็จ ไม่ต้องคอยเปิดหน้านี้เช็คเอง
                </p>
              </div>
            </div>
            <a
              href={`/line/link?booking=${booking.id}`}
              className="block text-center w-full rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold py-3 transition-colors"
            >
              เชื่อมต่อกับ LINE
            </a>
          </div>
        )}

        {!booking.deposit && booking.status === "PENDING_DEPOSIT" && (
          <SlipUpload
            bookingId={booking.id}
            suggestedAmount={Math.round(booking.totalPrice * 0.3)}
          />
        )}

        {booking.deposit && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">สลิปมัดจำ</h3>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">ยอดมัดจำที่แจ้ง</dt>
                <dd className="font-medium text-slate-900">
                  {booking.deposit.amount.toLocaleString()} ฿
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">สถานะ</dt>
                <dd className="font-medium">
                  {booking.deposit.status === "PENDING" ? (
                    <span className="text-amber-700">รอแอดมินตรวจสอบ</span>
                  ) : booking.deposit.status === "CONFIRMED" ? (
                    <span className="text-emerald-700">ยืนยันแล้ว</span>
                  ) : (
                    <span className="text-red-700">ถูกปฏิเสธ กรุณาติดต่อแอดมิน</span>
                  )}
                </dd>
              </div>
            </dl>

            {booking.deposit.status === "REJECTED" && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-4">
                สลิปไม่ผ่านการตรวจสอบ กรุณาติดต่อแอดมินที่ LINE @cmcarrent
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/cars" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            ← กลับไปดูรถทั้งหมด
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
