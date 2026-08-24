export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { oauthConfigured, CALENDAR_NAME } from "@/lib/google-calendar";
import { formatBangkokDateTime } from "@/lib/settings";

async function changePasswordAction(formData: FormData) {
  "use server";
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) redirect("/admin/account?error=weak");
  if (next !== confirm) redirect("/admin/account?error=mismatch");

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) redirect("/login");

  const ok = await bcrypt.compare(current, admin.passwordHash);
  if (!ok) redirect("/admin/account?error=wrong");

  if (await bcrypt.compare(next, admin.passwordHash)) {
    redirect("/admin/account?error=same");
  }

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });

  redirect("/admin/account?ok=1");
}

const GERRORS: Record<string, string> = {
  notconfigured: "ระบบยังไม่ได้ตั้งค่า Google OAuth — ต้องใส่ตัวแปร env ก่อน",
  denied: "คุณไม่ได้อนุญาตให้เข้าถึงปฏิทิน",
  state: "ลิงก์ที่กลับมาไม่ถูกต้อง กรุณาลองใหม่",
  expired: "ลิงก์หมดอายุแล้ว (เกิน 10 นาที) กรุณากดเชื่อมใหม่",
  scope: "ต้องอนุญาตสิทธิ์สร้างและจัดการปฏิทินของแอปด้วย จึงจะใช้งานได้",
  failed: "เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่",
};

const ERRORS: Record<string, string> = {
  weak: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร",
  mismatch: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน",
  wrong: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
  same: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม",
};

const inputClass =
  "w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    gok?: string;
    gerror?: string;
  }>;
}) {
  const { ok, error, gok, gerror } = await searchParams;
  const session = await auth();

  const me = session?.user?.email
    ? await prisma.adminUser.findUnique({ where: { email: session.user.email } })
    : null;
  const calendarReady = Boolean(me?.googleRefreshToken && me?.googleCalendarId);

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">บัญชีของฉัน</h1>
        <p className="text-slate-500 text-sm mt-1">{session?.user?.email}</p>
      </div>

      {ok && (
        <div className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
        </div>
      )}
      {error && ERRORS[error] && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {ERRORS[error]}
        </div>
      )}

      {gok && (
        <div className="mb-5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
          {gok === "disconnected"
            ? "ยกเลิกการเชื่อมปฏิทินแล้ว"
            : "เชื่อมปฏิทิน Google เรียบร้อยแล้ว"}
        </div>
      )}
      {gerror && GERRORS[gerror] && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {GERRORS[gerror]}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="font-semibold text-slate-900">ปฏิทิน Google</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4 leading-relaxed">
          เชื่อมแล้วระบบจะสร้างปฏิทินแยกชื่อ “{CALENDAR_NAME}” ในบัญชีของคุณ
          แล้วลงงานรับ-ส่งรถที่คุณได้รับมอบหมายให้อัตโนมัติ พร้อมเตือนล่วงหน้า 1 วันและ 1 ชั่วโมง
          <br />
          ระบบขอสิทธิ์เฉพาะปฏิทินที่สร้างขึ้นนี้ <strong>เข้าไม่ถึงปฏิทินอื่นของคุณ</strong>
        </p>

        {!oauthConfigured() ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            ยังใช้งานไม่ได้ — ผู้ดูแลระบบต้องตั้งค่า <code>GOOGLE_OAUTH_CLIENT_ID</code>,{" "}
            <code>GOOGLE_OAUTH_CLIENT_SECRET</code> และ <code>GOOGLE_TOKEN_ENC_KEY</code> ก่อน
          </p>
        ) : calendarReady ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-700">
              เชื่อมกับ <strong>{me?.googleEmail ?? "บัญชี Google"}</strong>
              {me?.googleConnectedAt && (
                <span className="block text-xs text-slate-400">
                  เชื่อมเมื่อ {formatBangkokDateTime(me.googleConnectedAt)}
                </span>
              )}
            </span>
            <form action="/api/google/disconnect" method="post" className="sm:ml-auto">
              <button className="text-sm font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors">
                ยกเลิกการเชื่อม
              </button>
            </form>
          </div>
        ) : (
          <a
            href="/api/google/connect"
            className="inline-block rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            เชื่อมต่อ Google Calendar
          </a>
        )}
      </div>

      <form
        action={changePasswordAction}
        className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4"
      >
        <h2 className="font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2>

        <div>
          <label className={labelClass} htmlFor="current">รหัสผ่านปัจจุบัน</label>
          <input
            id="current"
            name="current"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="next">รหัสผ่านใหม่</label>
          <input
            id="next"
            name="next"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="text-xs text-slate-500 mt-1.5">อย่างน้อย 8 ตัวอักษร</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="confirm">ยืนยันรหัสผ่านใหม่</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 shadow-sm shadow-blue-600/25 transition-colors"
        >
          เปลี่ยนรหัสผ่าน
        </button>
      </form>
    </div>
  );
}
