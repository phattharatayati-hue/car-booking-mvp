export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

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
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const session = await auth();

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
