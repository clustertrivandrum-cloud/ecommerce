import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { AuthSessionSync } from "@/components/providers/AuthSessionSync";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthModal } from "@/components/modals/AuthModal";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://clusterfascination.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cluster Fascination',
    template: '%s | Cluster Fascination',
  },
  description:
    'Discover handpicked fashion jewellery & accessories at Cluster Fascination. Timeless classics and statement pieces for men and women — shipped Pan-India.',
  keywords: [
    'fashion jewellery',
    'accessories',
    'jewellery India',
    'jewellery online',
    'Cluster Fascination',
    'statement jewellery',
    'affordable jewellery',
    'buy jewellery online India',
  ],
  authors: [{ name: 'Cluster Fascination', url: SITE_URL }],
  creator: 'Cluster Fascination',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Cluster Fascination',
    title: 'Cluster Fascination',
    description:
      'Discover handpicked fashion jewellery & accessories at Cluster Fascination. Timeless classics and statement pieces — shipped Pan-India.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cluster Fascination — Fashion Jewellery & Accessories',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cluster Fascination',
    description:
      'Handpicked fashion jewellery & accessories. Timeless classics and statement pieces shipped Pan-India.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${playfair.variable} h-full antialiased scroll-smooth`}
    >
      <head />
      <body className="min-h-full flex flex-col font-sans selection:bg-accent-gold/20">
        <ThemeProvider>
          <AuthSessionSync />
          <Navbar />
          <div className="flex-1 pt-[88px] md:pt-[112px]">{children}</div>
          <Footer />
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
