export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireDev } from "@/lib/roles";
import { revokeToken } from "@/lib/google-calendar";
import AddAdminForm from "@/components/AddAdminForm";

type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "DEV" | "DRIVER";
  lineUserId: string | null;
  googleEmail: string | null;
  googleRefreshToken: string | null;
  googleConnectedAt: Date | null;
  createdAt: Date;
};

async function addAdminAction(formData: FormData) {
  "use server";
  await requireDev();

  // ช่องนี้คือ "ชื่อผู้ใช้" ที่ใช้ล็อกอิน — เก็บในคอลัมน์ email เพราะเป็นคีย์เฉพาะอยู่แล้ว
  // จะใส่เป็นชื่อธรรมดา (Sutimon) หรืออีเมลเต็มก็ได้
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // สร้างได้แค่ 2 ประเภท — บัญชีผู้ดูแลระบบ (DEV) ต้องสร้างจาก seed เท่านั้น
  const role = String(formData.get("role") ?? "ADMIN") === "DRIVER" ? "DRIVER" : "ADMIN";

  if (!email || !name || password.length < 8) {
    redirect("/admin/users?error=invalid");
  }
  if (!/^[a-z0-9._@-]{3,}$/.test(email)) {
    redirect("/admin/users?error=username");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/users?error=duplicate");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.create({
    data: { email, name, passwordHash, role },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=added");
}

async function resetPasswordAction(formData: FormData) {
  "use server";
  await requireDev();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    redirect("/admin/users?error=weakpassword");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.update({ where: { id }, data: { passwordHash } });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=password");
}

/** ตัดการผูก LINE ของแอดมินคนหนึ่ง — ใช้ตอนเขาเปลี่ยนบัญชี LINE หรือลาออก */
async function unlinkLineAction(formData: FormData) {
  "use server";
  await requireDev();

  const id = String(formData.get("id") ?? "");
  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) redirect("/admin/users?error=notfound");
  if (!target.lineUserId) redirect("/admin/users?error=noline");

  await prisma.adminUser.update({
    where: { id },
    data: { lineUserId: null, lineLinkCode: null, lineLinkExpiresAt: null },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=unlinked");
}

/** ตัดการเชื่อม Google Calendar ของแอดมินคนหนึ่ง */
async function disconnectCalendarAction(formData: FormData) {
  "use server";
  await requireDev();

  const id = String(formData.get("id") ?? "");
  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) redirect("/admin/users?error=notfound");
  if (!target.googleRefreshToken) redirect("/admin/users?error=nogoogle");

  // เพิกถอนสิทธิ์ที่ฝั่ง Google — ล้มเหลวก็ยังล้างข้อมูลฝั่งเราต่อ
  try {
    await revokeToken(target.googleRefreshToken);
  } catch (err) {
    console.error("revoke failed:", err);
  }

  await prisma.adminUser.update({
    where: { id },
    data: {
      googleEmail: null,
      googleRefreshToken: null,
      googleCalendarId: null,
      googleConnectedAt: null,
    },
  });

  // event เก่าที่ค้างในปฏิทินเดิมจะถูกเพิกเฉย — ล้าง id ทิ้งไม่ให้ระบบพยายามแก้ต่อ
  await prisma.bookingAssignment.updateMany({
    where: { adminUserId: id },
    data: { googleEventId: null, syncedAt: null, syncError: null },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=gdisconnected");
}

async function deleteAdminAction(formData: FormData) {
  "use server";
  const me = await requireDev();

  const id = String(formData.get("id") ?? "");

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) redirect("/admin/users?error=notfound");

  // กันลบตัวเอง
  if (target.id === me.id) {
    redirect("/admin/users?error=self");
  }

  // กันลบบัญชีผู้ดูแลระบบคนอื่น
  if (target.role === "DEV") {
    redirect("/admin/users?error=dev");
  }

  // กันลบจนไม่เหลือแอดมินเลย
  const count = await prisma.adminUser.count();
  if (count <= 1) {
    redirect("/admin/users?error=last");
  }

  await prisma.adminUser.delete({ where: { id } });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=deleted");
}

const MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  added: { text: "เพิ่มแอดมินเรียบร้อยแล้ว", tone: "ok" },
  deleted: { text: "ลบแอดมินเรียบร้อยแล้ว", tone: "ok" },
  password: { text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", tone: "ok" },
  unlinked: {
    text: "ตัดการผูก LINE เรียบร้อยแล้ว — ให้เจ้าตัวผูกใหม่ได้ที่หน้าบัญชีของฉัน",
    tone: "ok",
  },
  gdisconnected: {
    text: "ตัดการเชื่อม Google Calendar เรียบร้อยแล้ว — งานเก่าที่ลงปฏิทินไว้จะไม่ถูกอัปเดตอีก",
    tone: "ok",
  },
  invalid: { text: "ข้อมูลไม่ครบ หรือรหัสผ่านสั้นกว่า 8 ตัวอักษร", tone: "error" },
  duplicate: { text: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว", tone: "error" },
  username: {
    text: "ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข . _ - @ และยาวอย่างน้อย 3 ตัว",
    tone: "error",
  },
  weakpassword: { text: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร", tone: "error" },
  self: { text: "ลบบัญชีตัวเองไม่ได้", tone: "error" },
  last: { text: "ลบไม่ได้ ต้องเหลือแอดมินอย่างน้อย 1 คน", tone: "error" },
  notfound: { text: "ไม่พบบัญชีนี้", tone: "error" },
  dev: { text: "ลบบัญชีผู้ดูแลระบบไม่ได้", tone: "error" },
  noline: { text: "บัญชีนี้ยังไม่ได้ผูก LINE", tone: "error" },
  nogoogle: { text: "บัญชีนี้ยังไม่ได้เชื่อม Google Calendar", tone: "error" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireDev();

  const { ok, error } = await searchParams;
  // ซ่อนบัญชีผู้ดูแลระบบคนอื่น — เห็นได้เฉพาะของตัวเอง
  const admins = (await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
  })) as AdminRow[];
  const visible = admins.filter((a) => a.role !== "DEV" || a.id === me.id);

  const flash = MESSAGES[ok ?? ""] ?? MESSAGES[error ?? ""];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการแอดมิน</h1>
          <p className="text-slate-500 text-sm mt-1">
            มีผู้ใช้ {visible.length} คน · สร้างบัญชีแอดมินหรือคนรับ-ส่งรถ ตั้งรหัสผ่านใหม่ และตัดการเชื่อม
            LINE/ปฏิทินได้ที่นี่
          </p>
        </div>
        <AddAdminForm action={addAdminAction} />
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

      <div className="flex flex-col gap-4">
        {visible.map((admin: AdminRow) => {
          const isSelf = admin.id === me.id;
          return (
            <div
              key={admin.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6"
            >
              <div className="flex items-center gap-3.5 min-w-0 mb-5">
                <span className="w-11 h-11 rounded-full bg-slate-900 text-white grid place-items-center font-semibold shrink-0">
                  {admin.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                    {admin.name}
                    {isSelf && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        คุณ
                      </span>
                    )}
                    {admin.role === "DEV" && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-900 text-white border border-slate-900">
                        ผู้ดูแลระบบ
                      </span>
                    )}
                    {admin.role === "DRIVER" && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        คนรับ-ส่งรถ
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{admin.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    admin.lineUserId
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {admin.lineUserId ? "🔔 ผูก LINE แล้ว" : "ยังไม่ผูก LINE"}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    admin.googleConnectedAt
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {admin.googleConnectedAt
                    ? `📅 เชื่อมปฏิทินแล้ว${admin.googleEmail ? ` · ${admin.googleEmail}` : ""}`
                    : "ยังไม่เชื่อมปฏิทิน"}
                </span>
              </div>

              {(admin.lineUserId || admin.googleConnectedAt) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {admin.lineUserId && (
                    <form action={unlinkLineAction}>
                      <input type="hidden" name="id" value={admin.id} />
                      <button className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                        ตัดการผูก LINE
                      </button>
                    </form>
                  )}
                  {admin.googleConnectedAt && (
                    <form action={disconnectCalendarAction}>
                      <input type="hidden" name="id" value={admin.id} />
                      <button className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                        ตัดการเชื่อมปฏิทิน
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-end">
                <form action={resetPasswordAction} className="flex gap-2 items-end">
                  <input type="hidden" name="id" value={admin.id} />
                  <input
                    type="password"
                    name="password"
                    placeholder="ตั้งรหัสผ่านใหม่"
                    autoComplete="new-password"
                    className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-sm w-44 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    เปลี่ยนรหัสผ่าน
                  </button>
                </form>

                {!isSelf && admins.length > 1 && (
                  <form action={deleteAdminAction} className="ml-auto">
                    <input type="hidden" name="id" value={admin.id} />
                    <button className="px-3.5 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                      ลบแอดมิน
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
