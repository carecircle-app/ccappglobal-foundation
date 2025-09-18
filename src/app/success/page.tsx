// src/app/success/page.tsx
import 'server-only';
import { stripe } from '@/lib/stripe';

type SearchParams = { session_id?: string };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sid = searchParams.session_id;

  // If user hits /success directly (no session_id)
  if (!sid) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Thank you!</h1>
        <p className="mt-2 text-slate-600">
          Payment completed. No session reference found—please return from Checkout to see your invoice/receipt.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href="/" className="inline-flex items-center rounded-full border px-4 py-2">← Back to Home</a>
          <a href="/admin" className="inline-flex items-center rounded-full border px-4 py-2">Go to Admin</a>
        </div>
      </main>
    );
  }

  // Load Checkout Session and prefer hosted invoice (subs). Fallback to receipt (one-time).
  const session = await stripe!.checkout.sessions.retrieve(sid, {
    expand: ['payment_intent.charges', 'invoice'],
  });

  let invoiceUrl: string | undefined;
  let receiptUrl: string | undefined;

  if (session.invoice) {
    if (typeof session.invoice === 'string') {
      const inv = await stripe!.invoices.retrieve(session.invoice);
      invoiceUrl = inv.hosted_invoice_url || (inv as any).invoice_pdf || undefined;
    } else {
      const inv = session.invoice;
      invoiceUrl = inv.hosted_invoice_url || (inv as any).invoice_pdf || undefined;
    }
  }

  if (!invoiceUrl && session.payment_intent && typeof session.payment_intent !== 'string') {
    const ch = (session.payment_intent as any)?.charges?.data?.[0];
    receiptUrl = ch?.receipt_url || undefined;
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Thank you!</h1>
      <p className="mt-2 text-slate-600">Your payment was successful. Your plan will be active shortly.</p>

      {/* Stripe link + return buttons in one row */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {invoiceUrl && (
          <a href={invoiceUrl} target="_blank" rel="noreferrer"
             className="inline-flex items-center rounded-full border px-4 py-2">
            View Invoice (Stripe)
          </a>
        )}
        {!invoiceUrl && receiptUrl && (
          <a href={receiptUrl} target="_blank" rel="noreferrer"
             className="inline-flex items-center rounded-full border px-4 py-2">
            View Receipt (Stripe)
          </a>
        )}
        <a href="/" className="inline-flex items-center rounded-full border px-4 py-2">← Back to Home</a>
        <a href="/admin" className="inline-flex items-center rounded-full border px-4 py-2">Go to Admin</a>
      </div>

      {!invoiceUrl && !receiptUrl && (
        <p className="mt-3 text-sm text-slate-500">
          Invoice/receipt link isn’t ready yet—refresh in a few seconds.
        </p>
      )}
    </main>
  );
}



