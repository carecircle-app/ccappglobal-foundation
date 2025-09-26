// src/app/api/tasks/route.ts
import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
export const dynamic = "force-dynamic"; // no caching in dev

// GET /api/tasks → proxy to backend
export async function GET() {
  try {
    const r = await fetch(`${API}/api/tasks`, { cache: "no-store" });
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

// POST /api/tasks → accepts EITHER your custom shape OR the backend shape
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    let body: any = {};
    try { body = JSON.parse(raw); } catch { /* leave as string */ }

    // If it's your custom payload, map to backend shape
    if (typeof body === "object" && body && "taskTitle" in body && "taskType" in body && "taskDate" in body) {
      const mapped = {
        title: String(body.taskTitle),
        assignees: Array.isArray(body.assignees) ? body.assignees : [], // optional
        due: String(body.taskDate),                                     // yyyy-mm-dd
        note: typeof body.note === "string" ? body.note : undefined,
      };
      const r = await fetch(`${API}/api/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mapped),
        cache: "no-store",
      });
      const text = await r.text();
      try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
      catch { return new NextResponse(text, { status: r.status }); }
    }

    // Otherwise, pass the body straight through to backend
    const r = await fetch(`${API}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
      cache: "no-store",
    });
    const text = await r.text();
    try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
    catch { return new NextResponse(text, { status: r.status }); }
  } catch (err: any) {
    return NextResponse.json({ error: "proxy_failed", detail: String(err) }, { status: 502 });
  }
}
