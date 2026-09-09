"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/my/logout", { method: "POST" });
        // ไปหน้าแรกพร้อมธงบอกผล ไม่ใช่รีเฟรชอยู่กับที่
        // ไม่งั้นหน้านี้จะกลายเป็นหน้าเข้าสู่ระบบทันที ซึ่งดูเหมือนระบบพัง
        router.push("/?logout=1");
        router.refresh();
      }}
      className="text-sm min-h-0 text-slate-500 hover:text-slate-800 disabled:opacity-60"
    >
      {busy ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
