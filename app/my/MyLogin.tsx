import Link from "next/link";

/**
 * หน้าเข้าสู่ระบบของลูกค้า — เข้าได้ทางเดียวคือ LINE
 *
 * ทำไมไม่มีช่องกรอกเบอร์แล้ว
 *   ประวัติการจองมีทั้งเอกสารและสลิปโอนเงิน ถ้าให้พิมพ์เบอร์แล้วเข้าได้
 *   ใครที่รู้เบอร์ลูกค้าก็เปิดดูของคนอื่นได้ ตัวตนจึงผูกกับบัญชี LINE
 *   ที่เซิร์ฟเวอร์ LINE ยืนยันให้เท่านั้น (ดู lib/line-login.ts)
 */
export default function MyLogin({
  addFriendUrl,
  lineButton,
  notice,
}: {
  addFriendUrl: string;
  /** ปุ่มเข้าสู่ระบบด้วย LINE — ส่งมาจากฝั่งเซิร์ฟเวอร์ เพราะต้องอ่านค่า env */
  lineButton?: React.ReactNode;
  notice?: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">ประวัติการจองของฉัน</h1>
      <p className="text-sm text-slate-500 mb-6">
        เข้าสู่ระบบด้วย LINE เพื่อดูการจอง สถานะสลิป และเอกสารของคุณ
      </p>

      {notice && (
        <p className="mb-5 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          {notice}
        </p>
      )}

      {lineButton ?? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย LINE กรุณาติดต่อแอดมิน
        </p>
      )}

      <div className="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-500 leading-relaxed">
        เปิดจากคอมพิวเตอร์จะมี QR ให้สแกนด้วยมือถือหนึ่งครั้ง
        <br />
        ยังไม่เคยจอง?{" "}
        <Link href="/cars" className="text-blue-700 font-medium hover:underline">
          ดูรถทั้งหมด
        </Link>{" "}
        หรือ{" "}
        <a
          href={addFriendUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 font-medium hover:underline"
        >
          เพิ่มเพื่อน LINE ของร้าน
        </a>{" "}
        แล้วทักแชทมาได้เลย
      </div>
    </div>
  );
}
