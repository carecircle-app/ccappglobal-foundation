// src/app/pricing/page.tsx
export const metadata = {
  title: "Pricing â€” CareCircle",
  description: "Free, Lite, and Elite plans for every family.",
};

type Feature = { text: string; href: string };
type Plan = {
  name: string;
  price: string;
  features: Feature[];
  ctaColor: "slate" | "emerald" | "sky";
  href?: string;
};

const R = {
  home: "/",
  calendar: "/calendar",
  tasks: "/admin",
  chat: "/chat",
  map: "/map",
  receipts: "/lists",
  docs: "/docs",
  devices: "/devices",
  health: "/health",
  livestream: "/live",
  pricing: "/pricing",
  privacy: "/privacy",
  terms: "/terms",
};

// Only link to routes we actually have; otherwise render plain text.
const AVAILABLE = new Set<string>([
  R.home,
  R.calendar,
  R.tasks,
  R.chat,
  R.map,
  R.receipts,
  R.docs,
  R.devices,
  R.health,
  R.livestream,
  R.pricing,
  R.privacy,
  R.terms,
]);

const env = {
  lite: process.env.NEXT_PUBLIC_STRIPE_PRICE_LITE || "",
  elite: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || "",
};

const rawPlans: Plan[] = [
  {
    name: "ðŸŒ± Free",
    price: "$0.00 / month",
    ctaColor: "slate",
    features: [
      { text: "ðŸ‘¶ 1 kid", href: R.tasks },
      { text: "ðŸ“… Simple family calendar", href: R.calendar },
      { text: "âœ… Chores with little reminders", href: R.tasks },
      { text: "ðŸ“² Text me when itâ€™s chore time (SMS)", href: R.tasks },
      { text: "ðŸ”’ Parent can lock or turn off the screen*", href: R.devices },
      { text: "ðŸ’¬ Family chat (short history)", href: R.chat },
      { text: "ðŸ“ Home & school alerts (1â€“2 places)", href: R.map },
    ],
  },
  {
    name: "ðŸŒŸ Lite",
    price: "$4.99 / month",
    ctaColor: "emerald",
    features: [
      { text: "ðŸ‘§ðŸ‘¦ 2 kids", href: R.tasks },
      { text: "ðŸ“… Better calendar (colors + smarter reminders)", href: R.calendar },
      { text: "âœ… Chores with photo check", href: R.tasks },
      { text: "ðŸ“² Text + app alerts for chores", href: R.tasks },
      { text: "ðŸ”’ Lock / pause internet*", href: R.devices },
      { text: "ðŸŽ¥ Quick check-in video", href: R.livestream },
      { text: "ðŸ›’ Shopping lists + keep simple receipts", href: R.receipts },
      { text: "ðŸ…¿ï¸ Park-my-car helper (save the spot)", href: R.map },
      { text: "ðŸ“ Home & school alerts (2 places)", href: R.map },
    ],
  },
  {
    name: "ðŸš€ Elite",
    price: "$9.99 / month",
    ctaColor: "sky",
    features: [
      { text: "ðŸ‘©â€ðŸ‘©â€ðŸ‘§â€ðŸ‘¦ Up to 5 kids (or more)", href: R.tasks },
      { text: "ðŸ“… Super calendar (smart colors & nudges)", href: R.calendar },
      { text: "âœ… Chores that nudge kindly if they forget", href: R.tasks },
      { text: "ðŸ“² Text + push + phone-style alerts", href: R.tasks },
      { text: "ðŸ”’ Lock screen / pause internet / shut down*", href: R.devices },
      { text: "ðŸ’¬ Unlimited chat & longer live video check-ins", href: R.livestream },
      { text: "ðŸ›’ Receipts, budgets, shopping lists (advanced)", href: R.receipts },
      { text: "ðŸ…¿ï¸ Park-my-car + find my spot", href: R.map },
      { text: "ðŸ›°ï¸ Geofencing zones & instant place alerts", href: R.map }, // â† added
      { text: "ðŸ“‚ Safe place for doctor notes & school forms", href: R.docs },
      { text: "ðŸ›¡ï¸ Family safety (parents, kids, relatives, caregivers)", href: R.devices },
      { text: "ðŸš¨ SOS & fall alerts, loud alarm", href: R.devices },
      { text: "â¤ï¸ Priority support (fast help)", href: R.pricing },
      // Health
      { text: "ðŸ§¼ ADL checklists + caregiver handoff", href: R.health },
      { text: "â¤ï¸ Vital signs (BP, heart, temp, O2, weight)", href: R.health },
      { text: "ðŸŽ Diabetes logs (sugar, insulin, food)", href: R.health },
      { text: "ðŸ’Š Medicine helper & MAR (pill times, refills, export)", href: R.health },
      { text: "ðŸ“ Daily care notes with photos & reports", href: R.health },
    ],
  },
];

function ctaClasses(color: Plan["ctaColor"], disabled?: boolean) {
  const base =
    "inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-white shadow transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const map: Record<Plan["ctaColor"], string> = {
    slate: "bg-slate-800 hover:bg-slate-900 focus:ring-slate-800",
    emerald: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600",
    sky: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-600",
  };
  return [base, map[color], disabled ? "pointer-events-none opacity-50" : ""].join(" ");
}

function maybeLink(f: Feature) {
  if (AVAILABLE.has(f.href)) {
    return (
      <a className="hover:underline" href={f.href}>
        {f.text}
      </a>
    );
  }
  return <span>{f.text}</span>;
}

export default function PricingPage() {
  const plans: Plan[] = rawPlans.map((p) => {
    if (p.name.includes("Lite")) {
      return { ...p, href: env.lite ? `/api/stripe/checkout?priceId=${env.lite}` : undefined };
    }
    if (p.name.includes("Elite")) {
      return { ...p, href: env.elite ? `/api/stripe/checkout?priceId=${env.elite}` : undefined };
    }
    return { ...p, href: R.home };
  });

  return (
    <>
      {/* Header w/ Back to Home in the nav + a pill under it */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href={R.home} className="font-semibold tracking-tight">
            CareCircle
          </a>
          <nav className="hidden gap-6 text-sm text-slate-700 sm:flex">
            <a href={R.home} className="hover:text-slate-900">
              Back to Home
            </a>
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href={R.pricing} aria-current="page" className="text-slate-900 font-medium">
              Pricing
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-4">
        <a
          href={R.home}
          className="inline-flex items-center text-sm font-medium text-emerald-700 hover:underline"
        >
          â† Back to Home
        </a>
      </div>

      <main className="min-h-dvh bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="mb-2 text-center text-3xl font-bold">CareCircle Plans</h1>
          <p className="mb-10 text-center text-slate-600">
            Simple plans. Cancel anytime. Test cards only â€” powered by Stripe Checkout.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const disabled = !plan.href;
              const cleanName = plan.name.replace(/[^a-zA-Z ]/g, "").trim() || "Plan";
              return (
                <section
                  key={plan.name}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-2xl font-bold">{plan.price}</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start">
                          {maybeLink(f)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">
                      * Parental device controls require setup on the kidâ€™s device and your OK.
                    </p>
                  </div>

                  <a
                    href={plan.href || "#"}
                    aria-disabled={disabled}
                    className={ctaClasses(plan.ctaColor, disabled) + " mt-6"}
                  >
                    {cleanName === "Free" ? "Start Free" : `Choose ${cleanName}`}
                  </a>
                </section>
              );
            })}
          </div>

          <section id="features" className="mt-16">
            <h3 className="text-center text-lg font-semibold">Whatâ€™s in each plan</h3>
            <p className="mt-1 text-center text-slate-600">
              Feature bullets above are clickable when that part of the app exists.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>{new Date().getFullYear()} CareCircle</div>
          <nav className="flex gap-4">
            <a className="underline" href={R.privacy}>
              Privacy
            </a>
            <a className="underline" href={R.terms}>
              Terms
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}

