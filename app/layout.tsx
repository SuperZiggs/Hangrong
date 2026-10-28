import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuộc đua giành khách — Thành phố đổi luật",
  description: "Game hành động nhiều người: tranh đơn, lướt, cản đường và tìm lối đi của riêng mình.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body><a className="skip-link" href="#main-content">Đến nội dung chính</a>{children}</body>
    </html>
  );
}
