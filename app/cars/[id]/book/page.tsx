export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import BookingForm from "./BookingForm";
import { getSettings, timeOptions } from "@/lib/settings";
import ServiceNote from "@/components/ServiceNote";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { getAfterHoursRates } from "@/lib/after-hours-server";
import { needsApproval } from "@/lib/booking-status";
import { getAvailability } from "@/lib/availability";
import { bangkokDateStr } from "@/lib/settings";

export default async function BookCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const car = await prisma.car.findUnique({ where: { id } });

  if (!car || car.status !== "AVAILABLE") {
    notFound();
  }

  const settings = await getSettings();
  const pickupPoints = await getPickupPoints();
  const afterHoursRates = await getAfterHoursRates();
  const times = timeOptions();
  const isRequest = needsApproval(car);

  const fromStr = bangkokDateStr(new Date());
  const availabilityMap = await getAvailability([car.id], fromStr, 90);
  const availability = availabilityMap.get(car.id) ?? {};

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
          <span className="mx-2">/</span>
          <Link href="/cars" className="hover:text-blue-700">รถทั้งหมด</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700">จองรถ</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
          {/* ฟอร์ม */}
          <div className="order-2 lg:order-1 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">
              {isRequest ? "ขอจองรถ" : "รายละเอียดการจอง"}
            </h1>
            <p className="text-slate-500 text-sm mt-1 mb-7">
              กรอกข้อมูลให้ครบถ้วน เราจะติดต่อกลับเพื่อยืนยัน
            </p>
            <ServiceNote note={settings.serviceNote} className="mb-6" />
            <BookingForm
              carId={car.id}
              pricePerDay={car.pricePerDay}
              timeOptions={times}
              afterHoursRates={afterHoursRates}
              isRequest={isRequest}
              availability={availability}
              pickupPoints={pickupPoints}
            />
          </div>

          {/* สรุปรถ */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="relative w-full aspect-[4/3] bg-slate-100">
                {car.photoUrl ? (
                  <Image
                    src={car.photoUrl}
                    alt={`${car.brand} ${car.name}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
                      <path
                        d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-500">{car.brand}</p>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{car.name}</h2>

                <dl className="mt-5 flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">ทะเบียน</dt>
                    <dd className="font-medium text-slate-900">{car.licensePlate}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">ประเภท</dt>
                    <dd className="font-medium text-slate-900">
                      {car.source === "OWN" ? "รถของเรา" : "รถพาร์ทเนอร์"}
                    </dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <dt className="text-slate-500">ราคาต่อวัน</dt>
                    <dd className="text-lg font-bold text-blue-700">
                      {car.pricePerDay.toLocaleString()} ฿
                    </dd>
                  </div>
                </dl>

                <div
                  className={`mt-5 rounded-xl p-4 text-xs leading-relaxed ${
                    isRequest ? "bg-violet-50 text-violet-900" : "bg-blue-50 text-blue-900"
                  }`}
                >
                  รับ-คืนรถได้ทุกเวลา · นอกเวลาทำการมีค่าบริการเพิ่มตามช่วงเวลา
                  <br />
                  {isRequest ? (
                    <>
                      รถคันนี้เป็นรถจากพาร์ทเนอร์ — เมื่อส่งคำขอแล้ว
                      เราจะเช็ควันว่างกับเจ้าของรถและแจ้งผลกลับ
                      <strong> ยังไม่ต้องโอนค่าจองจนกว่าจะได้รับการยืนยัน</strong>
                    </>
                  ) : (
                    <>
                      หลังจองสำเร็จ ระบบจะแสดงยอดค่าจอง {settings.bookingFee.toLocaleString()} บาท
                      ให้โอนแล้วอัปโหลดสลิปเพื่อยืนยันการจอง
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
