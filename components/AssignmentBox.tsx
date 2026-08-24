import {
  assignAction,
  unassignAction,
  resyncAction,
} from "@/app/admin/assignments/actions";
import { formatBangkokTime, bangkokDateStr } from "@/lib/settings";
import {
  HANDOFF_KINDS,
  HANDOFF_LABEL,
  HANDOFF_CLASS,
  defaultMeetAt,
  defaultPlace,
  syncBadge,
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
  admin: { name: string };
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
        <h3 className="text-sm font-semibold text-slate-900">ใครไปส่ง ใครไปรับ</h3>
        <span className="text-xs text-slate-400">มอบหมายได้หลายคนต่องาน</span>
      </div>

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
                        className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-2.5 py-1.5"
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
                              <span className="block text-slate-400 truncate">
                                {a.syncError}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {a.syncError && (
                            <form action={resyncAction}>
                              <input type="hidden" name="assignmentId" value={a.id} />
                              <button className="text-xs text-blue-700 hover:underline">
                                ลองซิงก์ใหม่
                              </button>
                            </form>
                          )}
                          <form action={unassignAction}>
                            <input type="hidden" name="assignmentId" value={a.id} />
                            <button className="text-xs text-slate-400 hover:text-red-600 transition-colors">
                              ถอน
                            </button>
                          </form>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* เพิ่มคน */}
              <form action={assignAction} className="flex flex-col gap-2">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="kind" value={kind} />

                <select
                  name="adminUserId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value="" disabled>
                    เลือกแอดมิน...
                  </option>
                  {admins.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.name}
                      {ad.googleConnectedAt ? "" : " (ยังไม่เชื่อมปฏิทิน)"}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="meetDate"
                    type="date"
                    defaultValue={bangkokDateStr(fallbackAt)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                  <input
                    name="meetTime"
                    type="text"
                    inputMode="numeric"
                    placeholder="09:00"
                    defaultValue={formatBangkokTime(fallbackAt)}
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    title="เวลาแบบ 24 ชั่วโมง เช่น 09:00 หรือ 21:30"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>

                <input
                  name="place"
                  placeholder={fallbackPlace ?? "จุดนัด"}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
                <input
                  name="note"
                  placeholder="หมายเหตุ เช่น ลูกค้าขอให้โทรก่อน"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />

                <button className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors">
                  มอบหมายและแจ้งทาง LINE
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-2.5">
        ปฏิทินจะกันเวลาเดินทางให้ 30 นาที — นัด 09:00 น. จะลงปฏิทินเป็น 08:30-09:30 น.
      </p>
    </div>
  );
}
