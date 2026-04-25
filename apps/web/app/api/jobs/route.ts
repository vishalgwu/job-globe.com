import { NextResponse } from "next/server"; export async function GET() { return NextResponse.json({ jobs: [], source: "step-1-placeholder" }); }
