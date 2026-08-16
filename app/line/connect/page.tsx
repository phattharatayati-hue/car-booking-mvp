export const dynamic = "force-dynamic";

import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import ConnectLine from "./ConnectLine";
import { lineAddFriendUrl } from "@/lib/line-public";

export default function ConnectLinePage() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

  return (
    <PublicShell>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-700">หน้าแรก</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700">เชื่อมต่อ LINE</span>
        </nav>

        <ConnectLine liffId={liffId} addFriendUrl={lineAddFriendUrl()} />

        <div className="mt-5 bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h2 className="font-semibold text-blue-900 text-sm mb-2">
            เชื่อมต่อแล้วได้อะไรบ้าง
          </h2>
          <ul className="text-sm text-blue-900/90 leading-relaxed space-y-1">
            <li>• แจ้งทันทีเมื่อแอดมินตรวจสลิปมัดจำเสร็จ</li>
            <li>• เตือนล่วงหน้าก่อนถึงวันคืนรถ</li>
            <li>• เช็คสถานะการจองได้ในแชท ไม่ต้องเปิดเว็บ</li>
            <li>• จองรถครั้งต่อไปได้ในแชทเลย</li>
          </ul>
        </div>
      </div>
    </PublicShell>
  );
}
