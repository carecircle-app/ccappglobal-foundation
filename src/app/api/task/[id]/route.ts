// src/app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
export const dynamic = "force-dynamic";

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  try {
    const r = await fetch(`${API}/api/tasks/${params.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: await _.text(),
      cache: "no-store",
    });
    const text = await r.text();
    try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
    catch { return new NextResponse(text, { status: r.status }); }
  } catch (err: any) {
    return NextResponse.json({ error: "proxy_failed", detail: String(err) }, { status: 502 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const r = await fetch(`${API}/api/tasks/${params.id}`, { method: "DELETE", cache: "no-store" });
    const text = await r.text();
    try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
    catch { return new NextResponse(text, { status: r.status }); }
  } catch (err: any) {
    return NextResponse.json({ error: "proxy_failed", detail: String(err) }, { status: 502 });
  }
}
