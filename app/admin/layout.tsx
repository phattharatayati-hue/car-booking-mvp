import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      <aside className="w-56 border-r border-neutral-800 flex flex-col">
        <div className="px-5 py-5 border-b border-neutral-800">
          <p className="font-semibold">ระบบจองรถ</p>
          <p className="text-xs text-neutral-500">หลังบ้านแอดมิน</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 text-sm">
          <Link href="/admin" className="px-3 py-2 rounded-md hover:bg-neutral-900">
            แดชบอร์ด
          </Link>
          <Link href="/admin/bookings" className="px-3 py-2 rounded-md hover:bg-neutral-900">
            รายการจอง
          </Link>
          <Link href="/admin/cars" className="px-3 py-2 rounded-md hover:bg-neutral-900">
            จัดการรถ
          </Link>
        </nav>
        <div className="px-5 py-4 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 mb-2">{session?.user?.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-xs text-neutral-400 hover:text-white">ออกจากระบบ</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
