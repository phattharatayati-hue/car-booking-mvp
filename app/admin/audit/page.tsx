export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDev } from "@/lib/roles";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { formatBangkokDateTime, bangkokDateStr, toBangkokDate } from "@/lib/settings";
import { AUDIT_GROUPS, AUDIT_LABEL, auditGroup } from "@/lib/audit";

const PAGE_SIZE = 50;

type Row = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actorName: string;
  actorRole: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  summary: string;
  detail: string | null;
};

/** สีของแถวตามความ "แรง" ของการกระทำ */
function tone(action: string): { dot: string; text: string } {
  if (action === "auth.login_failed" || action.endsWith("_reject")) {
    return { dot: "bg-amber-500", text: "text-amber-700" };
  }
  if (action.endsWith(".delete") || action.endsWith("_delete") || action === "booking.cancel") {
    return { dot: "bg-red-500", text: "text-red-700" };
  }
  if (action === "auth.login") {
    return { dot: "bg-slate-300", text: "text-slate-500" };
  }
  return { dot: "bg-blue-500", text: "text-blue-700" };
}

const chip =
  "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap";
const chipOn = "bg-slate-900 text-white border-slate-900";
const chipOff = "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    actor?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireDev();

  const sp = await searchParams;
  const group = sp.group && sp.group !== "all" ? sp.group : null;
  const actor = sp.actor && sp.actor !== "all" ? sp.actor : null;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // ตั้งต้น 7 วันย้อนหลัง เพื่อไม่ให้ดึงทั้งตารางตอนเปิดหน้าแรก
  const today = bangkokDateStr(new Date());
  const defaultFrom = bangkokDateStr(new Date(Date.now() - 6 * 86400000));
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? today;

  const where = {
    createdAt: {
      gte: toBangkokDate(from, "00:00"),
      // ถึงสิ้นวันของวันที่เลือก
      lte: toBangkokDate(to, "23:59"),
    },
    ...(group ? { action: { startsWith: `${group}.` } } : {}),
    ...(actor ? { actorId: actor } : {}),
    ...(q
      ? {
          OR: [
            { summary: { contains: q, mode: "insensitive" as const } },
            { detail: { contains: q, mode: "insensitive" as const } },
            { actorName: { contains: q, mode: "insensitive" as const } },
            { entityId: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, admins] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.adminUser.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** ทำลิงก์ตัวกรอง โดยคงค่าอื่นไว้ และรีเซ็ตหน้าเป็น 1 */
  function href(patch: Record<string, string | null>) {
    const params = new URLSearchParams();
    const base: Record<string, string | null> = {
      group: group ?? null,
      actor: actor ?? null,
      from,
      to,
      q: q || null,
      ...patch,
    };
    for (const [k, v] of Object.entries(base)) {
      if (v) params.set(k, v);
    }
    const s = params.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ประวัติการใช้งาน</h1>
        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
          บันทึกทุกการกระทำที่แก้ข้อมูลในระบบ พร้อมการเข้าสู่ระบบทั้งที่สำเร็จและล้มเหลว ·
          หน้านี้เห็นได้เฉพาะผู้ดูแลระบบ
        </p>
      </div>

      {/* ตัวกรอง */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <p className="text-xs font-medium text-slate-500 mb-2.5">ประเภทการกระทำ</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <Link href={href({ group: null })} className={`${chip} ${!group ? chipOn : chipOff}`}>
            ทั้งหมด
          </Link>
          {Object.entries(AUDIT_GROUPS).map(([key, label]) => (
            <Link
              key={key}
              href={href({ group: key })}
              className={`${chip} ${group === key ? chipOn : chipOff}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <form method="get" className="flex flex-wrap gap-3 items-end">
          {group && <input type="hidden" name="group" value={group} />}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="a-from">
              ตั้งแต่วันที่
            </label>
            <input
              id="a-from"
              type="date"
              name="from"
              defaultValue={from}
              max={today}
              className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="a-to">
              ถึงวันที่
            </label>
            <input
              id="a-to"
              type="date"
              name="to"
              defaultValue={to}
              max={today}
              className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="a-actor">
              ผู้ใช้
            </label>
            <select
              id="a-actor"
              name="actor"
              defaultValue={actor ?? "all"}
              className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="all">ทุกคน</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {ROLE_LABEL[a.role as Role] ?? a.role}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="a-q">
              ค้นหา
            </label>
            <input
              id="a-q"
              name="q"
              defaultValue={q}
              placeholder="ชื่อคน รหัสจอง ทะเบียนรถ…"
              className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <button className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors">
            กรอง
          </button>
          <Link
            href="/admin/audit"
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ล้างตัวกรอง
          </Link>
        </form>
      </div>

      <p className="text-sm text-slate-500 mb-3">
        พบ {total.toLocaleString()} รายการ
        {pages > 1 && ` · หน้า ${page} จาก ${pages}`}
      </p>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-12 text-center">
          <p className="text-slate-500 text-sm">
            ไม่พบประวัติในช่วงและเงื่อนไขที่เลือก
          </p>
          <p className="text-slate-400 text-xs mt-1.5">
            ลองขยายช่วงวันที่ หรือกดล้างตัวกรอง
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {(rows as Row[]).map((r) => {
              const t = tone(r.action);
              return (
                <li key={r.id} className="px-4 sm:px-5 py-3.5 flex gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className={`text-sm font-semibold ${t.text}`}>
                        {AUDIT_LABEL[r.action] ?? r.action}
                      </span>
                      <span className="text-xs text-slate-400">
                        {AUDIT_GROUPS[auditGroup(r.action)] ?? auditGroup(r.action)}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
                        {formatBangkokDateTime(r.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 mt-1 break-words">{r.summary}</p>

                    {r.detail && (
                      <p className="text-xs text-slate-500 mt-1 break-words">{r.detail}</p>
                    )}

                    <p className="text-xs text-slate-400 mt-1.5">
                      โดย <span className="font-medium text-slate-600">{r.actorName}</span>
                      {r.actorRole && ` · ${ROLE_LABEL[r.actorRole as Role] ?? r.actorRole}`}
                      {r.entity === "booking" && r.entityId && (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/bookings?status=all`}
                            className="text-blue-700 hover:underline"
                          >
                            การจอง {r.entityId.slice(0, 8).toUpperCase()}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-5">
          {page > 1 ? (
            <Link
              href={href({ page: String(page - 1) })}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ← ใหม่กว่า
            </Link>
          ) : (
            <span />
          )}
          {page < pages ? (
            <Link
              href={href({ page: String(page + 1) })}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              เก่ากว่า →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6 leading-relaxed">
        ประวัติเก็บชื่อและสิทธิ์ของผู้ทำ ณ เวลานั้น จึงยังอ่านย้อนหลังได้แม้บัญชีนั้นถูกลบไปแล้ว ·
        ระบบไม่บันทึกรหัสผ่าน สลิป หรือรูปเอกสารของลูกค้าลงในประวัตินี้
      </p>
    </div>
  );
}
