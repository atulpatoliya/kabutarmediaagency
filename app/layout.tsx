import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import ClientOnly from "@/components/ClientOnly";
import { Footer } from "@/components/Footer";
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
  title: "Kabutar Media Agency | News Buy & Sell Marketplace",
  description: "Buy and sell exclusive news stories. A marketplace for reporters and media agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <ClientOnly>
          <Navbar />
        </ClientOnly>
        <main className="flex-grow">
          {children}
        </main>
        <ClientOnly>
          <Footer />
        </ClientOnly>
      </body>
    </html>
  );
}