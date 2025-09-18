// src/app/api/stripe/checkout/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_DISABLED = process.env.STRIPE_DISABLED === '1';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

function baseFromRequest(req: Request) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
}

export async function GET(req: Request) {
  if (STRIPE_DISABLED) {
    return NextResponse.json({ error: 'payments temporarily disabled' }, { status: 503 });
  }
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const priceId = url.searchParams.get('priceId');
    const mode = (url.searchParams.get('mode') || 'subscription') as 'subscription' | 'payment';
    if (!priceId) return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });

    // Validate price early
    await stripe.prices.retrieve(priceId);

    const BASE =
      (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '') || baseFromRequest(req);
    const success_url = `${BASE}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${BASE}/#pricing`;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      ...(mode === 'payment'
        ? { customer_creation: 'always', invoice_creation: { enabled: true } }
        : {}),
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (err: any) {
    console.error('[stripe checkout]', err?.message || err);
    return NextResponse.json({ error: err?.message ?? 'checkout error' }, { status: 500 });
  }
}



