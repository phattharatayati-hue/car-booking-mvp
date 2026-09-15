export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import FeeIcon from "@/components/FeeIcon";
import ActionButton from "@/components/ActionButton";
import { CONFIRM } from "@/lib/ui";
import { getAllFeeItems } from "@/lib/fees-server";
import { DEFAULT_FEE_ITEMS, FEE_ICON_CHOICES, isFeeIconKey } from "@/lib/fees";
import AdminTabs from "@/components/AdminTabs";
import { SETTINGS_TABS } from "@/components/adminTabSets";

async function saveFeeAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const highlight = formData.get("highlight") === "on";
  const isActive = formData.get("isActive") === "on";

  if (!title || title.length > 60) redirect("/admin/fees?error=title");
  if (!amount || amount.length > 60) redirect("/admin/fees?error=amount");
  if (noteRaw.length > 200) redirect("/admin/fees?error=note");
  if (!isFeeIconKey(icon)) redirect("/admin/fees?error=icon");

  const sortOrder = Number(sortRaw);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    redirect("/admin/fees?error=sort");
  }

  const data = {
    icon,
    title,
    amount,
    note: noteRaw || null,
    highlight,
    isActive,
    sortOrder,
  };

  const saved = id
    ? await prisma.feeItem.update({ where: { id }, data })
    : await prisma.feeItem.create({ data });

  await audit({
    action: "master.fee_save",
    summary: `${id ? "แก้ไข" : "เพิ่ม"}ค่าปรับ "${title}"`,
    entity: "feeItem",
    entityId: saved.id,
    detail: `${amount}${highlight ? " · แสดงในสรุปย่อ" : ""}${
      isActive ? "" : " · ปิดใช้งาน"
    }`,
  });

  revalidatePath("/admin/fees");
  revalidatePath("/fees");
  revalidatePath("/how-to-book");
  redirect(`/admin/fees?ok=${id ? "saved" : "added"}`);
}

async function deleteFeeAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) {
    const target = await prisma.feeItem.findUnique({ where: { id } });
    await prisma.feeItem.delete({ where: { id } });

    await audit({
      action: "master.fee_delete",
      summary: `ลบค่าปรับ "${target?.title ?? id}"`,
      entity: "feeItem",
      entityId: id,
      detail: target?.amount,
    });
  }

  revalidatePath("/admin/fees");
  revalidatePath("/fees");
  redirect("/admin/fees?ok=deleted");
}

/**
 * ใส่รายการตั้งต้นให้ครั้งเดียว — ปุ่มนี้โผล่เฉพาะตอนตารางยังว่าง
 * มีไว้ให้ตั้งต้นได้จากหน้าเว็บ ไม่ต้องให้คนที่ไม่ได้เขียนโค้ดไปรันสคริปต์
 */
async function seedFeesAction() {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const count = await prisma.feeItem.count();
  if (count > 0) redirect("/admin/fees?error=notempty");

  await prisma.feeItem.createMany({
    data: DEFAULT_FEE_ITEMS.map((f, i) => ({
      icon: f.icon,
      title: f.title,
      amount: f.amount,
      note: f.note ?? null,
      highlight: Boolean(f.highlight),
      isActive: true,
      sortOrder: (i + 1) * 10,
    })),
  });

  await audit({
    action: "master.fee_seed",
    summary: `ใส่รายการค่าปรับตั้งต้น ${DEFAULT_FEE_ITEMS.length} รายการ`,
    entity: "feeItem",
  });

  revalidatePath("/admin/fees");
  revalidatePath("/fees");
  redirect("/admin/fees?ok=seeded");
}

const ERRORS: Record<string, string> = {
  title: "ต้องใส่ชื่อรายการ และยาวไม่เกิน 60 ตัวอักษร",
  amount: "ต้องใส่ยอด และยาวไม่เกิน 60 ตัวอักษร",
  note: "คำอธิบายยาวเกิน 200 ตัวอักษร",
  icon: "ไอคอนไม่ถูกต้อง — เลือกจากรายการที่มีให้",
  sort: "ลำดับต้องเป็นจำนวนเต็ม 0–999",
  notempty: "มีรายการอยู่แล้ว จึงใส่ค่าตั้งต้นซ้ำไม่ได้",
};

const OKS: Record<string, string> = {
  saved: "บันทึกเรียบร้อยแล้ว",
  added: "เพิ่มรายการแล้ว",
  deleted: "ลบรายการแล้ว",
  seeded: "ใส่รายการตั้งต้นให้แล้ว — แก้ยอดได้ตามต้องการ",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function AdminFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireStaff();
  const { ok, error } = await searchParams;

  const items = await getAllFeeItems();
  const nextSort = items.length === 0 ? 10 : Math.max(...items.map((i) => i.sortOrder)) + 10;

  return (
    <div className="max-w-4xl">
      <AdminTabs tabs={SETTINGS_TABS} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ค่าปรับและค่าบริการเพิ่มเติม</h1>
        <p className="text-slate-500 text-sm mt-1">
          แก้ที่นี่แล้วเปลี่ยนทุกที่ทันที —{" "}
          <Link href="/fees" className="text-blue-700 hover:underline">
            หน้า /fees
          </Link>
          , หน้าคู่มือลูกค้า, สรุปตอนกดจอง และการ์ดค่าบริการในแชท LINE
        </p>
      </div>

      {ok && OKS[ok] && (
        <div className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          {OKS[ok]}
        </div>
      )}
      {error && ERRORS[error] && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {ERRORS[error]}
        </div>
      )}

      <div className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-500 leading-relaxed">
        <b className="text-slate-700">ยอดเป็นข้อความ ไม่ใช่ตัวเลข</b> — ใส่ได้ทั้ง
        “3,000 บาท”, “500 – 1,000 บาท”, “เริ่มต้น 2,000 บาท” หรือ “ไม่คืนเงินทุกกรณี”
        ระบบไม่เอายอดนี้ไปคำนวณอะไร ใช้แสดงให้ลูกค้าอ่านอย่างเดียว
        <br />
        <b className="text-slate-700">แสดงในสรุปย่อ</b> = รายการนั้นจะโผล่ในกล่องเตือนตอนลูกค้ากดจอง
        และในการ์ด LINE ด้วย ควรติ๊กเฉพาะรายการที่เจอบ่อยหรือยอดสูง ไม่งั้นลูกค้าจะอ่านข้าม
        <br />
        <b className="text-slate-700">ลำดับ</b> — น้อยมาก่อน เว้นเลขห่าง ๆ (10, 20, 30)
        จะได้แทรกรายการใหม่ตรงกลางได้โดยไม่ต้องไล่แก้ทุกแถว
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-900 font-semibold">ยังไม่มีรายการในฐานข้อมูล</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            ตอนนี้หน้าเว็บกำลังแสดงรายการตั้งต้นที่ฝังมาในโค้ด {DEFAULT_FEE_ITEMS.length} รายการ
            กดปุ่มด้านล่างเพื่อคัดลอกเข้าฐานข้อมูล แล้วจะแก้ยอดเองได้
          </p>
          <form action={seedFeesAction} className="mt-5">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              ใส่รายการตั้งต้น {DEFAULT_FEE_ITEMS.length} รายการ
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">
              รายการทั้งหมด {items.length} รายการ
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              แต่ละแถวมีปุ่มบันทึกของตัวเอง — แก้หลายแถวต้องกดบันทึกทีละแถว
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((f) => (
              <form key={f.id} action={saveFeeAction} className="px-5 py-4">
                <input type="hidden" name="id" value={f.id} />

                <div className="grid gap-3 sm:grid-cols-[auto_minmax(10rem,1.4fr)_minmax(8rem,1fr)_5rem]">
                  <div>
                    <label className={labelClass} htmlFor={`icon-${f.id}`}>
                      ไอคอน
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="w-10 h-10 shrink-0 rounded-xl grid place-items-center bg-slate-100 text-slate-500">
                        <FeeIcon
                          name={isFeeIconKey(f.icon) ? f.icon : "ticket"}
                          className="w-5 h-5"
                        />
                      </span>
                      <select
                        id={`icon-${f.id}`}
                        name="icon"
                        defaultValue={f.icon}
                        className={`${inputClass} w-40`}
                      >
                        {FEE_ICON_CHOICES.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor={`title-${f.id}`}>
                      ชื่อรายการ
                    </label>
                    <input
                      id={`title-${f.id}`}
                      name="title"
                      defaultValue={f.title}
                      maxLength={60}
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor={`amount-${f.id}`}>
                      ยอด
                    </label>
                    <input
                      id={`amount-${f.id}`}
                      name="amount"
                      defaultValue={f.amount}
                      maxLength={60}
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor={`sort-${f.id}`}>
                      ลำดับ
                    </label>
                    <input
                      id={`sort-${f.id}`}
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={999}
                      defaultValue={f.sortOrder}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelClass} htmlFor={`note-${f.id}`}>
                    คำอธิบาย (ไม่บังคับ)
                  </label>
                  <input
                    id={`note-${f.id}`}
                    name="note"
                    defaultValue={f.note ?? ""}
                    maxLength={200}
                    placeholder="เช่น ราคาต่างกันตามรุ่นรถ"
                    className={inputClass}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      name="highlight"
                      defaultChecked={f.highlight}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    แสดงในสรุปย่อ
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={f.isActive}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    เปิดใช้งาน
                  </label>

                  <div className="ml-auto flex items-center gap-2">
                    <ActionButton
                      className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                      pendingText="กำลังบันทึก…"
                    >
                      บันทึก
                    </ActionButton>
                    <ActionButton
                      formAction={deleteFeeAction}
                      pendingText="กำลังลบ…"
                      confirm={CONFIRM.del(`รายการ "${f.title}" (${f.amount})`)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 text-sm transition-colors disabled:opacity-60"
                    >
                      ลบ
                    </ActionButton>
                  </div>
                </div>

                {!f.isActive && (
                  <p className="mt-2 text-xs text-amber-700">
                    ปิดใช้งานอยู่ — ลูกค้าไม่เห็นรายการนี้ แต่เก็บไว้เปิดใหม่ได้
                  </p>
                )}
              </form>
            ))}
          </div>
        </div>
      )}

      {/* เพิ่มรายการใหม่ */}
      <form action={saveFeeAction} className="mt-5 bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-1">เพิ่มรายการใหม่</h2>
        <p className="text-sm text-slate-500 mb-4">
          ตั้งลำดับให้มากกว่ารายการสุดท้ายถ้าอยากให้อยู่ท้ายสุด
        </p>

        <div className="grid gap-3 sm:grid-cols-[minmax(9rem,auto)_minmax(10rem,1.4fr)_minmax(8rem,1fr)_5rem]">
          <div>
            <label className={labelClass} htmlFor="new-icon">
              ไอคอน
            </label>
            <select id="new-icon" name="icon" defaultValue="ticket" className={inputClass}>
              {FEE_ICON_CHOICES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="new-title">
              ชื่อรายการ
            </label>
            <input
              id="new-title"
              name="title"
              placeholder="เช่น ค่าทำความสะอาดพิเศษ"
              maxLength={60}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-amount">
              ยอด
            </label>
            <input
              id="new-amount"
              name="amount"
              placeholder="เช่น 1,000 บาท"
              maxLength={60}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-sort">
              ลำดับ
            </label>
            <input
              id="new-sort"
              name="sortOrder"
              type="number"
              min={0}
              max={999}
              defaultValue={nextSort}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className={labelClass} htmlFor="new-note">
            คำอธิบาย (ไม่บังคับ)
          </label>
          <input
            id="new-note"
            name="note"
            maxLength={200}
            placeholder="อธิบายสั้น ๆ ว่าคิดเมื่อไหร่"
            className={inputClass}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="highlight"
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            แสดงในสรุปย่อ
          </label>
          <input type="hidden" name="isActive" value="on" />
          <button
            type="submit"
            className="ml-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            เพิ่มรายการ
          </button>
        </div>
      </form>
    </div>
  );
}
