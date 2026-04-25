import { NextResponse } from "next/server";
import { getAuthConfig } from "../../../../lib/config/auth";

export async function POST() {
  const config = getAuthConfig();
  return NextResponse.json({ refreshed: false, provider: config.provider, ttlSeconds: config.ttlSeconds });
}
