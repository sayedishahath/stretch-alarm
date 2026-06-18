import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stretch Alarm — Move every 45 minutes",
  description: "A gentle reminder to stand up and stretch every 45 minutes while you work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
