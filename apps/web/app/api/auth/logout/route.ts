import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(process.env.SESSION_COOKIE_NAME ?? "job_globe_session");
  return response;
}
