import { prisma } from "@/lib/prisma";
import { NOTIFICATIONS, notificationDef, type NotifyMode } from "@/lib/notification-catalog";

export type Rule = {
  key: string;
  enabled: boolean;
  mode: NotifyMode;
  beforeMinutes: number;
  dailyTime: string;
  lastRunAt: Date | null;
};

type Row = {
  key: string;
  enabled: boolean;
  mode: string;
  beforeMinutes: number | null;
  dailyTime: string | null;
  lastRunAt: Date | null;
};

function merge(key: string, row?: Row | null): Rule {
  const def = notificationDef(key);
  const d = def?.defaults ?? { enabled: true, mode: "instant" as NotifyMode };
  const mode = (row?.mode as NotifyMode) ?? d.mode;
  return {
    key,
    enabled: row?.enabled ?? d.enabled,
    mode: def && def.modes.includes(mode) ? mode : d.mode,
    beforeMinutes: row?.beforeMinutes ?? d.beforeMinutes ?? 60,
    dailyTime: row?.dailyTime ?? d.dailyTime ?? "09:00",
    lastRunAt: row?.lastRunAt ?? null,
  };
}

/* ตาราง NotificationRule อาจยังไม่มีถ้ายังไม่ได้ db push — ห้ามทำให้การส่ง LINE พัง ใช้ค่าเริ่มต้นแทน */
const table = () => (prisma as unknown as { notificationRule?: { findMany: Function; findUnique: Function; upsert: Function; update: Function } }).notificationRule;

export async function getRules(): Promise<Record<string, Rule>> {
  let rows: Row[] = [];
  try {
    rows = (await table()?.findMany()) ?? [];
  } catch {
    rows = [];
  }
  const out: Record<string, Rule> = {};
  for (const n of NOTIFICATIONS) out[n.key] = merge(n.key, rows.find((r) => r.key === n.key));
  return out;
}

export async function getRule(key: string): Promise<Rule> {
  try {
    const row = (await table()?.findUnique({ where: { key } })) as Row | null;
    return merge(key, row);
  } catch {
    return merge(key, null);
  }
}

/** ใช้ครอบจุดส่งแบบทันที: if (await notifyOn("admin_slip_uploaded")) { ... } */
export async function notifyOn(key: string): Promise<boolean> {
  return (await getRule(key)).enabled;
}

export async function saveRule(r: Omit<Rule, "lastRunAt">): Promise<void> {
  await table()?.upsert({
    where: { key: r.key },
    create: { key: r.key, enabled: r.enabled, mode: r.mode, beforeMinutes: r.beforeMinutes, dailyTime: r.dailyTime },
    update: { enabled: r.enabled, mode: r.mode, beforeMinutes: r.beforeMinutes, dailyTime: r.dailyTime },
  });
}

export async function markRun(key: string, at = new Date()): Promise<void> {
  try {
    await table()?.upsert({
      where: { key },
      create: { ...merge(key, null), lastRunAt: at },
      update: { lastRunAt: at },
    });
  } catch (err) {
    console.error("markRun failed:", err);
  }
}

/* ---------- เวลาไทย ---------- */
const BKK = 7 * 3600000;

/** วันที่ (YYYY-MM-DD) ตามเวลาไทย */
export function bkkDay(d: Date): string {
  return new Date(d.getTime() + BKK).toISOString().slice(0, 10);
}

/** Date ของวันที่ YYYY-MM-DD เวลา HH:MM ไทย */
export function bkkAt(day: string, hhmm: string): Date {
  return new Date(`${day}T${hhmm}:00+07:00`);
}

/** แบบรายวัน: ถึงเวลาส่งของวันนี้แล้ว และวันนี้ยังไม่ได้ส่ง */
export function dailyDue(rule: Rule, now = new Date()): boolean {
  if (!rule.enabled || rule.mode !== "daily") return false;
  const today = bkkDay(now);
  if (now < bkkAt(today, rule.dailyTime)) return false;
  return !rule.lastRunAt || bkkDay(rule.lastRunAt) !== today;
}
