// src/app/api/stripe/donate/route.ts
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

// supports priceId (preferred), or amount in cents for one-time
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
    const amount = url.searchParams.get('amount'); // cents, when no priceId

    const BASE =
      (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '') || baseFromRequest(req);
    const success_url = `${BASE}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${BASE}/#donate`;

    let session: Stripe.Checkout.Session;

    if (priceId) {
      // monthly or pre-defined one-time price
      await stripe.prices.retrieve(priceId);
      session = await stripe.checkout.sessions.create({
        mode: 'payment', // one-time by default for donate; change to 'subscription' if monthly price
        line_items: [{ price: priceId, quantity: 1 }],
        success_url,
        cancel_url,
        customer_creation: 'always',
        invoice_creation: { enabled: true },
      });
    } else if (amount) {
      const cents = Math.max(100, parseInt(amount, 10) || 0);
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: cents,
            product_data: { name: 'Donation' },
          },
        }],
        success_url,
        cancel_url,
        customer_creation: 'always',
        invoice_creation: { enabled: true },
      });
    } else {
      return NextResponse.json({ error: 'Provide priceId or amount' }, { status: 400 });
    }

    return NextResponse.redirect(session.url!, 303);
  } catch (err: any) {
    console.error('[stripe donate]', err?.message || err);
    return NextResponse.json({ error: err?.message ?? 'donate error' }, { status: 500 });
  }
}
