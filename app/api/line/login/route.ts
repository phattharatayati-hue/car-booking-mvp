import { NextResponse } from "next/server";
import {
  LINE_STATE_COOKIE,
  STATE_TTL_MS,
  authorizeUrl,
  lineLoginReady,
  newState,
  packState,
  safeNext,
} from "@/lib/line-login";

export const dynamic = "force-dynamic";

/**
 * เริ่มขั้นตอนเข้าสู่ระบบด้วย LINE
 * /api/line/login?next=/cars/xxx/book  →  เด้งไปหน้ายินยอมของ LINE
 */
export async function GET(request: Request) {
  if (!lineLoginReady()) {
    return NextResponse.redirect(new URL("/my?e=line_off", request.url));
  }

  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const state = newState(next);

  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(LINE_STATE_COOKIE, packState(state), {
    httpOnly: true,
    sameSite: "lax", // ต้องเป็น lax ไม่ใช่ strict ไม่งั้นคุกกี้หายตอนกลับจาก LINE
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(STATE_TTL_MS / 1000),
  });
  return res;
}
