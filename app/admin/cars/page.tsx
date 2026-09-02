export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import AddCarForm from "@/components/AddCarForm";

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
  await prisma.car.update({
    where: { id },
    data: { status: currentStatus === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE" },
  });
  revalidatePath("/admin/cars");
}

export default async function AdminCarsPage() {
  await requireStaff();

  const cars = await prisma.car.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการรถ</h1>
          <p className="text-slate-500 text-sm mt-1">
            มีรถในระบบ {cars.length} คัน
          </p>
        </div>
        <AddCarForm />
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
                    ยังไม่มีรถในระบบ — กด “เพิ่มรถ” เพื่อเริ่มต้น
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
