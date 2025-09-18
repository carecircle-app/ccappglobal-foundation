// src/app/api/parental/enforce/route.ts
import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const r = await fetch(`${API}/api/parental/enforce`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await r.text();
    try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
    catch { return new NextResponse(text, { status: r.status }); }
  } catch (err: any) {
    return NextResponse.json({ error: "proxy_failed", detail: String(err) }, { status: 502 });
  }
}
