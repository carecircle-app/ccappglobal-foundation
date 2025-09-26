import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CareCircle", template: "%s · CareCircle" },
  description: "CareCircle",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
    { color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased pt-safe pb-safe no-x-scroll">
        <div id="app-root" className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
