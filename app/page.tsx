export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import CarCard from "@/components/CarCard";
import { getAvailability, firstFreeDate } from "@/lib/availability";
import { earliestPickupDateStr } from "@/lib/booking-rules";
import { getSettings } from "@/lib/settings";
import { LINE_OA_ID } from "@/lib/contact";

/**
 * หน้าแรก — เรียงตามแบบที่บริษัทอนุมัติ
 *
 *   1. รูปใหญ่ — ข้อความซ้าย รถขวา คลุมผ้าเขียวเข้ม
 *   2. ยี่ห้อรถ — นับจากรถที่มีจริงในระบบ
 *   3. รถแนะนำ
 *   4. ทำไมต้องเรา — แผงเขียวเข้ม 4 ข้อ
 *   5. จองง่ายใน 4 ขั้นตอน
 *   6. แถบปิดหน้า — ชวนเพิ่มเพื่อน LINE
 *
 * รูปใหญ่เป็นไฟล์นิ่งที่ public/hero-civic-rs.webp คลุมด้วยผ้าไล่สี
 * (คลาส hero-veil ใน globals.css — ค่ายกมาจากไฟล์แบบที่อนุมัติ)
 * อยากเปลี่ยนรถหน้าร้าน เอาไฟล์ใหม่ไปทับที่เดิม ไม่ต้องแก้โค้ด
 *
 * ตัวเลขทุกตัวในหน้านี้มาจากฐานข้อมูลหรือหน้าตั้งค่าจริง
 * ไม่มีตัวเลขที่พิมพ์ตายไว้ให้ดูดี
 */

export default async function HomePage() {
  const settings = await getSettings();

  const cars = await prisma.car.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { pricePerDay: "asc" },
    take: 6,
  });

  const totalCars = await prisma.car.count({ where: { status: "AVAILABLE" } });
  const minPrice = cars.length ? cars[0].pricePerDay : null;

  const brandRows = await prisma.car.groupBy({
    by: ["brand"],
    where: { status: "AVAILABLE" },
    _count: { _all: true },
    orderBy: { _count: { brand: "desc" } },
    take: 6,
  });

  /* นับความว่างจาก "วันแรกที่จองได้" ไม่ใช่วันนี้ — ไม่งั้นการ์ดจะบอกว่าว่าง
     ทั้งที่กดจองวันนั้นไม่ได้ (ดู lib/booking-rules.ts) */
  const fromStr = earliestPickupDateStr(settings.minLeadHours);
  const availabilityMap = await getAvailability(
    cars.map((c: CarCardData) => c.id),
    fromStr,
    60
  );

  function availabilityFor(carId: string) {
    const map = availabilityMap.get(carId) ?? {};
    return {
      busyToday: map[fromStr] === "full",
      nextFree: firstFreeDate(map, fromStr, 60),
      from: fromStr,
    };
  }

  const WHY = [
    { title: "ประกันชั้น 1 ทุกคัน", desc: "เงินประกันคืนให้ครบเมื่อคืนรถเรียบร้อย", icon: ICON_SHIELD },
    { title: "รับส่งถึงที่", desc: "สนามบิน โรงแรม หรือจุดที่นัดไว้ในตัวเมือง", icon: ICON_PIN },
    { title: "จองผ่าน LINE ได้", desc: "เลือกรถ เลือกวัน ส่งสลิป จบในแชทเดียว", icon: ICON_CHAT },
    { title: "ราคาชัดเจน", desc: "เห็นยอดรวมทุกก้อนก่อนกดจอง ไม่มีบวกเพิ่มทีหลัง", icon: ICON_TAG },
  ];

  const STEPS = [
    { title: "เลือกรถและวันเวลา", desc: "ปฏิทินบอกว่าคันไหนว่างจริง ระบุเวลารับ-คืนได้" },
    { title: "กรอกข้อมูลและจุดรับรถ", desc: "เลือกจุดรับรถที่สะดวก หรือระบุที่อยู่เอง" },
    { title: "โอนค่าจองและแนบสลิป", desc: "โอนค่าจองเพื่อกันวันไว้ให้ แล้วแนบสลิปในระบบ" },
    { title: "รับรถตามนัด", desc: "พนักงานนำรถไปส่ง พร้อมแจ้งเตือนทาง LINE" },
  ];

  return (
    <PublicShell hero>
      {/* ============ 1. รูปใหญ่ ============
          จอคอม  รูปเต็มพื้นหลัง ครอปด้วย object-cover แล้วคลุมผ้าเขียว
          มือถือ  ใช้พื้นไล่สีเขียวล้วน แล้ววางรูปรถเวอร์ชันตัดใหม่ไว้ใต้ข้อความ

          ทำไมต้องแยกสองแบบ
            รูปพื้นหลังสัดส่วน 2.4:1 พอมาอยู่ในกรอบมือถือที่เป็นแนวตั้ง
            object-cover จะครอปด้านข้างทิ้งจนเหลือแค่ล้อรถ
            จึงทำไฟล์ hero-civic-rs-mobile.webp ที่ครอบเฉพาะตัวรถไว้แยก

          หมายเหตุเรื่องแคช
            Next.js เก็บรูปที่ย่อแล้วไว้ใน .next/cache/images โดยอ้างชื่อไฟล์
            ถ้าเอาไฟล์ใหม่ไปทับชื่อเดิม เว็บจะยังส่งรูปเก่าให้อยู่
            เปลี่ยนรูปหน้าร้านคราวหน้าให้ "ตั้งชื่อไฟล์ใหม่" แล้วแก้ src ตรงนี้
            หรือลบโฟลเดอร์ .next แล้วรัน npm run dev ใหม่ */}
      <section className="relative overflow-hidden bg-panel-deep">
        {/* พื้นสำหรับมือถือ */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "radial-gradient(70% 50% at 80% 12%, rgba(217,194,155,0.18) 0%, transparent 70%), linear-gradient(165deg, #1e5841 0%, #17452f 55%, #0d2b1f 100%)",
          }}
        />

        {/* รูปเต็มพื้นหลังสำหรับจอคอม */}
        <div className="hidden lg:block absolute inset-0">
          <Image
            src="/hero-civic-rs.webp"
            alt=""
            fill
            priority
            data-no-dim
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "62% 50%" }}
          />
          <div className="absolute inset-0 hero-veil" />
          <div className="absolute inset-0 hero-veil-2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-12 lg:pt-44 lg:pb-20 lg:min-h-[88vh] lg:flex lg:items-end">
          <div className="w-full lg:max-w-[640px] animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-fixed" />
              บริการเช่ารถเชียงใหม่ · รับส่งถึงที่
            </span>

            <h1 className="mt-6 text-[34px] sm:text-5xl lg:text-[56px] font-bold tracking-tight text-white leading-[1.14]">
              เช่ารถคุณภาพ
              <br />
              <span className="text-gold-fixed">ส่งถึงมือคุณ ทุกที่ในเชียงใหม่</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-[470px] [text-shadow:0_1px_10px_rgba(0,0,0,0.35)]">
              เลือกรถ ระบุวันเวลา แล้วยืนยันด้วยการโอนค่าจอง ใช้เวลาไม่ถึง 5 นาที พนักงานนำรถไปส่งตามจุดที่นัดไว้
            </p>

            {/* ป้ายจุดขายสามอัน */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5">
              {["ประกันชั้น 1 ทุกคัน", "รับส่งถึงที่", "จองผ่าน LINE ได้"].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-2 text-sm text-white/90"
                >
                  <span className="w-5 h-5 rounded-full bg-gold-fixed/90 text-blue-900 grid place-items-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cars"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gold-fixed hover:bg-amber-200 text-ink font-bold shadow-lg shadow-black/30 transition-colors"
              >
                ดูรถทั้งหมด
                <Arrow />
              </Link>
              <Link
                href="/how-to-book"
                className="px-7 py-3.5 rounded-full border border-white/35 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                วิธีการจอง
              </Link>
            </div>

            {/* รูปรถบนมือถือ — จอคอมไม่แสดงเพราะเป็นพื้นหลังอยู่แล้ว */}
            <Image
              src="/hero-civic-rs-mobile.webp"
              alt=""
              width={1200}
              height={597}
              priority
              data-no-dim
              sizes="100vw"
              className="lg:hidden mt-9 w-full h-auto rounded-2xl"
            />

            {/* ตัวเลขสรุป — ทุกตัวมาจากข้อมูลจริง */}
            <div className="mt-9 lg:mt-11 pt-7 border-t border-amber-300/20 flex flex-wrap items-center gap-x-9 gap-y-5">
              <Stat value={String(totalCars)} label="คันพร้อมให้เช่า" />
              <Sep />
              {minPrice !== null && (
                <>
                  <Stat
                    value={`${minPrice.toLocaleString()} ฿`}
                    label="เริ่มต้นต่อวัน"
                  />
                  <Sep />
                </>
              )}
              <Stat
                value={`${settings.minLeadHours} ชม.`}
                label="จองล่วงหน้าขั้นต่ำ"
              />
              <Sep />
              <Stat
                value={`${settings.bookingFee.toLocaleString()} ฿`}
                label="ค่าจองกันวัน"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ 2. ยี่ห้อรถ ============ */}
      {brandRows.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <SectionHead
            eyebrow="เลือกตามยี่ห้อ"
            title="ยี่ห้อรถที่ให้เช่า"
            action={{ href: "/cars", label: "ดูทั้งหมด" }}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {brandRows.map((b: { brand: string; _count: { _all: number } }) => (
              <Link
                key={b.brand}
                href={`/cars?brand=${encodeURIComponent(b.brand)}`}
                className="group bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center gap-3 hover:border-amber-500 hover:shadow-card transition-all"
              >
                <span className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 grid place-items-center transition-colors group-hover:bg-amber-100">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                    {ICON_CAR}
                  </svg>
                </span>
                <span className="text-center">
                  <span className="block text-sm font-semibold text-slate-900">
                    {b.brand}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {b._count._all} คัน
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ 3. รถแนะนำ ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <SectionHead
          eyebrow="รถแนะนำ"
          title="ว่างพร้อมให้เช่าตอนนี้"
          desc={`ราคารวมประกันชั้น 1 · ${settings.serviceNote}`}
          action={{ href: "/cars", label: "ดูรถทั้งหมด" }}
        />

        {cars.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car: CarCardData) => (
              <CarCard
                key={car.id}
                car={car}
                availability={availabilityFor(car.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
            <p className="text-slate-500">ยังไม่มีรถว่างให้จองในขณะนี้</p>
            <p className="text-sm text-slate-400 mt-1">กรุณากลับมาใหม่อีกครั้ง</p>
          </div>
        )}
      </section>

      {/* ============ 4. ทำไมต้องเรา ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <div className="relative rounded-3xl overflow-hidden bg-panel p-8 sm:p-12">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(55% 70% at 88% 15%, rgba(217,194,155,0.55) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <p className="text-xs font-semibold tracking-widest uppercase text-gold-fixed mb-2">
              ทำไมต้องเรา
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-9">
              บริการที่วางใจได้
            </h2>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {WHY.map((w) => (
                <div key={w.title}>
                  <span className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 text-gold-fixed grid place-items-center mb-4">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
                      {w.icon}
                    </svg>
                  </span>
                  <h3 className="font-semibold text-white mb-1.5">{w.title}</h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {w.title === "ประกันชั้น 1 ทุกคัน"
                      ? `${w.desc} (${settings.securityDeposit.toLocaleString()} บาท)`
                      : w.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 5. จองง่ายใน 4 ขั้นตอน ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <SectionHead
          eyebrow="ขั้นตอน"
          title="จองง่ายใน 4 ขั้นตอน"
          action={{ href: "/how-to-book", label: "วิธีการจอง" }}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-card transition-shadow"
            >
              <span className="w-9 h-9 rounded-lg bg-gold-fixed text-ink grid place-items-center font-bold text-sm mb-4">
                {i + 1}
              </span>
              <h3 className="font-semibold text-slate-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {i === 2
                  ? `${s.desc} (${settings.bookingFee.toLocaleString()} บาท)`
                  : s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ 6. แถบปิดหน้า ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative rounded-3xl overflow-hidden bg-panel p-8 sm:p-11">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(50% 80% at 12% 20%, rgba(217,194,155,0.5) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-7">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                พร้อมออกเดินทางแล้วหรือยัง
              </h2>
              <p className="text-white/80 mt-2.5 max-w-xl">เพิ่มเพื่อนใน LINE แล้วจองในแชทได้เลย ตอบกลับเร็วที่สุด</p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <a
                href={`https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_ID)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3.5 rounded-full bg-gold-fixed hover:bg-amber-200 text-ink font-bold transition-colors"
              >
                เพิ่มเพื่อน LINE
              </a>
              <Link
                href="/cars"
                className="px-7 py-3.5 rounded-full bg-paper text-ink font-semibold hover:bg-slate-100 transition-colors"
              >
                ดูรถทั้งหมด
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

/* ---------------- ชิ้นส่วนที่ใช้ซ้ำในหน้านี้ ---------------- */

/** หัวข้อของแต่ละส่วน — คำกำกับตัวเล็กสีทอง หัวข้อใหญ่ และปุ่มลิงก์ขวา */
function SectionHead({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-7">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-amber-700 mb-2">
          {eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h2>
        {desc && <p className="text-sm text-slate-600 mt-2 max-w-2xl">{desc}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 shrink-0 px-5 py-3 rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
        {value}
      </p>
      <p className="text-sm text-white/70 mt-0.5">{label}</p>
    </div>
  );
}

function Sep() {
  return <span className="hidden sm:block w-px h-10 bg-gold-fixed/25" />;
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path
        d="M5 12h14m0 0l-6-6m6 6l-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------------- ไอคอน ---------------- */

const ICON_CAR = (
  <>
    <path
      d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="16" r="1.3" fill="currentColor" />
    <circle cx="16" cy="16" r="1.3" fill="currentColor" />
  </>
);

const ICON_SHIELD = (
  <path
    d="M12 3l7.5 3v6c0 4.6-3.2 8.4-7.5 9.5C7.7 20.4 4.5 16.6 4.5 12V6z M9 12l2 2 4-4"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const ICON_PIN = (
  <>
    <path
      d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.7" />
  </>
);

const ICON_CHAT = (
  <>
    <path
      d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 014 13.5z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 10h7M8.5 13h4"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </>
);

const ICON_TAG = (
  <>
    <path
      d="M12 3v18M8 7.5A2.5 2.5 0 0110.5 5h3a2.5 2.5 0 010 5h-3a2.5 2.5 0 000 5h3a2.5 2.5 0 002.5-2.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

type CarCardData = {
  id: string;
  name: string;
  brand: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
  licensePlate: string;
};
