export default function Page() {
  return (
    <main className="min-h-screen grid place-items-center p-10">
      <div className="p-8 rounded-2xl bg-lime-300 text-black shadow">
        Tailwind is working ðŸŽ‰
      </div>
      <div className="mt-6 flex gap-2">
        <span className="px-3 py-1 rounded-full bg-blue-600 text-white">px-3</span>
        <span className="px-3 py-1 rounded-full bg-rose-600 text-white">rounded</span>
        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white">gap-2</span>
      </div>
    </main>
  );
}

