import { NextResponse } from "next/server";
import { getAuthConfig } from "../../../../lib/config/auth";

export async function GET() {
  const config = getAuthConfig();
  return NextResponse.json({ provider: config.provider, authenticated: false });
}
