import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import type { Metadata } from "next";
import { Libre_Baskerville, Karla, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const karla = Karla({ variable: "--font-karla", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Mock Interview",
  description: "Practice interviews with AI-generated questions and feedback",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html suppressHydrationWarning>
        <body className={`${libreBaskerville.variable} ${karla.variable} ${geistMono.variable} ${notoSansKr.variable} antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <LanguageProvider>
              <InAppBrowserGuard />
              {children}
            </LanguageProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
