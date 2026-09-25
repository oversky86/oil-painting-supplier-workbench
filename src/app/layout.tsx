import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViewBrush Supplier Workbench",
  description: "Studio order queue for portrait delivery and shipping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
