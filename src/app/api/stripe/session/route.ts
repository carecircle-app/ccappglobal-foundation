export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';import Stripe from 'stripe';
import "server-only";
import { stripe } from "@/lib/stripe";
// GET /api/stripe/session?id=cs_test_...
export async function GET(req: Request) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ["payment_intent.charges", "invoice", "subscription"],
    });

    return NextResponse.json(session, { status: 200 });
  } catch (err) {
    console.error("session GET error", err);
    return NextResponse.json({ error: "Retrieve failed" }, { status: 500 });
  }
}

export async function POST() {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}





