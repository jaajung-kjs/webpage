import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import "@/styles/colors.css";
import "@/styles/mobile.css";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { RootProvider } from "@/providers";
import { Toaster } from "@/components/ui/sonner";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KEPCO 강원본부 AI 학습동아리",
  description: "한국전력공사 강원본부 전력관리처 AI 학습동아리 - 생성형 AI를 활용한 업무 생산성 향상과 사례 공유",
  keywords: ["KEPCO", "AI", "학습동아리", "생성형AI", "업무생산성", "한국전력공사"],
  // manifest와 icons 제거 - PWA 기능 비활성화
  // manifest: "/manifest.json",
  // icons: {
  //   icon: [
  //     { url: "/images/kepco.svg", type: "image/svg+xml" },
  //     { url: "/images/kepco-logo.png", sizes: "192x192", type: "image/png" },
  //   ],
  //   apple: [
  //     { url: "/images/kepco-logo.png", sizes: "192x192", type: "image/png" },
  //   ],
  // },
  // appleWebApp: {
  //   capable: true,
  //   statusBarStyle: "default",
  //   title: "KEPCO AI Club",
  // },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKR.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <RootProvider>
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
            <Toaster position="top-right" richColors />
          </RootProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
