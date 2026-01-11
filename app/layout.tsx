import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "지금 뭐해? | 랜덤 놀거리 추천기",
  description:
    "필터만 고르면 3초 안에 오늘 할 일을 결정해주는 초간단 랜덤 놀거리·데이트·모임 추천기.",
  metadataBase: new URL("https://now-what.local")
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
