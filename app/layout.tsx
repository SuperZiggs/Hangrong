import type { Metadata } from "next";
import "./game.css";

export const metadata: Metadata = {
  title: "Quyền lực số — Ai nắm luật chơi?",
  description: "Game tình huống cùng lớp: nhận diện quyền lực, ứng phó biến cố và giữ quyền chủ động. 2–6 nhóm, 3 vòng, 90 điểm.",
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
