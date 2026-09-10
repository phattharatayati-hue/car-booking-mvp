export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import AddCarForm from "@/components/AddCarForm";
import { BTN } from "@/lib/ui";

type CarRow = {
  id: string;
  name: string;
  brand: string;
  licensePlate: string;
  pricePerDay: number;
  photoUrl: string | null;
  source: string;
  status: string;
};

async function toggleStatusAction(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const currentStatus = formData.get("currentStatus") as string;
  const next = currentStatus === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";

  const car = await prisma.car.update({
    where: { id },
    data: { status: next },
  });

  await audit({
    action: "car.status_toggle",
    summary: `เปลี่ยนสถานะรถ ${car.brand} ${car.name} (${car.licensePlate}) เป็น ${
      next === "AVAILABLE" ? "พร้อมให้เช่า" : "ปิดให้เช่า"
    }`,
    entity: "car",
    entityId: id,
  });

  revalidatePath("/admin/cars");
}

const CAR_FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "AVAILABLE", label: "เปิดให้เช่า" },
  { key: "UNAVAILABLE", label: "ปิดใช้งาน" },
] as const;

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireStaff();

  const { status, q } = await searchParams;
  const active = status === "AVAILABLE" || status === "UNAVAILABLE" ? status : null;
  const term = (q ?? "").trim();

  const cars = await prisma.car.findMany({
    where: {
      ...(active ? { status: active } : {}),
      ...(term
        ? {
            OR: [
              { brand: { contains: term, mode: "insensitive" as const } },
              { name: { contains: term, mode: "insensitive" as const } },
              { licensePlate: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    /* เรียงคันที่เปิดให้เช่าขึ้นก่อน แล้วค่อยเรียงตามยี่ห้อ-รุ่น
       เดิมเรียงตามวันที่สร้าง ทำให้คันที่ปิดใช้งานแทรกปนกับคันที่ใช้งานอยู่ */
    orderBy: [{ status: "asc" }, { brand: "asc" }, { name: "asc" }],
  });

  const [totalCount, activeCount] = await Promise.all([
    prisma.car.count(),
    prisma.car.count({ where: { status: "AVAILABLE" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการรถ</h1>
          <p className="text-slate-500 text-sm mt-1">
            มีรถในระบบ {totalCount} คัน · เปิดให้เช่า {activeCount} คัน
            {totalCount > activeCount && (
              <span className="text-slate-400">
                {" "}
                · ปิดใช้งาน {totalCount - activeCount} คัน
              </span>
            )}
          </p>
        </div>
        <AddCarForm />
      </div>

      {/* ค้นหา + กรอง — 15 คันขึ้นไปแล้วไถหาเองไม่ไหว */}
      <form method="get" className="flex flex-wrap gap-2 mb-4">
        {active && <input type="hidden" name="status" value={active} />}
        <label htmlFor="car-search" className="sr-only">
          ค้นหารถ
        </label>
        <input
          id="car-search"
          name="q"
          defaultValue={term}
          placeholder="ค้นหา ยี่ห้อ / รุ่น / ทะเบียน"
          className="flex-1 min-w-[200px] max-w-md rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        <button type="submit" className={BTN.primary}>
          ค้นหา
        </button>
        {term && (
          <Link
            href={active ? `/admin/cars?status=${active}` : "/admin/cars"}
            className={BTN.ghost}
          >
            ล้าง
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {CAR_FILTERS.map((f) => {
          const isActive = (status ?? "all") === f.key;
          return (
            <Link
              key={f.key}
              href={`/admin/cars?${new URLSearchParams({
                ...(f.key === "all" ? {} : { status: f.key }),
                ...(term ? { q: term } : {}),
              }).toString()}`}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 font-medium">รถ</th>
                <th className="px-5 py-3.5 font-medium">ทะเบียน</th>
                <th className="px-5 py-3.5 font-medium">ราคา/วัน</th>
                <th className="px-5 py-3.5 font-medium">แหล่งที่มา</th>
                <th className="px-5 py-3.5 font-medium">สถานะ</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cars.map((car: CarRow) => (
                <tr key={car.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        {car.photoUrl ? (
                          <Image
                            src={car.photoUrl}
                            alt={car.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-slate-300">
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                              <path
                                d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{car.name}</p>
                        <p className="text-xs text-slate-500">{car.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{car.licensePlate}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {car.pricePerDay.toLocaleString()} ฿
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {car.source === "OWN" ? "รถของเรา" : "พาร์ทเนอร์"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                        car.status === "AVAILABLE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          car.status === "AVAILABLE" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {car.status === "AVAILABLE" ? "ว่าง" : "ปิดใช้งาน"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/cars/${car.id}`}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        แก้ไข
                      </Link>
                      <form action={toggleStatusAction}>
                        <input type="hidden" name="id" value={car.id} />
                        <input type="hidden" name="currentStatus" value={car.status} />
                        <button className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">
                          {car.status === "AVAILABLE" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {cars.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    {term || active
                      ? "ไม่พบรถที่ตรงกับที่ค้นหา"
                      : "ยังไม่มีรถในระบบ — กด “เพิ่มรถ” เพื่อเริ่มต้น"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
