import type { ReactNode } from "react";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
// Belt-and-suspenders for Next 15 prerender quirks:
export const fetchCache = "force-no-store";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
