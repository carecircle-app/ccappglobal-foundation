// src/lib/stripe.ts
import Stripe from 'stripe';

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';

// Safe: null when key missing, avoids build/runtime crashes
export const stripe: Stripe | null = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Optional helper (kept for compatibility if you used it)
export function assertServer() { /* no-op */ }
