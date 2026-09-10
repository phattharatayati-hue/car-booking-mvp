import AssignSubmit from "@/components/AssignSubmit";
import ActionButton from "@/components/ActionButton";
import { CONFIRM } from "@/lib/ui";
import {
  assignBothAction,
  unassignAction,
  resyncAction,
  resendAction,
} from "@/app/admin/assignments/actions";
import { formatBangkokTime, formatBangkokDateTime, bangkokDateStr } from "@/lib/settings";
import {
  HANDOFF_KINDS,
  HANDOFF_LABEL,
  HANDOFF_CLASS,
  defaultMeetAt,
  defaultPlace,
  syncBadge,
  syncErrorText,
  type HandoffKind,
} from "@/lib/assignments";

type AdminOption = { id: string; name: string; googleConnectedAt: Date | null };

type AssignmentRow = {
  id: string;
  kind: string;
  adminUserId: string;
  meetAt: Date;
  place: string | null;
  note: string | null;
  googleEventId: string | null;
  syncError: string | null;
  ackedAt: Date | null;
  doneAt: Date | null;
  odometer: number | null;
  fuelLevel: string | null;
  photos: { id: string; fileUrl: string }[];
  admin: { name: string; lineUserId: string | null };
};

/**
 * กล่องมอบหมายงานรับ-ส่งรถ ในการ์ดการจองแต่ละใบ
 * มอบหมายได้หลายคนต่อหนึ่งงาน และคนละคนกันระหว่างงานส่งกับงานรับ
 */
export default function AssignmentBox({
  booking,
  admins,
  assignments,
}: {
  booking: {
    id: string;
    startDate: Date;
    endDate: Date;
    pickupPlace: string | null;
    returnPlace: string | null;
  };
  admins: AdminOption[];
  assignments: AssignmentRow[];
}) {
  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">คนส่งและรับรถ</h3>
        <span className="text-xs text-slate-400">กรอกทั้งสองงาน แล้วกดมอบหมายครั้งเดียว</span>
      </div>

      {/* ฟอร์มเดียวครอบทั้งงานส่งและงานรับคืน — ปุ่มมอบหมายอยู่ล่างสุดปุ่มเดียว
          ปุ่มถอน/ซิงก์ใหม่ใช้ formAction ของตัวเอง จึงไม่ต้องซ้อนฟอร์ม (HTML ห้ามซ้อน) */}
      <form action={assignBothAction}>
        <input type="hidden" name="bookingId" value={booking.id} />

        <div className="grid sm:grid-cols-2 gap-3">
        {HANDOFF_KINDS.map((kind) => {
          const rows = assignments.filter((a) => a.kind === kind);
          const fallbackAt = defaultMeetAt(booking, kind as HandoffKind);
          const fallbackPlace = defaultPlace(booking, kind as HandoffKind);

          return (
            <div key={kind} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${HANDOFF_CLASS[kind]}`}
                >
                  {HANDOFF_LABEL[kind]}
                </span>
                <span className="text-xs text-slate-400">
                  นัด {formatBangkokTime(rows[0]?.meetAt ?? fallbackAt)} น.
                </span>
              </div>

              {/* คนที่รับงานแล้ว */}
              {rows.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-2.5">
                  ยังไม่มีคนรับงานนี้
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 mb-2.5">
                  {rows.map((a) => {
                    const badge = syncBadge(a);
                    return (
                      <li
                        key={a.id}
                        className="flex items-start gap-2 text-sm bg-slate-50 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="text-slate-900 font-medium">{a.admin.name}</span>
                          {a.place && (
                            <span className="block text-xs text-slate-500 truncate">
                              {a.place}
                            </span>
                          )}
                          <span className={`block text-[11px] ${badge.className}`}>
                            {badge.label}
                            {a.syncError && (
                              <span className="block text-slate-500">
                                {syncErrorText(a.syncError)}
                              </span>
                            )}
                          </span>

                          {/* ส่งการ์ดงานเข้าแชทไม่ได้ ถ้าเขายังไม่ผูก LINE */}
                          {!a.admin.lineUserId && (
                            <span className="block text-[11px] text-red-600 font-medium">
                              ยังไม่ผูก LINE — ส่งแจ้งเตือนไม่ถึงตัว
                            </span>
                          )}

                          {/* คนรับ-ส่งรถกดปุ่มรับทราบในแชท LINE แล้วหรือยัง */}
                          {a.ackedAt ? (
                            <span className="block text-[11px] text-emerald-700">
                              ✓ รับทราบแล้ว {formatBangkokDateTime(a.ackedAt)}
                            </span>
                          ) : (
                            <span className="block text-[11px] text-amber-700">
                              ⏳ ยังไม่กดรับทราบ
                            </span>
                          )}

                          {/* คนรับ-ส่งรถกดปิดงานและส่งข้อมูลกลับมาจากแชท LINE */}
                          {a.doneAt && (
                            <span className="block text-[11px] text-emerald-700 font-medium">
                              ✓ ปิดงานแล้ว {formatBangkokDateTime(a.doneAt)}
                            </span>
                          )}
                          {(a.odometer !== null || a.fuelLevel) && (
                            <span className="block text-[11px] text-slate-500">
                              {[
                                a.odometer !== null
                                  ? `เลขไมล์ ${a.odometer.toLocaleString()} กม.`
                                  : null,
                                a.fuelLevel ? `น้ำมัน ${a.fuelLevel}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          {a.photos.length > 0 && (
                            /* ขยายจาก 48px เป็น 88px — เดิมเล็กจนดูไม่ออกว่ารูปอะไร
                               แอดมินต้องดูรอยขีดข่วนจากรูปพวกนี้เวลามีข้อโต้แย้ง */
                            <span className="block mt-2">
                              <span className="block text-[11px] text-slate-400 mb-1">
                                รูปสภาพรถ {a.photos.length} รูป — กดเพื่อดูขนาดเต็ม
                              </span>
                              <span className="flex flex-wrap gap-2">
                              {a.photos.map((ph) => (
                                <a
                                  key={ph.id}
                                  href={ph.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="รูปสภาพรถจากคนรับ-ส่งรถ"
                                  className="block w-[88px] h-[88px] rounded-lg overflow-hidden border border-slate-200 bg-white hover:border-blue-400 transition-colors"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ph.fileUrl}
                                    alt="สภาพรถ"
                                    data-no-dim
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ))}
                              </span>
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {a.syncError && (
                            <button
                              type="submit"
                              formAction={resyncAction}
                              name="assignmentId"
                              value={a.id}
                              className="text-xs text-blue-700 hover:underline"
                            >
                              ลองซิงก์ใหม่
                            </button>
                          )}
                          <ActionButton
                            formAction={resendAction}
                            name="assignmentId"
                            value={a.id}
                            pendingText="กำลังส่ง…"
                            confirm={CONFIRM.sendLine(`การ์ดงานถึง ${a.admin.name} อีกครั้ง`)}
                            className="min-h-0 text-xs text-blue-700 hover:underline disabled:opacity-60"
                          >
                            ส่งซ้ำ
                          </ActionButton>
                          <ActionButton
                            formAction={unassignAction}
                            name="assignmentId"
                            value={a.id}
                            pendingText="กำลังถอน…"
                            confirm={`ถอน ${a.admin.name} ออกจากงานนี้\nระบบจะแจ้งเจ้าตัวทาง LINE และลบนัดออกจากปฏิทิน\n\nยืนยันหรือไม่?`}
                            className="min-h-0 text-xs text-slate-400 hover:text-red-600 transition-colors disabled:opacity-60"
                          >
                            ถอน
                          </ActionButton>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* เพิ่มคน — ชื่อฟิลด์ขึ้นต้นด้วยชนิดงาน เพื่อให้ฟอร์มเดียวส่งได้ทั้งสองงาน */}
              <div className="flex flex-col gap-2">
                <label htmlFor={`${booking.id}-${kind}-admin`} className="sr-only">
                  ผู้รับงาน
                </label>
                <select
                  id={`${booking.id}-${kind}-admin`}
                  name={`${kind}_adminUserId`}
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value="">— ไม่มอบหมายงานนี้ —</option>
                  {admins.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.name}
                      {ad.googleConnectedAt ? "" : " (ยังไม่เชื่อมปฏิทิน)"}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                  <div>
                  <label
                    htmlFor={`${booking.id}-${kind}-date`}
                    className="block text-[11px] font-medium text-slate-500 mb-1"
                  >
                    วันนัด
                  </label>
                  <input
                    id={`${booking.id}-${kind}-date`}
                    name={`${kind}_meetDate`}
                    type="date"
                    defaultValue={bangkokDateStr(fallbackAt)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                  </div>
                  <div>
                  <label
                    htmlFor={`${booking.id}-${kind}-time`}
                    className="block text-[11px] font-medium text-slate-500 mb-1"
                  >
                    เวลานัด
                  </label>
                  <input
                    id={`${booking.id}-${kind}-time`}
                    name={`${kind}_meetTime`}
                    type="text"
                    inputMode="numeric"
                    placeholder="09:00"
                    defaultValue={formatBangkokTime(fallbackAt)}
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    title="เวลาแบบ 24 ชั่วโมง เช่น 09:00 หรือ 21:30"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                  </div>
                </div>

                {/* เติมจุดนัดจากที่ลูกค้าเลือกไว้ตอนจองให้เลย แก้ทับได้ถ้าตกลงกันใหม่ */}
                <label htmlFor={`${booking.id}-${kind}-place`} className="sr-only">
                  จุดนัด
                </label>
                <input
                  id={`${booking.id}-${kind}-place`}
                  name={`${kind}_place`}
                  defaultValue={fallbackPlace ?? ""}
                  placeholder="จุดนัด"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
                {fallbackPlace && (
                  <p className="-mt-1 text-[11px] text-slate-400">
                    จุดที่ลูกค้าเลือกไว้ตอนจอง — แก้ได้ถ้าตกลงกันใหม่
                  </p>
                )}
                <label htmlFor={`${booking.id}-${kind}-note`} className="sr-only">
                  หมายเหตุถึงคนรับ-ส่งรถ
                </label>
                <input
                  id={`${booking.id}-${kind}-note`}
                  name={`${kind}_note`}
                  placeholder="หมายเหตุ เช่น ลูกค้าขอให้โทรก่อน"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />

              </div>
            </div>
          );
        })}
        </div>

        <AssignSubmit />
        <p className="text-xs text-slate-400 mt-2 text-center">
          กดซ้ำได้ — ถ้าไม่ได้แก้อะไร ระบบจะส่งการ์ดงานเดิมเข้าแชทอีกครั้ง ·
          ปฏิทินจะกันเวลาเดินทางให้ 30 นาที
          — นัด 09:00 น. จะลงปฏิทินเป็น 08:30-09:30 น.
        </p>
      </form>
    </div>
  );
}
