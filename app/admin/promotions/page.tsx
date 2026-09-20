export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ActionButton from "@/components/ActionButton";
import { BTN, NOTICE } from "@/lib/ui";
import AdminTabs from "@/components/AdminTabs";
import { SETTINGS_TABS } from "@/components/adminTabSets";
import { formatThaiDateStr, bangkokDateStrOf } from "@/lib/car-rates";

/**
 * ส่วนลดตามช่วงวัน
 *
 * กติกา (ดู lib/promotions.ts): ยึดวันรับรถ · ลดเป็นบาทต่อวัน ·
 * เช่าครบขั้นต่ำแล้วลดทุกวัน · เข้าได้ทีละโปรฯ อันที่ลดมากที่สุด
 */

type PromoRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  minDays: number;
  discountPerDay: number;
  maxDiscount: number | null;
  isActive: boolean;
};

async function addPromotionAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const minDays = Number(formData.get("minDays") ?? 1);
  const discountPerDay = Number(formData.get("discountPerDay") ?? 0);
  const maxRaw = String(formData.get("maxDiscount") ?? "").trim();
  const maxDiscount = maxRaw === "" ? null : Number(maxRaw);

  if (!name) redirect("/admin/promotions?error=name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    redirect("/admin/promotions?error=date");
  }
  if (endDate < startDate) redirect("/admin/promotions?error=range");
  if (!Number.isInteger(minDays) || minDays < 1 || minDays > 60) {
    redirect("/admin/promotions?error=minDays");
  }
  if (!Number.isInteger(discountPerDay) || discountPerDay < 1 || discountPerDay > 100_000) {
    redirect("/admin/promotions?error=amount");
  }
  if (maxDiscount != null && (!Number.isInteger(maxDiscount) || maxDiscount < 1)) {
    redirect("/admin/promotions?error=max");
  }

  const created = await prisma.promotion.create({
    data: {
      name,
      // เก็บเป็นเวลาไทยต้นวัน เทียบกับวันรับรถอย่างเดียว ไม่สนเวลา
      startDate: new Date(`${startDate}T00:00:00+07:00`),
      endDate: new Date(`${endDate}T00:00:00+07:00`),
      minDays,
      discountPerDay,
      maxDiscount,
    },
  });

  await audit({
    action: "master.promotion_add",
    summary: `เพิ่มส่วนลด ${name}`,
    entity: "promotion",
    entityId: created.id,
    detail: `${startDate} ถึง ${endDate} · ขั้นต่ำ ${minDays} วัน · ลดวันละ ${discountPerDay.toLocaleString()} บาท${
      maxDiscount ? ` · เพดาน ${maxDiscount.toLocaleString()} บาท` : ""
    }`,
  });

  revalidatePath("/admin/promotions");
  redirect("/admin/promotions?ok=added");
}

async function togglePromotionAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";

  const updated = await prisma.promotion.update({
    where: { id },
    data: { isActive: !isActive },
  });

  await audit({
    action: "master.promotion_toggle",
    summary: `${updated.isActive ? "เปิด" : "ปิด"}ส่วนลด ${updated.name}`,
    entity: "promotion",
    entityId: id,
  });

  revalidatePath("/admin/promotions");
  redirect("/admin/promotions?ok=updated");
}

async function deletePromotionAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const target = await prisma.promotion.findUnique({ where: { id } });
  await prisma.promotion.delete({ where: { id } });

  await audit({
    action: "master.promotion_delete",
    summary: `ลบส่วนลด ${target?.name ?? id}`,
    entity: "promotion",
    entityId: id,
  });

  revalidatePath("/admin/promotions");
  redirect("/admin/promotions?ok=deleted");
}

const OK_TEXT: Record<string, string> = {
  added: "เพิ่มส่วนลดเรียบร้อยแล้ว",
  updated: "อัปเดตส่วนลดเรียบร้อยแล้ว",
  deleted: "ลบส่วนลดเรียบร้อยแล้ว",
};

const ERRORS: Record<string, string> = {
  name: "กรุณากรอกชื่อส่วนลด",
  date: "รูปแบบวันที่ไม่ถูกต้อง",
  range: "วันสุดท้ายต้องไม่ก่อนวันแรก",
  minDays: "ขั้นต่ำต้องเป็นจำนวนเต็ม 1-60 วัน",
  amount: "ส่วนลดต่อวันต้องเป็นจำนวนเต็มมากกว่า 0",
  max: "เพดานส่วนลดต้องเป็นจำนวนเต็มมากกว่า 0 หรือเว้นว่าง",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireStaff();
  const { ok, error } = await searchParams;

  const promos: PromoRow[] = await prisma.promotion.findMany({
    orderBy: [{ startDate: "asc" }],
  });

  const today = bangkokDateStrOf(new Date());

  return (
    <div className="max-w-4xl">
      <AdminTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ส่วนลด</h1>
        <p className="text-slate-500 text-sm mt-1">
          ระบบดูจาก <b>วันรับรถ</b> ว่าอยู่ในช่วงโปรฯ ไหม ถ้าเช่าครบขั้นต่ำจะลดทุกวันที่เช่า
          ลูกค้าเห็นส่วนลดทันทีตอนเลือกวัน · ถ้าเข้าหลายโปรฯ ระบบเลือกอันที่ลดมากที่สุดให้อัตโนมัติ
          · ส่วนลดหักจากค่าเช่าเท่านั้น ไม่ลดค่านอกเวลาและค่าคืนช้า
        </p>
      </div>

      {ok && OK_TEXT[ok] && (
        <div role="alert" className={`mb-5 text-sm px-4 py-3 rounded-xl border ${NOTICE.ok}`}>
          {OK_TEXT[ok]}
        </div>
      )}
      {error && ERRORS[error] && (
        <div role="alert" className={`mb-5 text-sm px-4 py-3 rounded-xl border ${NOTICE.error}`}>
          {ERRORS[error]}
        </div>
      )}

      <form
        action={addPromotionAction}
        className="mb-8 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6"
      >
        <h2 className="font-semibold text-slate-900 mb-4">เพิ่มส่วนลดใหม่</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="name">ชื่อส่วนลด (ลูกค้าเห็นในบิล)</label>
            <input id="name" name="name" required placeholder="เช่น โปรฯ โลว์ซีซัน" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="startDate">วันแรกที่รับรถได้</label>
            <input id="startDate" name="startDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="endDate">วันสุดท้าย (นับรวมวันนี้)</label>
            <input id="endDate" name="endDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="minDays">เช่าขั้นต่ำ (วัน)</label>
            <input
              id="minDays"
              name="minDays"
              type="number"
              min="1"
              max="60"
              defaultValue={1}
              required
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1.5">ใส่ 1 = ไม่บังคับขั้นต่ำ</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="discountPerDay">ลดวันละ (บาท)</label>
            <input
              id="discountPerDay"
              name="discountPerDay"
              type="number"
              min="1"
              required
              placeholder="เช่น 100"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="maxDiscount">เพดานส่วนลดต่อการจอง (บาท)</label>
            <input
              id="maxDiscount"
              name="maxDiscount"
              type="number"
              min="1"
              placeholder="เว้นว่าง = ไม่จำกัด"
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-5">
          <ActionButton className={BTN.primary} pendingText="กำลังบันทึก…">
            เพิ่มส่วนลด
          </ActionButton>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {promos.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">ยังไม่มีส่วนลด</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {promos.map((p) => {
              const from = bangkokDateStrOf(p.startDate);
              const to = bangkokDateStrOf(p.endDate);
              const ended = to < today;
              const future = from > today;
              return (
                <li key={p.id} className="p-4 sm:p-5 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {p.name}{" "}
                      {!p.isActive ? (
                        <span className="ml-1 text-xs font-normal text-slate-400">(ปิดใช้งาน)</span>
                      ) : ended ? (
                        <span className="ml-1 text-xs font-normal text-slate-400">(หมดช่วงแล้ว)</span>
                      ) : future ? (
                        <span className="ml-1 text-xs font-normal text-amber-600">(ยังไม่เริ่ม)</span>
                      ) : (
                        <span className="ml-1 text-xs font-normal text-emerald-600">(ใช้อยู่ตอนนี้)</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      รับรถ {formatThaiDateStr(from)} – {formatThaiDateStr(to)} · เช่าขั้นต่ำ{" "}
                      {p.minDays} วัน · ลดวันละ {p.discountPerDay.toLocaleString()} บาท
                      {p.maxDiscount ? ` · ไม่เกิน ${p.maxDiscount.toLocaleString()} บาท` : ""}
                    </p>
                  </div>
                  <form action={togglePromotionAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="isActive" value={String(p.isActive)} />
                    <ActionButton className={BTN.smGhost} pendingText="กำลังบันทึก…">
                      {p.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </ActionButton>
                  </form>
                  <form action={deletePromotionAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <ActionButton
                      className={BTN.smDanger}
                      pendingText="กำลังลบ…"
                      confirm={`ลบส่วนลด "${p.name}"? ใบจองเก่าที่ได้ส่วนลดไปแล้วไม่เปลี่ยนแปลง`}
                    >
                      ลบ
                    </ActionButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
