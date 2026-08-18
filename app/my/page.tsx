export const dynamic = "force-dynamic";

import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import MyLogin from "./MyLogin";
import LogoutButton from "./LogoutButton";
import { prisma } from "@/lib/prisma";
import { getSessionPhone } from "@/lib/customer-session";
import { lineAddFriendUrl } from "@/lib/line-public";
import { formatBangkokDateTime } from "@/lib/settings";
import { STATUS_LABEL, STATUS_CLASS, ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";

const UPCOMING = new Set<string>(ACTIVE_BOOKING_STATUSES);

export default async function MyBookingsPage() {
  const phone = await getSessionPhone();

  if (!phone) {
    return (
      <PublicShell>
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Crumbs />
          <MyLogin addFriendUrl={lineAddFriendUrl()} />
        </div>
      </PublicShell>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { customer: { phone } },
    include: { car: true, deposit: true, customer: true },
    orderBy: { createdAt: "desc" },
  });

  const name = bookings[0]?.customer.fullName ?? "";
  const upcoming = bookings.filter((b) => UPCOMING.has(b.status));
  const past = bookings.filter((b) => !UPCOMING.has(b.status));
  const totalSpent = bookings
    .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Crumbs />

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ประวัติการจอง</h1>
            <p className="text-sm text-slate-500 mt-1">
              {name ? `${name} · ` : ""}
              {phone}
            </p>
          </div>
          <LogoutButton />
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-slate-600 mb-5">ยังไม่มีประวัติการจองด้วยเบอร์นี้</p>
            <Link
              href="/cars"
              className="inline-block rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 transition-colors"
            >
              ดูรถทั้งหมด
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <Stat label="ทั้งหมด" value={`${bookings.length} ครั้ง`} />
              <Stat label="กำลังดำเนินการ" value={`${upcoming.length} รายการ`} />
              <Stat label="ยอดจองรวม" value={`฿${totalSpent.toLocaleString()}`} />
            </div>

            {upcoming.length > 0 && (
              <Section title="กำลังดำเนินการ">
                {upcoming.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </Section>
            )}

            {past.length > 0 && (
              <Section title="ที่ผ่านมา">
                {past.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </PublicShell>
  );
}

function Crumbs() {
  return (
    <nav className="text-sm text-slate-500 mb-6">
      <Link href="/" className="hover:text-blue-700">
        หน้าแรก
      </Link>
      <span className="mx-2">/</span>
      <span className="text-slate-700">ประวัติการจอง</span>
    </nav>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 mb-3">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

type Row = {
  id: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: string;
  car: { name: string; brand: string; licensePlate: string; photoUrl: string | null };
  deposit: { status: string } | null;
};

function BookingRow({ booking }: { booking: Row }) {
  const needsSlip = booking.status === "PENDING_DEPOSIT" && !booking.deposit;

  return (
    <Link
      href={`/booking/${booking.id}`}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm p-4 flex gap-4 transition-all"
    >
      <div className="w-24 h-20 rounded-xl bg-slate-100 shrink-0 overflow-hidden grid place-items-center">
        {booking.car.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.car.photoUrl}
            alt={booking.car.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-slate-300">
            <path
              d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-slate-900 truncate group-hover:text-blue-700">
            {booking.car.brand} {booking.car.name}
          </p>
          <span
            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
              STATUS_CLASS[booking.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-0.5">{booking.car.licensePlate}</p>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          รับ {formatBangkokDateTime(booking.startDate)}
          <br />
          คืน {formatBangkokDateTime(booking.endDate)}
        </p>

        <div className="flex items-center justify-between gap-3 mt-2">
          <span className="font-bold text-slate-900">
            ฿{booking.totalPrice.toLocaleString()}
          </span>
          {needsSlip && (
            <span className="text-xs font-medium text-amber-700">
              ต้องอัปโหลดสลิปค่าจอง →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
