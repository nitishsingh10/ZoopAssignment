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
      <body>{children}</body>
    </html>
  );
}
