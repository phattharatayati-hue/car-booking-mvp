export const dynamic = "force-dynamic";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { pushRaw, siteUrl } from "@/lib/line";
import { flexRefundPaid } from "@/lib/line-flex";
import { formatBangkokDateTime, getSettings } from "@/lib/settings";
import { refundNet, METHOD_LABEL, PURGED_LABEL } from "@/lib/refund";
import ActionButton from "@/components/ActionButton";
import CopyButton from "@/components/CopyButton";
import AutoRefresh from "@/components/AutoRefresh";
import { BTN, NOTICE } from "@/lib/ui";

/**
 * คิวคืนเงินประกัน
 *
 * เรียงตามกำหนดที่ต้องโอน (dueAt) ไม่ใช่ตามเวลาที่ลูกค้าแจ้ง — คนที่รีวิวแล้ว
 * มีกำหนด 1 ชั่วโมง จึงลอยขึ้นมาอยู่บนสุดเองโดยไม่ต้องแยกตารางสองอัน
 */

async function markPaidAction(formData: FormData) {
  "use server";
  const session = await requireStaff();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) redirect("/admin/refunds?error=missing");

  const refund = await prisma.depositRefund.findUnique({
    where: { bookingId },
    include: { booking: { include: { customer: true } } },
  });
  if (!refund) redirect("/admin/refunds?error=missing");
  if (refund.paidAt) redirect("/admin/refunds?error=already");
  if (!refund.accountNo) redirect("/admin/refunds?error=noaccount");

  const deductAmount = Math.floor(Number(formData.get("deductAmount") ?? 0));
  if (
    !Number.isFinite(deductAmount) ||
    deductAmount < 0 ||
    deductAmount > refund.depositAmount
  ) {
    redirect("/admin/refunds?error=deduct");
  }
  const deductReason = String(formData.get("deductReason") ?? "").trim() || null;
  if (deductAmount > 0 && !deductReason) {
    redirect("/admin/refunds?error=reason");
  }

  const net = refundNet(refund.depositAmount, deductAmount);
  const now = new Date();

  await prisma.depositRefund.update({
    where: { bookingId },
    data: {
      deductAmount,
      deductReason,
      paidAt: now,
      paidBy: session.user?.email ?? null,
    },
  });

  await audit({
    action: "refund.paid",
    summary: `โอนเงินประกันคืน ${net.toLocaleString()} บาท — การจอง ${bookingId
      .slice(0, 8)
      .toUpperCase()}`,
    entity: "booking",
    entityId: bookingId,
    // ไม่ใส่เลขบัญชี ออดิตเก็บถาวรแต่เลขบัญชีมีกำหนดลบ
    detail: deductAmount > 0 ? `หักไว้ ${deductAmount.toLocaleString()} บาท — ${deductReason}` : undefined,
  });

  const lineUserId = refund.booking.customer.lineUserId;
  if (lineUserId) {
    try {
      await pushRaw(lineUserId, [
        flexRefundPaid({
          bookingId,
          amount: net,
          deductAmount,
          deductReason,
          accountTail: refund.accountNo.slice(-4),
          bookingUrl: `${siteUrl()}/booking/${bookingId}`,
        }),
      ]);
    } catch (err) {
      console.error("notify refund paid failed:", err);
    }
  }

  revalidatePath("/admin/refunds");
  redirect("/admin/refunds?ok=paid");
}

const FLASH: Record<string, { text: string; tone: "ok" | "error" }> = {
  paid: { text: "บันทึกว่าโอนคืนแล้ว และแจ้งลูกค้าทาง LINE เรียบร้อย", tone: "ok" },
  missing: { text: "ไม่พบรายการคืนเงินนี้", tone: "error" },
  already: { text: "รายการนี้ถูกบันทึกว่าโอนแล้ว", tone: "error" },
  noaccount: { text: "ลูกค้ายังไม่ได้แจ้งบัญชี — โทรถามก่อนแล้วค่อยกดโอน", tone: "error" },
  deduct: { text: "ยอดหักต้องไม่ติดลบ และไม่เกินเงินประกันที่เก็บไว้", tone: "error" },
  reason: { text: "ถ้าหักเงิน ต้องระบุเหตุผลด้วย ลูกค้าจะได้เห็นว่าหักอะไร", tone: "error" },
};

function Countdown({ dueAt }: { dueAt: Date | null }) {
  if (!dueAt) return <span className="text-slate-400">ยังไม่แจ้งบัญชี</span>;
  const mins = Math.round((dueAt.getTime() - Date.now()) / 60000);
  if (mins < 0) {
    return (
      <span className="text-red-600 font-semibold">
        เลยกำหนด {Math.abs(mins) >= 60 ? `${Math.floor(Math.abs(mins) / 60)} ชม.` : `${Math.abs(mins)} นาที`}
      </span>
    );
  }
  return (
    <span className={mins <= 60 ? "text-amber-600 font-semibold" : "text-slate-600"}>
      เหลือ {mins >= 60 ? `${Math.floor(mins / 60)} ชม. ${mins % 60} นาที` : `${mins} นาที`}
    </span>
  );
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; show?: string }>;
}) {
  await requireStaff();
  const { ok, error, show } = await searchParams;
  const flash = FLASH[ok ?? ""] ?? FLASH[error ?? ""];
  const showPaid = show === "paid";

  const settings = await getSettings();

  const [pending, paidRecent, pendingCount] = await Promise.all([
    prisma.depositRefund.findMany({
      where: { paidAt: null },
      include: { booking: { include: { car: true, customer: true } } },
      // ยังไม่แจ้งบัญชี (dueAt ว่าง) ไปอยู่ท้ายสุด เพราะยังทำอะไรไม่ได้
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
      take: 100,
    }),
    showPaid
      ? prisma.depositRefund.findMany({
          where: { paidAt: { not: null } },
          include: { booking: { include: { car: true, customer: true } } },
          orderBy: { paidAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    prisma.depositRefund.count({ where: { paidAt: null, dueAt: { not: null } } }),
  ]);

  const rows = showPaid ? paidRecent : pending;

  return (
    <div>
      <AutoRefresh key={showPaid ? "paid" : "pending"} seconds={60} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">คืนเงินประกัน</h1>
        <p className="text-slate-500 text-sm mt-1">
          รอโอน {pendingCount} รายการ · คิวเรียงตามกำหนดที่สัญญากับลูกค้าไว้ ·
          นับเฉพาะเวลาทำการ {String(settings.refundOpenHour).padStart(2, "0")}:00-
          {String(settings.refundCloseHour).padStart(2, "0")}:00 น.
        </p>
      </div>

      {flash && (
        <div
          role="alert"
          aria-live="polite"
          className={`mb-5 text-sm border px-4 py-3 rounded-xl ${NOTICE[flash.tone]}`}
        >
          {flash.text}
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <Link
          href="/admin/refunds"
          prefetch={false}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !showPaid
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          รอโอน
        </Link>
        <Link
          href="/admin/refunds?show=paid"
          prefetch={false}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            showPaid
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          โอนแล้ว
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          {showPaid ? "ยังไม่มีรายการที่โอนคืนแล้ว" : "ไม่มีรายการรอโอนคืนตอนนี้"}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            const net = refundNet(r.depositAmount, r.deductAmount);
            const code = r.bookingId.slice(0, 8).toUpperCase();
            const purged = Boolean(r.purgedAt);

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {r.booking.customer.fullName}
                      {r.reviewed && (
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          ⭐ รีวิวแล้ว
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {r.booking.car.brand} {r.booking.car.name} ·{" "}
                      {r.booking.car.licensePlate} · {code}
                    </p>
                    <p className="text-sm text-slate-500">
                      <a
                        href={`tel:${r.booking.customer.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.booking.customer.phone}
                      </a>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">
                      {net.toLocaleString()} ฿
                    </p>
                    <p className="text-xs mt-0.5">
                      {r.paidAt ? (
                        <span className="text-emerald-600 font-medium">
                          โอนแล้ว {formatBangkokDateTime(r.paidAt)}
                        </span>
                      ) : (
                        <Countdown dueAt={r.dueAt} />
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  {!r.accountNo ? (
                    <p className="text-sm text-slate-500">
                      {purged
                        ? PURGED_LABEL
                        : "ลูกค้ายังไม่ได้แจ้งบัญชี — โทรถามแล้วกรอกให้แทนได้ที่ลิงก์ด้านล่าง"}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="text-slate-500">
                        {METHOD_LABEL[r.method ?? ""] ?? "-"}
                        {r.bankName ? ` · ${r.bankName}` : ""}
                      </span>
                      <span className="font-medium text-slate-900">
                        {r.accountName}
                      </span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {r.accountNo}
                      </span>
                      <CopyButton
                        value={r.accountNo}
                        label="คัดลอกเลขบัญชี"
                      />
                    </div>
                  )}
                </div>

                {r.deductAmount > 0 && (
                  <p className="mt-3 text-sm text-amber-700">
                    หักไว้ {r.deductAmount.toLocaleString()} บาท
                    {r.deductReason ? ` — ${r.deductReason}` : ""}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/booking/${r.bookingId}/refund`}
                    prefetch={false}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    เปิดหน้าแจ้งบัญชีของลูกค้า
                  </Link>
                  <Link
                    href={`/admin/bookings?q=${r.bookingId.slice(0, 8)}`}
                    prefetch={false}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    เปิดใบจอง
                  </Link>
                </div>

                {!r.paidAt && r.accountNo && (
                  <details className="mt-4 group/pay">
                    <summary className="cursor-pointer list-none text-sm font-medium text-slate-600 hover:text-slate-900 select-none">
                      <span className="inline-block transition-transform group-open/pay:rotate-90">
                        ›
                      </span>{" "}
                      โอนแล้ว / หักเงินประกัน
                    </summary>

                    <form
                      action={markPaidAction}
                      className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
                    >
                      <input type="hidden" name="bookingId" value={r.bookingId} />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            className="block text-xs text-slate-500 mb-1"
                            htmlFor={`deduct-${r.id}`}
                          >
                            หักจากเงินประกัน (บาท)
                          </label>
                          <input
                            id={`deduct-${r.id}`}
                            name="deductAmount"
                            type="number"
                            min="0"
                            max={r.depositAmount}
                            defaultValue={r.deductAmount}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                          <p className="text-xs text-slate-400 mt-1">
                            เงินประกันที่เก็บไว้ {r.depositAmount.toLocaleString()} บาท
                          </p>
                        </div>
                        <div>
                          <label
                            className="block text-xs text-slate-500 mb-1"
                            htmlFor={`reason-${r.id}`}
                          >
                            หักเพราะอะไร (บังคับถ้าหัก)
                          </label>
                          <input
                            id={`reason-${r.id}`}
                            name="deductReason"
                            maxLength={200}
                            defaultValue={r.deductReason ?? ""}
                            placeholder="เช่น น้ำมันขาด 2 ขีด"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">
                        กดปุ่มนี้หลังโอนเงินจริงแล้วเท่านั้น —
                        ระบบจะแจ้งลูกค้าทาง LINE ทันทีว่าโอนคืนแล้ว
                        พร้อมแจกแจงยอดที่หัก
                      </p>

                      <ActionButton
                        className={BTN.ok}
                        pendingText="กำลังบันทึก…"
                        confirm={`ยืนยันว่าโอนเงินคืนให้ ${r.booking.customer.fullName} แล้ว?\n\nระบบจะแจ้งลูกค้าทาง LINE ทันที`}
                      >
                        โอนแล้ว — แจ้งลูกค้า
                      </ActionButton>
                    </form>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
