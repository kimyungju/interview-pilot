import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Libre_Baskerville, Karla, Geist_Mono } from "next/font/google";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const karla = Karla({ variable: "--font-karla", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Mock Interview",
  description: "Practice interviews with AI-generated questions and feedback",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${libreBaskerville.variable} ${karla.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
