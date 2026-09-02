export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AddPartnerForm from "@/components/AddPartnerForm";

type PartnerRow = {
  id: string;
  name: string;
  phone: string;
  lineId: string | null;
  note: string | null;
  isActive: boolean;
  cars: {
    id: string;
    brand: string;
    name: string;
    licensePlate: string;
    pricePerDay: number;
    costPerDay: number | null;
    status: string;
  }[];
};

async function addPartnerAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/[\s-]/g, "");
  const lineId = String(formData.get("lineId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!name || !phone) redirect("/admin/partners?error=invalid");

  const created = await prisma.partner.create({ data: { name, phone, lineId, note } });

  await audit({
    action: "master.partner_add",
    summary: `เพิ่มพาร์ตเนอร์ ${name} (${phone})`,
    entity: "partner",
    entityId: created.id,
  });

  revalidatePath("/admin/partners");
  redirect("/admin/partners?ok=added");
}

async function togglePartnerAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";

  const updated = await prisma.partner.update({
    where: { id },
    data: { isActive: !isActive },
  });

  await audit({
    action: "master.partner_toggle",
    summary: `${updated.isActive ? "เปิด" : "ปิด"}การใช้งานพาร์ตเนอร์ ${updated.name}`,
    entity: "partner",
    entityId: id,
  });

  revalidatePath("/admin/partners");
  redirect("/admin/partners?ok=updated");
}

async function deletePartnerAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");

  const carCount = await prisma.car.count({ where: { partnerId: id } });
  if (carCount > 0) redirect("/admin/partners?error=hascars");

  const target = await prisma.partner.findUnique({ where: { id } });
  await prisma.partner.delete({ where: { id } });

  await audit({
    action: "master.partner_delete",
    summary: `ลบพาร์ตเนอร์ ${target ? `${target.name} (${target.phone})` : id}`,
    entity: "partner",
    entityId: id,
  });

  revalidatePath("/admin/partners");
  redirect("/admin/partners?ok=deleted");
}

const MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  added: { text: "เพิ่มเจ้าของรถเรียบร้อยแล้ว", tone: "ok" },
  updated: { text: "อัปเดตเรียบร้อยแล้ว", tone: "ok" },
  deleted: { text: "ลบเรียบร้อยแล้ว", tone: "ok" },
  invalid: { text: "กรุณากรอกชื่อและเบอร์โทร", tone: "error" },
  hascars: { text: "ลบไม่ได้ เพราะยังมีรถผูกอยู่ — ย้ายรถออกก่อน", tone: "error" },
};

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireStaff();

  const { ok, error } = await searchParams;

  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    include: { cars: { orderBy: { createdAt: "desc" } } },
  });

  const flash = MESSAGES[ok ?? ""] ?? MESSAGES[error ?? ""];
  const totalCars = partners.reduce(
    (n: number, p: PartnerRow) => n + p.cars.length,
    0
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">คลังรถพาร์ทเนอร์</h1>
          <p className="text-slate-500 text-sm mt-1">
            เจ้าของรถ {partners.length} ราย · รถในคลัง {totalCars} คัน
          </p>
        </div>
        <AddPartnerForm action={addPartnerAction} />
      </div>

      {flash && (
        <div
          className={`mb-6 text-sm px-4 py-3 rounded-xl border ${
            flash.tone === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-violet-900 text-sm mb-2">วิธีใช้งาน</h2>
        <ol className="text-sm text-violet-900/90 leading-relaxed list-decimal list-inside space-y-1">
          <li>เพิ่มเจ้าของรถพร้อมเบอร์ติดต่อที่หน้านี้</li>
          <li>ไปหน้า “จัดการรถ” เพิ่มรถ แล้วเลือกเจ้าของรถและใส่ราคาทุน</li>
          <li>ลูกค้าจะเห็นรถบนเว็บ แต่ปุ่มเป็น “ขอจอง” แทน “จองรถ”</li>
          <li>เมื่อมีคำขอเข้ามา ติดต่อเจ้าของรถแล้วกดอนุมัติ/ปฏิเสธในหน้ารายการจอง</li>
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        {partners.map((p: PartnerRow) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-semibold text-slate-900">{p.name}</h2>
                  {!p.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      ปิดใช้งาน
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  <a href={`tel:${p.phone}`} className="hover:text-blue-700">
                    {p.phone}
                  </a>
                  {p.lineId && <span className="text-slate-400"> · LINE {p.lineId}</span>}
                </p>
                {p.note && <p className="text-sm text-slate-500 mt-1">{p.note}</p>}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <form action={togglePartnerAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="isActive" value={String(p.isActive)} />
                  <button className="text-sm font-medium text-blue-700 hover:underline">
                    {p.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </button>
                </form>
                {p.cars.length === 0 && (
                  <form action={deletePartnerAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-sm font-medium text-slate-400 hover:text-red-600">
                      ลบ
                    </button>
                  </form>
                )}
              </div>
            </div>

            {p.cars.length > 0 ? (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-3">
                  รถในคลัง {p.cars.length} คัน
                </p>
                <div className="flex flex-col gap-2">
                  {p.cars.map((car) => {
                    const margin =
                      car.costPerDay != null ? car.pricePerDay - car.costPerDay : null;
                    return (
                      <Link
                        key={car.id}
                        href={`/admin/cars/${car.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm">
                            {car.brand} {car.name}
                          </p>
                          <p className="text-xs text-slate-500">{car.licensePlate}</p>
                        </div>
                        <div className="text-right text-sm shrink-0">
                          <p className="text-slate-900">
                            ขาย {car.pricePerDay.toLocaleString()} ฿
                            {car.costPerDay != null && (
                              <span className="text-slate-500">
                                {" "}
                                · ทุน {car.costPerDay.toLocaleString()} ฿
                              </span>
                            )}
                          </p>
                          {margin != null && (
                            <p
                              className={`text-xs font-medium ${
                                margin > 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              กำไร {margin.toLocaleString()} ฿/วัน
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-5 pt-5 border-t border-slate-100 text-sm text-slate-500">
                ยังไม่มีรถ — เพิ่มรถได้ที่หน้า “จัดการรถ” แล้วเลือกเจ้าของรถเป็น {p.name}
              </p>
            )}
          </div>
        ))}

        {partners.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
            <p className="text-slate-500">ยังไม่มีเจ้าของรถในระบบ</p>
            <p className="text-sm text-slate-400 mt-1">
              กด “เพิ่มเจ้าของรถ” เพื่อเริ่มต้น
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
