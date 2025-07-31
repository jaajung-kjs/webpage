import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PerformanceProvider } from "@/components/providers/performance-provider";
import { GlobalMessageNotifications } from "@/components/providers/GlobalMessageNotifications";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KEPCO 강원본부 AI 학습동아리",
  description: "한국전력공사 강원본부 전력관리처 AI 학습동아리 - 생성형 AI를 활용한 업무 생산성 향상과 사례 공유",
  keywords: ["KEPCO", "AI", "학습동아리", "생성형AI", "업무생산성", "한국전력공사"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KEPCO AI Club",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
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
          <PerformanceProvider>
            <GlobalMessageNotifications />
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
          </PerformanceProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
