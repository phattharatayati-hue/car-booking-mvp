export const dynamic = "force-dynamic";

import { requireStaff } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { BTN, NOTICE } from "@/lib/ui";
import AdminTabs from "@/components/AdminTabs";
import { SETTINGS_TABS } from "@/components/adminTabSets";
import {
  NOTIFICATIONS,
  notificationDef,
  minutesLabel,
  type NotifyMode,
  type NotificationDef,
} from "@/lib/notification-catalog";
import { getRules, saveRule, type Rule } from "@/lib/notification-rules";
import { sampleMessages } from "@/lib/notification-samples";
import LinePreview from "@/components/LinePreview";
import Link from "next/link";
import { lineMessageCatalog } from "@/lib/line-message-catalog";

const MODE_LABEL: Record<NotifyMode, string> = {
  instant: "ส่งทันที",
  before: "ส่งก่อนเวลานัด",
  daily: "ส่งทุกวันตามเวลา",
};

async function saveAction(formData: FormData) {
  "use server";
  await requireStaff();
  const key = String(formData.get("key") ?? "");
  const def = notificationDef(key);
  if (!def) redirect("/admin/notifications?error=key");

  const enabled = formData.get("enabled") === "on";
  const modeRaw = String(formData.get("mode") ?? def.defaults.mode) as NotifyMode;
  const mode = def.modes.includes(modeRaw) ? modeRaw : def.defaults.mode;

  const h = Math.floor(Number(formData.get("beforeHours") ?? 0));
  const m = Math.floor(Number(formData.get("beforeMins") ?? 0));
  const beforeMinutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  if (mode === "before" && (beforeMinutes < 15 || beforeMinutes > 7 * 24 * 60)) {
    redirect(`/admin/notifications?error=before#${key}`);
  }
  const dailyTime = String(formData.get("dailyTime") ?? def.defaults.dailyTime ?? "09:00");
  if (mode === "daily" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime)) {
    redirect(`/admin/notifications?error=time#${key}`);
  }

  await saveRule({
    key,
    enabled,
    mode,
    beforeMinutes: beforeMinutes || def.defaults.beforeMinutes || 60,
    dailyTime,
  });

  const detail = !enabled
    ? "ปิด"
    : mode === "before"
    ? `เปิด · ส่งก่อน ${minutesLabel(beforeMinutes)}`
    : mode === "daily"
    ? `เปิด · ส่งทุกวัน ${dailyTime} น.`
    : "เปิด · ส่งทันที";
  await audit({
    action: "settings.notification",
    summary: `ตั้งค่าแจ้งเตือน: ${def.title}`,
    entity: "notification",
    entityId: key,
    detail,
  });

  revalidatePath("/admin/notifications");
  redirect(`/admin/notifications?ok=1#${key}`);
}

const input =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500";

function RuleCard({ def, rule }: { def: NotificationDef; rule: Rule }) {
  const h = Math.floor(rule.beforeMinutes / 60);
  const m = rule.beforeMinutes % 60;
  const onlyInstant = def.modes.length === 1 && def.modes[0] === "instant";
  return (
    <form
      id={def.key}
      action={saveAction}
      className={`scroll-mt-24 rounded-2xl border p-5 ${
        rule.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-80"
      }`}
    >
      <input type="hidden" name="key" value={def.key} />
      <div className="grid gap-5 lg:grid-cols-[1fr_304px] items-start">
      <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{def.title}</p>
          <p className="text-sm text-slate-500 mt-0.5">{def.description}</p>
        </div>
        <label className="flex items-center gap-2 shrink-0 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="enabled" defaultChecked={rule.enabled} className="h-5 w-5 accent-emerald-600" />
          เปิดใช้
        </label>
      </div>

      {!onlyInstant && (
        <div className="mt-4 grid gap-3">
          {def.modes.map((mode) => (
            <label
              key={mode}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50/50"
            >
              <input
                type="radio"
                name="mode"
                value={mode}
                defaultChecked={rule.mode === mode}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="text-sm font-medium text-slate-800 w-36">{MODE_LABEL[mode]}</span>
              {mode === "before" && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="number" name="beforeHours" min={0} max={168} defaultValue={h} className={`${input} w-20`} />
                  ชม.
                  <input type="number" name="beforeMins" min={0} max={59} step={5} defaultValue={m} className={`${input} w-20`} />
                  นาที
                  <span className="text-xs text-slate-400">{def.beforeHint}</span>
                </span>
              )}
              {mode === "daily" && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="time" name="dailyTime" defaultValue={rule.dailyTime} className={input} />
                  น.
                  <span className="text-xs text-slate-400">{def.dailyHint}</span>
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          ตอนนี้:{" "}
          {!rule.enabled
            ? "ปิดอยู่"
            : rule.mode === "before"
            ? `ส่งก่อน ${minutesLabel(rule.beforeMinutes)}`
            : rule.mode === "daily"
            ? `ส่งทุกวัน ${rule.dailyTime} น.`
            : "ส่งทันทีเมื่อเกิดเหตุการณ์"}
        </p>
        <ActionButton className={`${BTN.ok} !py-2 text-sm`} pendingText="กำลังบันทึก…">
          บันทึก
        </ActionButton>
      </div>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">
          ตัวอย่างข้อความที่{def.audience === "customer" ? "ลูกค้า" : "แอดมิน"}ได้รับ
        </p>
        <LinePreview messages={sampleMessages(def.key)} />
      </div>
      </div>
    </form>
  );
}

const ERRORS: Record<string, string> = {
  before: "เวลาส่งล่วงหน้าต้องอยู่ระหว่าง 15 นาที ถึง 7 วัน",
  time: "รูปแบบเวลาไม่ถูกต้อง",
  key: "ไม่พบรายการแจ้งเตือนนี้",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; view?: string }>;
}) {
  await requireStaff();
  const { ok, error, view } = await searchParams;
  const showAll = view === "all";
  const rules = await getRules();
  const groups: { title: string; note: string; items: NotificationDef[] }[] = [
    {
      title: "แจ้งเตือนลูกค้า (LINE OA)",
      note: "ส่งถึงลูกค้าที่เข้าสู่ระบบด้วย LINE และเป็นเพื่อนกับร้าน",
      items: NOTIFICATIONS.filter((n) => n.audience === "customer"),
    },
    {
      title: "แจ้งเตือนแอดมิน",
      note: "ส่งถึงแอดมินและพนักงานทุกคนที่ผูก LINE ไว้ในหน้า บัญชีของฉัน",
      items: NOTIFICATIONS.filter((n) => n.audience === "admin"),
    },
  ];

  return (
    <div className="max-w-6xl">
      <AdminTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">การแจ้งเตือน LINE</h1>
        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
          เปิด/ปิด และตั้งเวลาการแจ้งเตือนแต่ละแบบ · แบบตั้งเวลาระบบเช็คทุก 5 นาที
          จึงอาจส่งช้ากว่าเวลาที่ตั้งได้ไม่เกิน 5 นาที · ข้อความที่แอดมินกดส่งเอง
          (อัปเดตการจอง ใบเสร็จ โอนเงินประกันคืน การ์ดงานคนขับ) ส่งตามปุ่มเสมอ ดูหน้าตาได้ที่แท็บตัวอย่างข้อความทั้งหมด
        </p>
      </div>
      {/* สลับระหว่างหน้าตั้งค่า กับหน้ารวมตัวอย่างข้อความทั้งหมด */}
      <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm">
        <Link
          href="/admin/notifications"
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showAll ? "text-slate-600 hover:text-slate-900" : "bg-blue-600 text-white"
          }`}
        >
          ตั้งค่าการแจ้งเตือน
        </Link>
        <Link
          href="/admin/notifications?view=all"
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showAll ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          ตัวอย่างข้อความทั้งหมด
        </Link>
      </div>

      {ok && <p className={`mb-4 rounded-xl border px-4 py-3 text-sm ${NOTICE.ok}`}>บันทึกแล้ว</p>}
      {error && (
        <p className="mb-4 rounded-xl border px-4 py-3 text-sm bg-red-50 border-red-200 text-red-800">
          {ERRORS[error] ?? "บันทึกไม่สำเร็จ"}
        </p>
      )}
      {showAll ? <MessageGallery /> : (
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-semibold text-slate-900">{g.title}</h2>
            <p className="text-xs text-slate-500 mb-3">{g.note}</p>
            <div className="space-y-3">
              {g.items.map((def) => (
                <RuleCard key={def.key} def={def} rule={rules[def.key]} />
              ))}
            </div>
          </section>
        ))}
      </div>
      )}
    </div>
  );
}

/**
 * รวมตัวอย่างข้อความ LINE ทุกแบบในระบบ — วาดจากฟังก์ชันตัวเดียวกับที่ส่งจริง
 * แก้การ์ดหรือถ้อยคำในโค้ดแล้ว deploy หน้านี้เปลี่ยนตามเอง ไม่ต้องส่งทดสอบเข้า LINE
 */
function MessageGallery() {
  const catalog = lineMessageCatalog();
  const total = catalog.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        ทั้งหมด {total} แบบ · ใช้ข้อมูลสมมติ หน้าตาใกล้เคียงในแอป LINE
        (ฟอนต์และระยะห่างอาจต่างเล็กน้อย)
      </p>

      {/* ทางลัดไปแต่ละกลุ่ม — หน้านี้ยาว */}
      <nav className="mb-8 flex flex-wrap gap-2">
        {catalog.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 hover:border-slate-300"
          >
            {g.title} <span className="text-slate-400">{g.items.length}</span>
          </a>
        ))}
      </nav>

      <div className="space-y-12">
        {catalog.map((g) => (
          <section key={g.id} id={g.id} className="scroll-mt-6">
            <h2 className="font-semibold text-slate-900 text-lg">{g.title}</h2>
            <p className="text-xs text-slate-500 mb-4">{g.note}</p>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(310px,1fr))]">
              {g.items.map((item) => (
                <article key={`${g.id}-${item.title}`} className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500 mb-2 leading-relaxed">{item.when}</p>
                  <LinePreview messages={item.messages} full />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
