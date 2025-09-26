// src/app/api/plan/route.ts
import { NextResponse } from "next/server";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await fetch(`${API}/api/plan`, { cache: "no-store" });
    const text = await r.text();
    try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
    catch {
      return new NextResponse(text, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") || "text/plain" },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "proxy_failed", detail: String(err) }, { status: 502 });
  }
}
