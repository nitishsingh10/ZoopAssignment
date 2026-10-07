import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZoopFleet – Delivery Agent Management",
  description: "Manage your fleet of delivery agents: create, view, update, and track agents in real time.",
  keywords: "delivery agents, fleet management, logistics, zoop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
