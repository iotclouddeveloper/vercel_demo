import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "拾光-日程管理工具",
  description: "本地日程演示",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
