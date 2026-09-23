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
import { DISTRICTS, SERVICE_PROVINCES, isServiceProvince, isValidDistrict } from "@/lib/th-areas";

/**
 * แผนการเดินทาง — สถานที่ยอดนิยม และเรทค่าบริการตามพื้นที่
 *
 * ลูกค้าเลือกสถานที่ตอนจอง ระบบหาเรทจาก: สถานที่ → อำเภอ → จังหวัด → 0
 * หลายแพลนคิดครั้งเดียวต่อการจอง โดยใช้เรทสูงสุด (lib/trip-plans.ts)
 * ตอนเริ่มใช้ทุกเรทเป็น 0 — บริษัทค่อยกำหนดราคาทีหลัง
 */

const PATH = "/admin/trip-plans";

type PlaceRow = {
  id: string;
  name: string;
  province: string;
  district: string;
  surcharge: number;
  note: string | null;
  drivingTip: string | null;
  sortOrder: number;
  isActive: boolean;
};

type UsageRow = {
  province: string;
  district: string;
  placeName: string;
  _count: { _all: number };
};

type RateRow = { id: string; province: string; district: string | null; surcharge: number };

/** ช่องเลือกพื้นที่ส่งค่า "จังหวัด|อำเภอ" มา (อำเภอว่าง = ทั้งจังหวัด) */
function splitArea(formData: FormData): { province: string; district: string } {
  const [province = "", district = ""] = String(formData.get("area") ?? "").split("|");
  return { province, district };
}

function intOr(v: FormDataEntryValue | null, fallback: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

async function mustLogin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
}

/* ---------- สถานที่ยอดนิยม ---------- */

async function addPlaceAction(formData: FormData) {
  "use server";
  await mustLogin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const { province, district } = splitArea(formData);
  const surcharge = intOr(formData.get("surcharge"), 0);
  const sortOrder = intOr(formData.get("sortOrder"), 0);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const drivingTip = String(formData.get("drivingTip") ?? "").trim().slice(0, 500) || null;

  if (!name) redirect(`${PATH}?error=name`);
  if (!isValidDistrict(province, district)) redirect(`${PATH}?error=area`);
  if (surcharge < 0 || surcharge > 100_000) redirect(`${PATH}?error=amount`);

  const created = await prisma.tripPlace.create({
    data: { name, province, district, surcharge, sortOrder, note, drivingTip },
  });
  await audit({
    action: "master.trip_place_add",
    summary: `เพิ่มสถานที่ยอดนิยม ${name} (${province} · ${district})`,
    entity: "tripPlace",
    entityId: created.id,
    detail: `ค่าบริการเพิ่ม ${surcharge.toLocaleString()} บาท`,
  });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=added`);
}

async function updatePlaceAction(formData: FormData) {
  "use server";
  await mustLogin();
  const id = String(formData.get("id") ?? "");
  const before = await prisma.tripPlace.findUnique({ where: { id } });
  if (!before) redirect(`${PATH}?error=notfound`);

  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || before.name;
  const surcharge = intOr(formData.get("surcharge"), before.surcharge);
  const sortOrder = intOr(formData.get("sortOrder"), before.sortOrder);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const drivingTip = String(formData.get("drivingTip") ?? "").trim().slice(0, 500) || null;
  if (surcharge < 0 || surcharge > 100_000) redirect(`${PATH}?error=amount`);

  await prisma.tripPlace.update({
    where: { id },
    data: { name, surcharge, sortOrder, note, drivingTip },
  });

  const changes: string[] = [];
  if (before.name !== name) changes.push(`ชื่อ: ${before.name} → ${name}`);
  if (before.surcharge !== surcharge)
    changes.push(`ค่าบริการ: ${before.surcharge.toLocaleString()} → ${surcharge.toLocaleString()} บาท`);
  if (before.sortOrder !== sortOrder) changes.push(`ลำดับ: ${before.sortOrder} → ${sortOrder}`);
  if ((before.drivingTip ?? "") !== (drivingTip ?? "")) changes.push("แก้คำแนะนำการขับ");
  await audit({
    action: "master.trip_place_update",
    summary: `แก้สถานที่ยอดนิยม ${name}`,
    entity: "tripPlace",
    entityId: id,
    detail: changes.join(" · ") || "แก้หมายเหตุ",
  });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=updated`);
}

async function togglePlaceAction(formData: FormData) {
  "use server";
  await mustLogin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  const updated = await prisma.tripPlace.update({ where: { id }, data: { isActive: !isActive } });
  await audit({
    action: "master.trip_place_toggle",
    summary: `${updated.isActive ? "เปิด" : "ปิด"}สถานที่ยอดนิยม ${updated.name}`,
    entity: "tripPlace",
    entityId: id,
  });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=updated`);
}

async function deletePlaceAction(formData: FormData) {
  "use server";
  await mustLogin();
  const id = String(formData.get("id") ?? "");
  const target = await prisma.tripPlace.findUnique({ where: { id } });
  // ใบจองเก่าเก็บชื่อสถานที่ไว้ในแถวของตัวเองแล้ว ลบรายการนี้ได้โดยไม่กระทบ
  await prisma.tripPlace.delete({ where: { id } });
  await audit({
    action: "master.trip_place_delete",
    summary: `ลบสถานที่ยอดนิยม ${target?.name ?? id}`,
    entity: "tripPlace",
    entityId: id,
  });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=deleted`);
}

/* ---------- เรทตามพื้นที่ ---------- */

async function saveRateAction(formData: FormData) {
  "use server";
  await mustLogin();
  const { province, district: districtRaw } = splitArea(formData);
  const district = districtRaw === "" ? null : districtRaw;
  const surcharge = intOr(formData.get("surcharge"), 0);

  if (!isServiceProvince(province)) redirect(`${PATH}?error=area`);
  if (district && !isValidDistrict(province, district)) redirect(`${PATH}?error=area`);
  if (surcharge < 0 || surcharge > 100_000) redirect(`${PATH}?error=amount`);

  // Prisma upsert ใช้ค่า null ใน unique ไม่ได้ จึงหาเองก่อน
  const existing = await prisma.tripAreaRate.findFirst({ where: { province, district } });
  if (existing) {
    await prisma.tripAreaRate.update({ where: { id: existing.id }, data: { surcharge } });
  } else {
    await prisma.tripAreaRate.create({ data: { province, district, surcharge } });
  }
  await audit({
    action: "master.trip_rate_save",
    summary: `ตั้งเรทค่าบริการ ${province}${district ? ` · ${district}` : " (ทั้งจังหวัด)"}`,
    entity: "tripAreaRate",
    detail: `${existing ? `${existing.surcharge.toLocaleString()} → ` : ""}${surcharge.toLocaleString()} บาท`,
  });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=rate`);
}

async function deleteRateAction(formData: FormData) {
  "use server";
  await mustLogin();
  const id = String(formData.get("id") ?? "");
  const target = await prisma.tripAreaRate.findUnique({ where: { id } });
  await prisma.tripAreaRate.delete({ where: { id } });
  await audit({
    action: "master.trip_rate_delete",
    summary: `ลบเรทค่าบริการ ${target?.province ?? ""}${target?.district ? ` · ${target.district}` : ""}`,
    entity: "tripAreaRate",
    entityId: id,
  });
  revalidatePath(PATH);
  redirect(`${PATH}?ok=deleted`);
}

const OK_TEXT: Record<string, string> = {
  added: "เพิ่มสถานที่เรียบร้อยแล้ว",
  updated: "บันทึกเรียบร้อยแล้ว",
  deleted: "ลบเรียบร้อยแล้ว",
  rate: "บันทึกเรทเรียบร้อยแล้ว",
};
const ERRORS: Record<string, string> = {
  name: "กรุณากรอกชื่อสถานที่",
  area: "จังหวัดหรืออำเภอไม่ถูกต้อง",
  amount: "ค่าบริการต้องเป็นจำนวนเต็ม 0 ขึ้นไป",
  notfound: "ไม่พบรายการนี้",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

export default async function TripPlansAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireStaff();
  const { ok, error } = await searchParams;

  const [places, rates, usage] = await Promise.all([
    prisma.tripPlace.findMany({
      orderBy: [{ province: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }) as Promise<PlaceRow[]>,
    prisma.tripAreaRate.findMany({
      orderBy: [{ province: "asc" }, { district: "asc" }],
    }) as Promise<RateRow[]>,
    // สถิติ: ลูกค้ากรอกที่ไหนบ่อย — ใช้ตัดสินใจเพิ่มสถานที่และตั้งเรท
    prisma.bookingTripPlan.groupBy({
      by: ["province", "district", "placeName"],
      where: { placeId: null },
      _count: { _all: true },
      orderBy: { _count: { placeName: "desc" } },
      take: 15,
    }),
  ]);

  const allDistricts = SERVICE_PROVINCES.flatMap((p) => DISTRICTS[p].map((d) => ({ p, d })));

  return (
    <div className="max-w-5xl">
      <AdminTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">แผนการเดินทาง</h1>
        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
          ลูกค้าต้องกรอกว่าจะไปที่ไหนบ้างตอนจอง · ค่าบริการเพิ่มหาจาก{" "}
          <b>สถานที่ → อำเภอ → จังหวัด</b> ถ้าไม่ได้ตั้งไว้คือ 0 ·
          ถ้าลูกค้าเลือกหลายที่ ระบบคิดครั้งเดียวด้วยเรทที่สูงที่สุด ·
          แก้เรทแล้วไม่กระทบใบจองเก่า
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

      {/* ---------- สถานที่ยอดนิยม ---------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">สถานที่ยอดนิยม</h2>

        <form
          action={addPlaceAction}
          className="mb-4 bg-white rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-6 gap-3 items-end"
        >
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="p-name">ชื่อสถานที่</label>
            <input id="p-name" name="name" required placeholder="เช่น ดอยอินทนนท์" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="p-area">จังหวัด · อำเภอ</label>
            <select id="p-area" name="area" required defaultValue="" className={inputClass}>
              <option value="" disabled>— เลือก —</option>
              {SERVICE_PROVINCES.map((p) => (
                <optgroup key={p} label={p}>
                  {DISTRICTS[p].map((d) => (
                    <option key={d} value={`${p}|${d}`}>{p} · {d}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="p-fee">ค่าบริการ (บาท)</label>
            <input id="p-fee" name="surcharge" type="number" min="0" defaultValue={0} className={inputClass} />
          </div>
          <div>
            <ActionButton className={BTN.primary} pendingText="กำลังเพิ่ม…">
              เพิ่ม
            </ActionButton>
          </div>
          <div className="sm:col-span-6">
            <label className={labelClass} htmlFor="p-tip">
              คำแนะนำการขับ (ลูกค้าเห็นตอนเลือกสถานที่ — เว้นว่างได้)
            </label>
            <textarea
              id="p-tip"
              name="drivingTip"
              rows={2}
              maxLength={500}
              placeholder="เช่น ทางขึ้นชันและโค้งหักศอก ขาลงใช้เกียร์ต่ำ (L/B) ห้ามเหยียบเบรกค้าง"
              className={inputClass}
            />
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {places.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              ยังไม่มีสถานที่ — ลูกค้าจะเลือกได้แค่ “อื่นๆ — ระบุเอง”
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {places.map((p: PlaceRow) => (
                <li key={p.id} className="p-3 sm:p-4">
                  <form action={updatePlaceAction} className="grid sm:grid-cols-12 gap-2 items-end">
                    <input type="hidden" name="id" value={p.id} />
                    <div className="sm:col-span-4">
                      <label className={labelClass}>
                        {p.province} · {p.district}
                        {!p.isActive && <span className="ml-1 text-slate-400">(ปิดใช้งาน)</span>}
                      </label>
                      <input name="name" defaultValue={p.name} className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>ค่าบริการ (บาท)</label>
                      <input name="surcharge" type="number" min="0" defaultValue={p.surcharge} className={inputClass} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={labelClass}>ลำดับ</label>
                      <input name="sortOrder" type="number" defaultValue={p.sortOrder} className={inputClass} />
                    </div>
                    <div className="sm:col-span-3">
                      <label className={labelClass}>หมายเหตุ (ลูกค้าไม่เห็น)</label>
                      <input name="note" defaultValue={p.note ?? ""} placeholder="เช่น ทางชัน" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <ActionButton className={BTN.smGhost} pendingText="กำลังบันทึก…">
                        บันทึก
                      </ActionButton>
                    </div>
                    <div className="sm:col-span-12">
                      <label className={labelClass}>คำแนะนำการขับ (ลูกค้าเห็น)</label>
                      <textarea
                        name="drivingTip"
                        rows={2}
                        maxLength={500}
                        defaultValue={p.drivingTip ?? ""}
                        placeholder="เว้นว่าง = ไม่แสดงคำแนะนำ"
                        className={inputClass}
                      />
                    </div>
                  </form>
                  <div className="mt-2 flex gap-2">
                    <form action={togglePlaceAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="isActive" value={String(p.isActive)} />
                      <ActionButton className={BTN.smGhost} pendingText="…">
                        {p.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </ActionButton>
                    </form>
                    <form action={deletePlaceAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <ActionButton
                        className={BTN.smDanger}
                        pendingText="กำลังลบ…"
                        confirm={`ลบ "${p.name}"? ใบจองเก่าที่เลือกที่นี่ไว้ไม่เปลี่ยนแปลง`}
                      >
                        ลบ
                      </ActionButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- เรทตามพื้นที่ ---------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">เรทค่าบริการตามพื้นที่</h2>
        <p className="text-sm text-slate-500 mb-3">
          ใช้กับสถานที่ที่ลูกค้ากรอกเอง และสถานที่ยอดนิยมที่ค่าบริการเป็น 0 ·
          เลือก “ทั้งจังหวัด” เพื่อตั้งเรทเดียวทั้งจังหวัด แล้วค่อยตั้งอำเภอที่ต่างออกไป
        </p>
        <form
          action={saveRateAction}
          className="mb-4 bg-white rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-5 gap-3 items-end"
        >
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="r-area">พื้นที่</label>
            <select id="r-area" name="area" required defaultValue="" className={inputClass}>
              <option value="" disabled>— เลือก —</option>
              {SERVICE_PROVINCES.map((p) => (
                <optgroup key={p} label={p}>
                  <option value={`${p}|`}>{p} · ทั้งจังหวัด</option>
                  {DISTRICTS[p].map((d) => (
                    <option key={d} value={`${p}|${d}`}>{p} · {d}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="r-fee">ค่าบริการ (บาท)</label>
            <input id="r-fee" name="surcharge" type="number" min="0" defaultValue={0} className={inputClass} />
          </div>
          <div>
            <ActionButton className={BTN.primary} pendingText="กำลังบันทึก…">
              บันทึกเรท
            </ActionButton>
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {rates.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              ยังไม่ได้ตั้งเรท — ทุกพื้นที่คิด 0 บาท
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">พื้นที่</th>
                  <th className="px-4 py-2 text-right">ค่าบริการ</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((r: RateRow) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      {r.province} · {r.district ?? <span className="text-slate-500">ทั้งจังหวัด</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.surcharge.toLocaleString()} ฿</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteRateAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ActionButton className={BTN.smDanger} pendingText="…" confirm="ลบเรทนี้?">
                          ลบ
                        </ActionButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ---------- สถิติ ---------- */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">ที่ที่ลูกค้ากรอกเองบ่อย</h2>
        <p className="text-sm text-slate-500 mb-3">
          ใช้ดูว่าควรเพิ่มสถานที่ไหนเป็นรายการยอดนิยม ({allDistricts.length} อำเภอในพื้นที่บริการ)
        </p>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {usage.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {(usage as UsageRow[]).map((u) => (
                <li key={`${u.province}-${u.district}-${u.placeName}`} className="px-4 py-2 flex justify-between gap-3">
                  <span>
                    {u.placeName}{" "}
                    <span className="text-slate-500">
                      ({u.province} · {u.district})
                    </span>
                  </span>
                  <span className="tabular-nums text-slate-500">{u._count._all} ครั้ง</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
