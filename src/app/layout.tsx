import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViewBrush 供应商工作台",
  description: "画像交付与发货的工作室订单队列",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
