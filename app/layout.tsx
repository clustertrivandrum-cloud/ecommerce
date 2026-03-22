import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { AuthSessionSync } from "@/components/providers/AuthSessionSync";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cluster Fascination",
  description: "Premium mobile-first e-commerce experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-accent-gold/20">
        <AuthSessionSync />
        <Navbar />
        <div className="flex-1 pt-[88px]">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
