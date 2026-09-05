import {
  assignBothAction,
  unassignAction,
  resyncAction,
} from "@/app/admin/assignments/actions";
import { formatBangkokTime, formatBangkokDateTime, bangkokDateStr } from "@/lib/settings";
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
  ackedAt: Date | null;
  doneAt: Date | null;
  odometer: number | null;
  fuelLevel: string | null;
  photos: { id: string; fileUrl: string }[];
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
                              <span className="block text-slate-400 truncate">
                                {a.syncError}
                              </span>
                            )}
                          </span>

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
                            <span className="flex flex-wrap gap-1.5 mt-1.5">
                              {a.photos.map((ph) => (
                                <a
                                  key={ph.id}
                                  href={ph.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="รูปสภาพรถจากคนรับ-ส่งรถ"
                                  className="block w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ph.fileUrl}
                                    alt="สภาพรถ"
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ))}
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
                          <button
                            type="submit"
                            formAction={unassignAction}
                            name="assignmentId"
                            value={a.id}
                            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                          >
                            ถอน
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* เพิ่มคน — ชื่อฟิลด์ขึ้นต้นด้วยชนิดงาน เพื่อให้ฟอร์มเดียวส่งได้ทั้งสองงาน */}
              <div className="flex flex-col gap-2">
                <select
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

                <div className="grid grid-cols-2 gap-2">
                  <input
                    name={`${kind}_meetDate`}
                    type="date"
                    defaultValue={bangkokDateStr(fallbackAt)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                  <input
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

                {/* เติมจุดนัดจากที่ลูกค้าเลือกไว้ตอนจองให้เลย แก้ทับได้ถ้าตกลงกันใหม่ */}
                <input
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
                <input
                  name={`${kind}_note`}
                  placeholder="หมายเหตุ เช่น ลูกค้าขอให้โทรก่อน"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />

              </div>
            </div>
          );
        })}
        </div>

        <button className="w-full mt-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors">
          มอบหมายและแจ้งทาง LINE
        </button>
        <p className="text-xs text-slate-400 mt-2 text-center">
          เลือกเฉพาะงานที่ต้องการมอบหมายก็ได้ · ปฏิทินจะกันเวลาเดินทางให้ 30 นาที
          — นัด 09:00 น. จะลงปฏิทินเป็น 08:30-09:30 น.
        </p>
      </form>
    </div>
  );
}
