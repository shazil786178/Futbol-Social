import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Bricolage_Grotesque, Onest } from "next/font/google";
import { AdsenseLoader } from "@/components/ads/adsense-loader";
import { LivingBackdrop } from "@/components/atmosphere/living-backdrop";
import { AuthHashHandler } from "@/components/auth/auth-hash-handler";
import { AppChrome } from "@/components/layout/app-chrome";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { QuickRail } from "@/components/layout/quick-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StayLoopHost } from "@/components/layout/stay-loop-host";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const body = Onest({
  variable: "--font-body",
  subsets: ["latin"],
});

const score = Big_Shoulders({
  variable: "--font-score",
  subsets: ["latin"],
  weight: ["600", "800"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: `${BRAND.description} ${BRAND.launchFocus}`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${score.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0">
        <LivingBackdrop />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <AdsenseLoader />
          <AuthHashHandler />
          <AppChrome header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </AppChrome>
          <StayLoopHost />
          <QuickRail />
          <MobileTabBar />
        </div>
      </body>
    </html>
  );
}
