import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import ClientOnly from "@/components/ClientOnly";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kabutar Media Agency | News Buy & Sell Marketplace",
  description: "Buy and sell exclusive news stories. A marketplace for reporters and media agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen flex flex-col font-sans">
        <ClientOnly>
          <Navbar />
        </ClientOnly>
        <main className="flex-grow">{children}</main>
        <ClientOnly>
          <Footer />
        </ClientOnly>
      </body>
    </html>
  );
}