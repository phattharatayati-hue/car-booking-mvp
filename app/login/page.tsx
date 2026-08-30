import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

async function loginAction(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
            <span className="w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center shadow-sm shadow-blue-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-bold text-lg text-slate-900">CM Car Rent</span>
          </Link>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-xl font-bold text-slate-900">เข้าสู่ระบบแอดมิน</h1>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              จัดการรถและตรวจสอบการจอง
            </p>

            {error && (
              <div className="flex gap-3 text-sm bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-5">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0 text-red-500">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
                อีเมลหรือรหัสผ่านไม่ถูกต้อง
              </div>
            )}

            <form action={loginAction} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  อีเมล หรือชื่อผู้ใช้
                </label>
                <input
                  id="email"
                  type="text"
                  name="email"
                  required
                  autoComplete="username"
                  className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-3.5 shadow-lg shadow-blue-600/25"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          </div>

          <p className="text-center mt-6">
            <Link href="/" className="text-sm text-slate-500 hover:text-blue-700">
              ← กลับหน้าเว็บไซต์
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
