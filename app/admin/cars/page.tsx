export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function addCarAction(formData: FormData) {
  "use server";
  await prisma.car.create({
    data: {
      name: formData.get("name") as string,
      brand: formData.get("brand") as string,
      licensePlate: formData.get("licensePlate") as string,
      pricePerDay: Number(formData.get("pricePerDay")),
      source: (formData.get("source") as "OWN" | "PARTNER") ?? "OWN",
    },
  });
  revalidatePath("/admin/cars");
}

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
  const cars = await prisma.car.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-white">จัดการรถ</h1>

      <form
        action={addCarAction}
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8 grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <input name="name" required placeholder="ชื่อรุ่นรถ" className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
        <input name="brand" required placeholder="ยี่ห้อ" className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
        <input name="licensePlate" required placeholder="ทะเบียน" className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
        <input name="pricePerDay" required type="number" placeholder="ราคา/วัน (บาท)" className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white" />
        <select name="source" className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white">
          <option value="OWN">รถของเรา</option>
          <option value="PARTNER">รถยืมพาร์ทเนอร์</option>
        </select>
        <button type="submit" className="col-span-2 md:col-span-5 mt-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md py-2">
          + เพิ่มรถ
        </button>
      </form>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-800">
              <th className="px-4 py-3">รถ</th>
              <th className="px-4 py-3">ทะเบียน</th>
              <th className="px-4 py-3">ราคา/วัน</th>
              <th className="px-4 py-3">แหล่งที่มา</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => (
              <tr key={car.id} className="border-b border-neutral-800/60 text-white">
                <td className="px-4 py-3">{car.brand} {car.name}</td>
                <td className="px-4 py-3">{car.licensePlate}</td>
                <td className="px-4 py-3">{car.pricePerDay.toLocaleString()} บาท</td>
                <td className="px-4 py-3">{car.source === "OWN" ? "รถของเรา" : "พาร์ทเนอร์"}</td>
                <td className="px-4 py-3">
                  <span className={car.status === "AVAILABLE" ? "text-emerald-400" : "text-neutral-500"}>
                    {car.status === "AVAILABLE" ? "ว่าง" : "ปิดใช้งาน"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleStatusAction}>
                    <input type="hidden" name="id" value={car.id} />
                    <input type="hidden" name="currentStatus" value={car.status} />
                    <button className="text-xs text-blue-400 hover:underline">
                      {car.status === "AVAILABLE" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {cars.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  ยังไม่มีรถในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
