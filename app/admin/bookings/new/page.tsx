export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { createBooking } from "@/lib/create-booking";
import { getPickupPoints } from "@/lib/pickup-points-server";
import { getSettings } from "@/lib/settings";
import { BTN, NOTICE } from "@/lib/ui";
import AdminBookingForm from "@/components/AdminBookingForm";

/**
 * แอดมินกรอกใบจองเอง — สำหรับลูกค้าที่โทรมา ทักเฟซ หรือทักไลน์คุยกับแอดมินตรง ๆ
 *
 * ต่างจากใบที่ลูกค้าจองเองสองเรื่อง
 *  1. ไม่ส่งแจ้งเตือน LINE หาลูกค้าเลย (แอดมินคุยกับเขาอยู่แล้ว)
 *  2. ข้ามกฎที่มีไว้กันลูกค้าได้ — จองล่วงหน้า 24 ชม. จองขั้นต่ำ ช่วงปิดรับจอง
 *
 * สิ่งที่ไม่ต่าง: การจองทับคิว (ห้ามเสมอ) การลงปฏิทิน และการมอบหมายคนส่ง-รับรถ
 */
async function createAction(formData: FormData) {
  "use server";
  const me = await requireStaff();

  const carId = String(formData.get("carId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "09:00");
  const pickupPlace = String(formData.get("pickupPlace") ?? "") || null;
  const returnPlace = String(formData.get("returnPlace") ?? "") || null;
  const adminNote = String(formData.get("adminNote") ?? "");
  const priceRaw = String(formData.get("priceOverride") ?? "").trim();
  const markConfirmed = formData.get("markConfirmed") != null;

  if (!carId || !fullName || !phone || !startDate || !endDate) {
    redirect("/admin/bookings/new?error=missing");
  }

  const result = await createBooking({
    carId,
    startDate,
    endDate,
    startTime,
    endTime,
    fullName,
    phone,
    pickupPlace,
    returnPlace,
    adminNote,
    priceOverride: priceRaw === "" ? null : Number(priceRaw),
    markConfirmed,
    silent: true,
    skipCustomerRules: true,
    createdByAdminUserId: me.id,
  });

  /* เรียก redirect ตรง ๆ ไม่ผ่านตัวช่วย เพื่อให้ TypeScript รู้ว่าโค้ดหลังจากนี้
     เป็นเคส ok เท่านั้น (redirect มีชนิดคืนค่าเป็น never) */
  if (!result.ok) {
    redirect(`/admin/bookings/new?error=create&msg=${encodeURIComponent(result.error)}`);
  }

  /* เก็บค่าจองมาแล้ว = บันทึกสลิปให้เป็นยืนยันแล้ว ไม่ต้องให้แอดมินไปกดซ้ำอีกหน้า
     ไม่มีรูปสลิปเพราะรับเงินนอกระบบ — เขียนที่มาไว้ในช่อง note ของสลิปแทน */
  if (markConfirmed) {
    const settings = await getSettings();
    await prisma.deposit.create({
      data: {
        bookingId: result.bookingId,
        amount: settings.bookingFee,
        slipImageUrl: "",
        status: "CONFIRMED",
        confirmedBy: me.email,
        confirmedAt: new Date(),
      },
    });
  }

  await audit({
    action: "booking.admin_create",
    summary: `แอดมินสร้างใบจองเอง ${fullName} (${phone})`,
    detail: `${startDate} ${startTime} ถึง ${endDate} ${endTime}${
      markConfirmed ? " · เก็บค่าจองแล้ว" : " · ยังไม่เก็บค่าจอง"
    }${adminNote ? ` · ${adminNote}` : ""}`,
    entity: "booking",
    entityId: result.bookingId,
  });

  redirect(`/admin/bookings?q=${result.bookingId.slice(0, 8)}&ok=created`);
}

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  await requireStaff();
  const { error, msg } = await searchParams;

  const [cars, points, settings] = await Promise.all([
    prisma.car.findMany({
      where: { status: "AVAILABLE" },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: {
        id: true,
        brand: true,
        name: true,
        licensePlate: true,
        pricePerDay: true,
      },
    }),
    getPickupPoints(),
    getSettings(),
  ]);

  return (
    <div className="max-w-3xl">
      <nav className="text-sm text-slate-500 mb-4">
        <Link href="/admin/bookings" className="hover:text-blue-700">
          รายการจอง
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">สร้างใบจองเอง</span>
      </nav>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">สร้างใบจองเอง</h1>
        <p className="text-slate-500 text-sm mt-1">
          สำหรับลูกค้าที่โทรมาหรือทักแชทมาคุยกับแอดมิน · ใบนี้จะไม่ส่งแจ้งเตือน LINE
          หาลูกค้าเลย แต่ยังลงปฏิทินและมอบหมายคนส่ง-รับรถได้ตามปกติ
        </p>
      </div>

      {error && (
        <div className={`mb-5 text-sm border px-4 py-3 rounded-xl ${NOTICE.error}`}>
          {error === "missing"
            ? "กรอกข้อมูลไม่ครบ — ต้องมีรถ ชื่อ เบอร์ และวันรับ-คืน"
            : msg || "สร้างใบจองไม่สำเร็จ"}
        </div>
      )}

      {cars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          ยังไม่มีรถที่เปิดให้เช่า —{" "}
          <Link href="/admin/cars" className="text-blue-700 hover:underline">
            ไปเพิ่มรถก่อน
          </Link>
        </div>
      ) : (
        <AdminBookingForm
          cars={cars}
          points={points.map((p) => ({ name: p.name, fee: p.fee }))}
          bookingFee={settings.bookingFee}
          action={createAction}
        />
      )}

      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        หมายเหตุ: ใบที่สร้างจากหน้านี้ข้ามกฎจองล่วงหน้า จองขั้นต่ำ และช่วงปิดรับจองให้
        แต่ยัง<b>ห้ามจองทับคิวรถคันเดียวกัน</b> ถ้าชนระบบจะไม่ให้บันทึกและบอกว่าชนกับใบไหน
      </p>

      <Link href="/admin/bookings" className={`${BTN.ghost} mt-5`}>
        ← กลับไปรายการจอง
      </Link>
    </div>
  );
}
