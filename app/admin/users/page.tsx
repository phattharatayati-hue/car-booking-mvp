export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { pushMessage } from "@/lib/line";
import { createLinkCode } from "@/lib/line-link";
import AddAdminForm from "@/components/AddAdminForm";

type AdminRow = {
  id: string;
  email: string;
  name: string;
  lineUserId: string | null;
  lineLinkCode: string | null;
  lineLinkExpiresAt: Date | null;
  createdAt: Date;
};

/** คำนวณสถานะรหัสผูก — แยกออกมานอก component เพราะอ่านเวลาปัจจุบัน */
function linkCodeState(code: string | null, expiresAt: Date | null) {
  const expires = expiresAt?.getTime() ?? 0;
  const remaining = expires - Date.now();
  return {
    isValid: Boolean(code) && remaining > 0,
    minutesLeft: Math.max(1, Math.ceil(remaining / 60000)),
  };
}

async function addAdminAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name || password.length < 8) {
    redirect("/admin/users?error=invalid");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/users?error=duplicate");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.create({
    data: { email, name, passwordHash },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=added");
}

async function createLinkCodeAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  await createLinkCode(id);

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=code");
}

async function unlinkLineAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  await prisma.adminUser.update({
    where: { id },
    data: { lineUserId: null, lineLinkCode: null, lineLinkExpiresAt: null },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=unlinked");
}

async function resetPasswordAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

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

async function deleteAdminAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = String(formData.get("id") ?? "");

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) redirect("/admin/users?error=notfound");

  // กันลบตัวเอง
  if (target.email === session.user.email) {
    redirect("/admin/users?error=self");
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

async function testLineAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lineUserId = String(formData.get("lineUserId") ?? "").trim();
  if (!lineUserId) redirect("/admin/users?error=noline");

  await pushMessage(
    lineUserId,
    "🔔 ทดสอบการแจ้งเตือนจากระบบจองรถ\n\nถ้าคุณเห็นข้อความนี้ แปลว่าตั้งค่าถูกต้องแล้ว"
  );

  redirect("/admin/users?ok=test");
}

const MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  added: { text: "เพิ่มแอดมินเรียบร้อยแล้ว", tone: "ok" },
  code: { text: "สร้างรหัสผูกบัญชีแล้ว — นำไปพิมพ์ในแชท LINE ภายใน 10 นาที", tone: "ok" },
  unlinked: { text: "ยกเลิกการผูก LINE เรียบร้อยแล้ว", tone: "ok" },
  updated: { text: "อัปเดต LINE ID เรียบร้อยแล้ว", tone: "ok" },
  deleted: { text: "ลบแอดมินเรียบร้อยแล้ว", tone: "ok" },
  password: { text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", tone: "ok" },
  test: { text: "ส่งข้อความทดสอบแล้ว กรุณาเช็ค LINE", tone: "ok" },
  invalid: { text: "ข้อมูลไม่ครบ หรือรหัสผ่านสั้นกว่า 8 ตัวอักษร", tone: "error" },
  duplicate: { text: "อีเมลนี้ถูกใช้งานแล้ว", tone: "error" },
  lineid: {
    text: "รูปแบบ LINE ID ไม่ถูกต้อง (ต้องขึ้นต้นด้วย U หรือ C ตามด้วยตัวอักษร/ตัวเลข 32 ตัว)",
    tone: "error",
  },
  weakpassword: { text: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร", tone: "error" },
  self: { text: "ลบบัญชีตัวเองไม่ได้", tone: "error" },
  last: { text: "ลบไม่ได้ ต้องเหลือแอดมินอย่างน้อย 1 คน", tone: "error" },
  notfound: { text: "ไม่พบบัญชีนี้", tone: "error" },
  noline: { text: "ยังไม่ได้ผูก LINE ID", tone: "error" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const session = await auth();
  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });

  const flash = MESSAGES[ok ?? ""] ?? MESSAGES[error ?? ""];
  const linkedCount = admins.filter((a: AdminRow) => a.lineUserId).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการแอดมิน</h1>
          <p className="text-slate-500 text-sm mt-1">
            มีแอดมิน {admins.length} คน · ผูก LINE แล้ว {linkedCount} คน
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

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-blue-900 text-sm mb-2">
          วิธีผูก LINE เพื่อรับแจ้งเตือน
        </h2>
        <ol className="text-sm text-blue-900/90 leading-relaxed list-decimal list-inside space-y-1">
          <li>กดปุ่ม <span className="font-semibold">สร้างรหัสผูก LINE</span> ที่บัญชีของคนนั้น</li>
          <li>เพิ่มเพื่อน LINE Official Account ของร้าน</li>
          <li>พิมพ์<span className="font-semibold">เลข 6 หลัก</span>ที่ได้ ส่งในแชท — ระบบจะผูกให้อัตโนมัติ</li>
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        {admins.map((admin: AdminRow) => {
          const isSelf = admin.email === session?.user?.email;
          const { isValid: codeIsValid, minutesLeft } = linkCodeState(
            admin.lineLinkCode,
            admin.lineLinkExpiresAt
          );
          return (
            <div
              key={admin.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3.5 min-w-0">
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
                    </p>
                    <p className="text-sm text-slate-500 truncate">{admin.email}</p>
                  </div>
                </div>

                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                    admin.lineUserId
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {admin.lineUserId ? "🔔 รับแจ้งเตือน LINE" : "ยังไม่ผูก LINE"}
                </span>
              </div>

              {/* ผูก LINE */}
              {admin.lineUserId ? (
                <div className="flex flex-wrap items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <span className="text-sm text-emerald-900">
                    ผูกบัญชี LINE เรียบร้อยแล้ว
                  </span>
                  <form action={unlinkLineAction} className="ml-auto">
                    <input type="hidden" name="id" value={admin.id} />
                    <button className="text-sm font-medium text-emerald-800 hover:text-red-600 transition-colors">
                      ยกเลิกการผูก
                    </button>
                  </form>
                </div>
              ) : codeIsValid ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
                  <p className="text-sm text-blue-900 mb-2">
                    พิมพ์รหัสนี้ส่งในแชท LINE ของร้าน (หมดอายุใน {minutesLeft} นาที)
                  </p>
                  <p className="text-4xl font-bold tracking-[0.3em] text-blue-900 font-mono">
                    {admin.lineLinkCode}
                  </p>
                  <form action={createLinkCodeAction} className="mt-3">
                    <input type="hidden" name="id" value={admin.id} />
                    <button className="text-sm font-medium text-blue-700 hover:text-blue-900">
                      ขอรหัสใหม่
                    </button>
                  </form>
                </div>
              ) : (
                <form action={createLinkCodeAction}>
                  <input type="hidden" name="id" value={admin.id} />
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors">
                    🔗 สร้างรหัสผูก LINE
                  </button>
                </form>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-end">
                {admin.lineUserId && (
                  <form action={testLineAction}>
                    <input type="hidden" name="lineUserId" value={admin.lineUserId} />
                    <button className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      ส่งข้อความทดสอบ
                    </button>
                  </form>
                )}

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
