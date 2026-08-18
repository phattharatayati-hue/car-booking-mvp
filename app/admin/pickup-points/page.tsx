export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type PointRow = {
  id: string;
  name: string;
  fee: number;
  isActive: boolean;
  sortOrder: number;
};

async function addPointAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const fee = Number(formData.get("fee") ?? 0);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!name) redirect("/admin/pickup-points?error=name");
  if (!Number.isInteger(fee) || fee < 0) redirect("/admin/pickup-points?error=fee");

  await prisma.pickupPoint.create({
    data: { name, fee, sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0 },
  });

  revalidatePath("/admin/pickup-points");
  redirect("/admin/pickup-points?ok=added");
}

async function togglePointAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";

  await prisma.pickupPoint.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/admin/pickup-points");
  redirect("/admin/pickup-points?ok=updated");
}

async function deletePointAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  await prisma.pickupPoint.delete({ where: { id } });

  revalidatePath("/admin/pickup-points");
  redirect("/admin/pickup-points?ok=deleted");
}

const ERRORS: Record<string, string> = {
  name: "กรุณากรอกชื่อจุดรับ-ส่ง",
  fee: "ค่าบริการต้องเป็นตัวเลขจำนวนเต็มไม่ติดลบ",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function PickupPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const points: PointRow[] = await prisma.pickupPoint.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">จุดรับ-ส่งรถ</h1>
        <p className="text-slate-500 text-sm mt-1">
          จุดที่เปิดใช้งานจะขึ้นให้ลูกค้าเลือกตอนจอง ทั้งบนเว็บและใน LINE
          ถ้าลูกค้าต้องการจุดอื่น จะมีตัวเลือก “อื่นๆ” ให้แอดมินติดต่อกลับเสมอ
        </p>
      </div>

      {ok && (
        <div className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          บันทึกเรียบร้อยแล้ว
        </div>
      )}
      {error && ERRORS[error] && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {ERRORS[error]}
        </div>
      )}

      <form
        action={addPointAction}
        className="bg-white rounded-2xl border border-slate-200 p-6 mb-6"
      >
        <h2 className="font-semibold text-slate-900 mb-4">เพิ่มจุดรับ-ส่ง</h2>
        <div className="grid sm:grid-cols-[1fr_140px_120px] gap-4">
          <div>
            <label className={labelClass} htmlFor="name">ชื่อจุด</label>
            <input
              id="name"
              name="name"
              required
              placeholder="เช่น สนามบินเชียงใหม่"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="fee">ค่าบริการ (บาท)</label>
            <input
              id="fee"
              name="fee"
              type="number"
              min="0"
              defaultValue={0}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="sortOrder">ลำดับ</label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={0}
              className={inputClass}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          ใส่ค่าบริการเป็น 0 ถ้าเป็นจุดที่รับ-ส่งฟรี · เลขลำดับน้อยจะขึ้นก่อน
        </p>
        <button
          type="submit"
          className="mt-5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
        >
          เพิ่มจุดรับ-ส่ง
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {points.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">
            ยังไม่มีจุดรับ-ส่ง — เพิ่มด้านบนได้เลย
            <br />
            ระหว่างนี้ลูกค้าจะไม่เห็นช่องเลือกจุดรับ-ส่งตอนจอง
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {points.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      p.isActive ? "text-slate-900" : "text-slate-400 line-through"
                    }`}
                  >
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.fee > 0 ? `ค่าบริการ ${p.fee.toLocaleString()} บาท` : "รับ-ส่งฟรี"}
                    {" · "}ลำดับ {p.sortOrder}
                  </p>
                </div>

                <form action={togglePointAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="isActive" value={String(p.isActive)} />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {p.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </button>
                </form>

                <form action={deletePointAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                  >
                    ลบ
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
