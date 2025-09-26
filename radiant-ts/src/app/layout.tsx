import "./globals.css";

export const metadata = {
  title: "CareCircle  Coordinate care with confidence",
  description:
    "Shared calendar, medication reminders, geofencing alerts, and secure chat for families and caregivers."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
