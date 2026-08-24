import { decryptSecret } from "@/lib/crypto";

/**
 * คุยกับ Google Calendar API ด้วย refresh token ของแอดมินแต่ละคน
 *
 * ขอ scope เดียว: calendar.app.created
 * — สร้างปฏิทินของแอปเองได้ และจัดการ event ในปฏิทินนั้นได้เท่านั้น
 * เข้าไม่ถึงปฏิทินอื่นของแอดมินเลย (least privilege)
 */
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
export const CALENDAR_NAME = "งานรับส่งรถ · CM Car Rent";
const API = "https://www.googleapis.com/calendar/v3";
const TZ = "Asia/Bangkok";

export function oauthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_TOKEN_ENC_KEY
  );
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/google/callback`;
}

/** ลิงก์หน้าขออนุญาตของ Google */
export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  return (await res.json()) as TokenResponse;
}

/** แลก code จาก callback เป็น refresh token */
export async function exchangeCode(code: string) {
  const data = await tokenRequest({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  if (!data.refresh_token) {
    throw new Error(data.error_description || data.error || "ไม่ได้รับ refresh token");
  }
  return data;
}

/** เอา refresh token ที่เก็บไว้ (เข้ารหัสอยู่) ไปขอ access token ใหม่ */
export async function accessTokenFor(encryptedRefreshToken: string): Promise<string> {
  const data = await tokenRequest({
    refresh_token: decryptSecret(encryptedRefreshToken),
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || "ขอ access token ไม่สำเร็จ");
  }
  return data.access_token;
}

/** ยกเลิกสิทธิ์ที่ฝั่ง Google */
export async function revokeToken(encryptedRefreshToken: string) {
  const token = decryptSecret(encryptedRefreshToken);
  // ส่งใน body ไม่ใช่ query string — query มักถูกเก็บใน log ของ proxy ระหว่างทาง
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  });
}

async function api<T>(
  accessToken: string,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

/** อีเมลของบัญชีที่เพิ่งเชื่อม (จาก userinfo) */
export async function googleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

/** สร้างปฏิทินแยกชื่อ "งานรับส่งรถ" — คืน calendarId */
export async function createAppCalendar(accessToken: string): Promise<string> {
  const cal = await api<{ id: string }>(accessToken, "/calendars", {
    method: "POST",
    body: { summary: CALENDAR_NAME, timeZone: TZ },
  });
  return cal.id;
}

export type CalendarEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  /** นาทีที่ให้เตือนล่วงหน้า */
  reminders?: number[];
  /** เก็บ id งานมอบหมายไว้กับ event เพื่อไล่ย้อนได้ */
  assignmentId?: string;
};

function toBody(e: CalendarEventInput) {
  return {
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: { dateTime: e.start.toISOString(), timeZone: TZ },
    end: { dateTime: e.end.toISOString(), timeZone: TZ },
    reminders: {
      useDefault: false,
      overrides: (e.reminders ?? [1440, 60]).map((minutes) => ({
        method: "popup",
        minutes,
      })),
    },
    ...(e.assignmentId
      ? { extendedProperties: { private: { assignmentId: e.assignmentId } } }
      : {}),
  };
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  e: CalendarEventInput
): Promise<string> {
  const created = await api<{ id: string }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: toBody(e) }
  );
  return created.id;
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  e: CalendarEventInput
) {
  await api(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: toBody(e) }
  );
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  try {
    await api(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" }
    );
  } catch (err) {
    // event ถูกลบไปแล้วก็ถือว่าสำเร็จ
    if (err instanceof Error && /\b(404|410)\b/.test(err.message)) return;
    throw err;
  }
}
