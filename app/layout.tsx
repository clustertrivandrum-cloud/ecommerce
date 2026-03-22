import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { AuthSessionSync } from "@/components/providers/AuthSessionSync";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cluster Fascination",
  description: "Premium mobile-first e-commerce experience",
};

const themeScript = `
  (() => {
    try {
      const storedTheme = window.localStorage.getItem('cluster-theme');
      const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${playfair.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-accent-gold/20">
        <ThemeProvider>
          <AuthSessionSync />
          <Navbar />
          <div className="flex-1 pt-[88px]">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
