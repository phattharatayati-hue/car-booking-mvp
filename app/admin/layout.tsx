import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const initial = email.slice(0, 1).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="md:w-64 md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:sticky md:top-0 md:h-screen">
        <div className="px-5 py-5 border-b border-slate-100">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white grid place-items-center shrink-0">
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
            <span className="leading-tight">
              <span className="block font-bold text-slate-900 text-sm">CM Car Rent</span>
              <span className="block text-[11px] text-slate-500">ระบบหลังบ้าน</span>
            </span>
          </Link>
        </div>

        <div className="px-3 py-4 flex-1">
          <AdminNav />
        </div>

        <div className="px-3 pb-4 hidden md:block">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
              <path
                d="M14 5h5v5m0-5l-7 7M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ดูหน้าเว็บไซต์
          </Link>
        </div>

        <div className="px-4 py-4 border-t border-slate-100 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-slate-900 text-white grid place-items-center text-sm font-semibold shrink-0">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">แอดมิน</p>
            <p className="text-sm font-medium text-slate-900 truncate">{email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              title="ออกจากระบบ"
              className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M15 17l5-5-5-5m5 5H9M12 4H6a1 1 0 00-1 1v14a1 1 0 001 1h6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  );
}
