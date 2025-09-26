import DonationButtons from "@/components/DonationButtons";

export const metadata = { title: "CareCircle  Donate" };

export default function Donate() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold">Support the CareCircle Global Foundation</h1>
        <p className="mt-3 text-slate-600">
          100% of one-time donations go to the Foundation. Monthly subscribers: we donate a portion from every plan.
        </p>
        <div className="mt-6 flex justify-center">
          <DonationButtons />
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Test cards only  Powered by Stripe Checkout
        </p>
      </section>
    </main>
  );
}
