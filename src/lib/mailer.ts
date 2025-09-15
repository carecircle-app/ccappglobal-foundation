/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

// src/lib/mailer.ts
/**
 * Mailer that:
 * - Works even if 'nodemailer' isn't installed (logs + skips send).
 * - Reads SMTP creds from env.
 * - Exposes sendEmail(msg) and simple tmpl* helpers.
 * - Backward-compatible with: sendEmail(tmplSubscriptionChanged(...))
 */

let nodemailer: any = null;
try {
   
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}

/* ========= ENV ========= */
const {
  SMTP_HOST = "",
  SMTP_PORT = "",
  SMTP_USER = "",
  SMTP_PASS = "",
  MAIL_FROM = "CareCircle <no-reply@carecircle.local>",
  MAIL_TO = "", // Optional default admin mailbox (comma-separated ok)
} = process.env;

function hasCreds() {
  return Boolean(SMTP_HOST && SMTP_PORT && MAIL_FROM && (SMTP_USER ? SMTP_PASS : true));
}

/* ========= TRANSPORT ========= */
let _transporter: any = null;

export function getTransporter() {
  if (!hasCreds()) return null;
  if (!nodemailer) {
    console.warn(
      "[email] 'nodemailer' not installed. To enable email sending:\n" +
        "  npm install nodemailer\n" +
        "  (optional types) npm install -D @types/nodemailer"
    );
    return null;
  }
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465, // SMTPS
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return _transporter;
}

/* ========= SENDER ========= */
export type SendOpts = {
  to?: string; // falls back to MAIL_TO, then SMTP_USER
  subject: string;
  text?: string;
  html?: string;
};

export async function sendEmail(opts: SendOpts) {
  const tx = getTransporter();
  if (!tx) {
    console.warn("[email] Skipped send â€” missing transporter (no creds or nodemailer not installed).", {
      missingCreds: {
        SMTP_HOST: !!SMTP_HOST,
        SMTP_PORT: !!SMTP_PORT,
        SMTP_USER: !!SMTP_USER,
        SMTP_PASS: SMTP_PASS ? true : false,
        MAIL_FROM: !!MAIL_FROM,
      },
      hasNodemailer: !!nodemailer,
    });
    return { ok: false, skipped: true as const };
  }

  const to = opts.to || MAIL_TO || SMTP_USER;
  if (!to) {
    console.warn("[email] Skipped send â€” no recipient (set MAIL_TO or provide opts.to).");
    return { ok: false, skipped: true as const };
  }

  try {
    const info = await tx.sendMail({
      from: MAIL_FROM,
      to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    console.log("[email] sent", { to, subject: opts.subject, messageId: info?.messageId });
    return { ok: true as const, messageId: info?.messageId };
  } catch (err: any) {
    console.error("[email] send failed:", err?.message || err);
    return { ok: false as const, error: err?.message || "SEND_FAILED" };
  }
}

/* ========= TEMPLATES =========
   All templates return { to?: string, subject, html, text } so you can:
   await sendEmail(tmpl(...))  // (backward compatible)
   or override recipient: await sendEmail({ to: "user@x.com", ...tmpl(...) })
*/

function fmtAmount(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || !currency) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency?.toUpperCase() || ""}`;
  }
}

/** Payment succeeded */
export function tmplPaymentSucceeded(p: {
  amount: number;
  currency: string;
  piId: string;
  customer?: string | null;
  email?: string | null; // if present, we'll prefill "to"
}) {
  const amount = fmtAmount(p.amount, p.currency);
  const subject = `âœ… Payment succeeded â€” ${amount}`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Payment succeeded</h2>
      <p><b>Amount:</b> ${amount}</p>
      <p><b>Payment Intent:</b> ${p.piId}</p>
      <p><b>Customer:</b> ${p.customer ?? "â€”"}</p>
      <p><b>Email:</b> ${p.email ?? "â€”"}</p>
    </div>
  `;
  const text = `Payment succeeded
Amount: ${amount}
Payment Intent: ${p.piId}
Customer: ${p.customer ?? "â€”"}
Email: ${p.email ?? "â€”"}`;
  return { to: p.email ?? undefined, subject, html, text };
}

/** Invoice payment failed (usually notify your team) */
export function tmplInvoiceFailed(p: {
  invoiceId: string;
  amountDue?: number | null;
  currency?: string | null;
  customer?: string | null;
  hostedInvoiceUrl?: string | null;
}) {
  const amount =
    p.amountDue != null && p.currency ? fmtAmount(p.amountDue, p.currency) : "â€”";
  const subject = `âš ï¸ Invoice payment failed â€” ${amount} (${p.invoiceId})`;
  const link = p.hostedInvoiceUrl ? `\nInvoice: ${p.hostedInvoiceUrl}` : "";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Invoice payment failed</h2>
      <p><b>Invoice:</b> ${p.invoiceId}</p>
      <p><b>Customer:</b> ${p.customer ?? "â€”"}</p>
      <p><b>Amount due:</b> ${amount}</p>
      ${p.hostedInvoiceUrl ? `<p><a href="${p.hostedInvoiceUrl}">Open invoice in Stripe</a></p>` : ""}
      <p>Please follow up to update the payment method.</p>
    </div>
  `;
  const text = `Invoice payment failed
Invoice: ${p.invoiceId}
Customer: ${p.customer ?? "â€”"}
Amount due: ${amount}${link}
Please follow up to update the payment method.`;
  // No "to" set -> falls back to MAIL_TO/SMTP_USER (admin mailbox)
  return { subject, html, text };
}

/** Subscription created/updated/deleted (usually notify your team) */
export function tmplSubscriptionChanged(p: {
  subId: string;
  status: string;
  customer?: string | null;
}) {
  const subject = `ðŸ”„ Subscription ${p.subId} â€” ${p.status}`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Subscription changed</h2>
      <p><b>ID:</b> ${p.subId}</p>
      <p><b>Status:</b> ${p.status}</p>
      <p><b>Customer:</b> ${p.customer ?? "â€”"}</p>
    </div>
  `;
  const text = `Subscription changed
ID: ${p.subId}
Status: ${p.status}
Customer: ${p.customer ?? "â€”"}`;
  // No "to" set -> falls back to MAIL_TO/SMTP_USER (admin mailbox)
  return { subject, html, text };
}
