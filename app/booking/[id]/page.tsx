export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LINE_OA_ID } from "@/lib/contact";
import PublicShell from "@/components/PublicShell";
import SlipUpload from "./SlipUpload";
import DocumentUpload from "./DocumentUpload";
import PlacePicker from "./PlacePicker";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { formatBangkokDateTime, getSettings } from "@/lib/settings";

import { STATUS_LABEL, STATUS_CLASS, needsApproval } from "@/lib/booking-status";

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { car: true, customer: true, deposit: true, documents: true },
  });

  if (!booking) notFound();

  const settings = await getSettings();
  const pickupPoints = await getPickupPoints();
  const isOpen = !["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status);

  const isRequest = needsApproval(booking.car);
  const approved = !["REQUESTED", "REJECTED"].includes(booking.status);

  const steps = isRequest
    ? ["ส่งคำขอ", "ร้านยืนยัน", "อัปโหลดสลิป", "จองสำเร็จ"]
    : ["จองสำเร็จ", "อัปโหลดสลิป", "ยืนยันแล้ว"];

  const stepDone = isRequest
    ? [
        true,
        approved,
        Boolean(booking.deposit),
        booking.status === "CONFIRMED" || booking.status === "COMPLETED",
      ]
    : [
        true,
        Boolean(booking.deposit),
        booking.status === "CONFIRMED" || booking.status === "COMPLETED",
      ];

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
              className={`text-xs font-medium px-3 py-1.5 rounded-full border shrink-0 ${
                STATUS_CLASS[booking.status] ?? STATUS_CLASS.PENDING_DEPOSIT
              }`}
            >
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">ผู้เช่า</dt>
              <dd className="font-medium text-slate-900">{booking.customer.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">รับรถ</dt>
              <dd className="font-medium text-slate-900">
                {formatBangkokDateTime(booking.startDate)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">คืนรถ</dt>
              <dd className="font-medium text-slate-900">
                {formatBangkokDateTime(booking.endDate)}
              </dd>
            </div>
            {booking.pickupPlace && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">จุดรับรถ</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {booking.pickupPlace}
                </dd>
              </div>
            )}
            {booking.returnPlace && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">จุดคืนรถ</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {booking.returnPlace}
                </dd>
              </div>
            )}
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

        {booking.status === "REQUESTED" && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-5">
            <p className="font-semibold text-violet-900 text-sm mb-1">
              กำลังเช็ควันว่างกับเจ้าของรถ
            </p>
            <p className="text-sm text-violet-900/90 leading-relaxed">
              รถคันนี้เป็นรถจากพาร์ทเนอร์ เราจะติดต่อเจ้าของรถและแจ้งผลกลับโดยเร็วที่สุด
              <br />
              <strong>ยังไม่ต้องโอนค่าจองจนกว่าจะได้รับการยืนยัน</strong>
            </p>
          </div>
        )}

        {booking.status === "REJECTED" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
            <p className="font-semibold text-red-900 text-sm mb-1">รถไม่ว่างในช่วงที่ขอ</p>
            <p className="text-sm text-red-900/90 leading-relaxed">
              ขออภัยครับ เจ้าของรถแจ้งว่ารถไม่ว่างในช่วงเวลาที่คุณเลือก
              กรุณาเลือกวันอื่นหรือรถคันอื่น
            </p>
            <Link
              href="/cars"
              className="inline-block mt-4 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              ดูรถคันอื่น
            </Link>
          </div>
        )}

        {isOpen && pickupPoints.length > 0 && (
          <div className="mb-5">
            <PlacePicker
              bookingId={booking.id}
              points={pickupPoints}
              currentPickup={booking.pickupPlace}
              currentReturn={booking.returnPlace}
            />
          </div>
        )}

        {isOpen && (
          <div className="mb-5">
            <DocumentUpload
              bookingId={booking.id}
              uploaded={booking.documents.map(
                (d: {
                  kind: string;
                  fileUrl: string;
                  status: string;
                  rejectReason: string | null;
                }) => ({
                  kind: d.kind,
                  fileUrl: d.fileUrl,
                  status: d.status,
                  rejectReason: d.rejectReason,
                })
              )}
            />
          </div>
        )}

        {!booking.deposit && booking.status === "PENDING_DEPOSIT" && (
          <SlipUpload
            bookingId={booking.id}
            suggestedAmount={settings.bookingFee}
            securityDeposit={settings.securityDeposit}
          />
        )}

        {booking.deposit && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">สลิปค่าจอง</h3>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">ยอดค่าจองที่แจ้ง</dt>
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
                สลิปไม่ผ่านการตรวจสอบ กรุณาติดต่อแอดมินที่ LINE {LINE_OA_ID}
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
