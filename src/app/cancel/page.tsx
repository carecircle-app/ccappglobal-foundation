export const dynamic = "force-static";
export const metadata = { title: "Checkout canceled  CareCircle" };

export default function CancelPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Checkout canceled</h1>
      <p className="mt-4">No worries  you were not charged.</p>
      <p className="mt-6"><a className="underline" href="/#plans">Try again</a></p>
    </main>
  );
}

