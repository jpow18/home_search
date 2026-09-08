import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeSeek — Your property search agent",
  description: "Automated home and land search, triage, and alerts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
