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
        router.refresh();
      }}
      className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-60"
    >
      ออกจากระบบ
    </button>
  );
}
