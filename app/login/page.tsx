import { redirect } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm bg-neutral-900 rounded-xl p-8 border border-neutral-800">
        <h1 className="text-xl font-semibold text-white mb-1">เข้าสู่ระบบแอดมิน</h1>
        <p className="text-neutral-400 text-sm mb-6">ระบบจองรถ - หลังบ้าน</p>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-950/50 px-3 py-2 rounded-md">
            อีเมลหรือรหัสผ่านไม่ถูกต้อง
          </p>
        )}

        <form action={loginAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm font-medium py-2"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
