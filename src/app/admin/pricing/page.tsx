export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import StripeCTAButtons from "@/components/StripeCTAButtons";

export const metadata = {
  title: "CareCircle Ã¢â‚¬â€ Admin Pricing",
  description: "Pricing page under /admin"
};

export default function AdminPricing() {
  return (
    <main className="min-h-screen mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3 font-semibold">Admin Ã¢â‚¬Ëœ Pricing</h1>
      <p className="mt-2 text-slate-600">Same pricing options, routed under /admin.</p>
      <StripeCTAButtons />
      <div className="mt-6 text-sm">
        <a href="/pricing" className="underline">See full /pricing page</a>
      </div>
    </main>
  );
}





