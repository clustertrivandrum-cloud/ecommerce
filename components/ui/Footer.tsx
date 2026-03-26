import Image from 'next/image';
import Link from 'next/link';
import { Instagram, MapPin } from 'lucide-react';
import { AnalyticsPreferencesButton } from './AnalyticsPreferencesButton';

export function Footer() {
  return (
    <footer className="border-t border-border mt-32 py-16 px-6 lg:px-12 bg-card">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="mb-6 inline-flex">
            <span className="brand-logo-shell flex h-20 w-20 items-center justify-center rounded-full p-2">
              <Image
                src="/logo.svg"
                alt="Cluster Fascination"
                width={80}
                height={80}
                className="h-full w-full object-contain"
              />
            </span>
          </Link>
          <p className="text-text-secondary max-w-sm font-sans mb-8">
            At Cluster Fascination, we believe jewellery is more than just an accessory. It reflects your style and your cherished moments.
          </p>
          <div className="flex flex-col gap-4">
            <a href="https://www.instagram.com/clusterfascination?igsh=MXJhamx5ejljdWkzZQ==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-text-secondary hover:text-accent-gold transition-colors group">
              <Instagram className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Instagram</span>
            </a>
            <a href="https://share.google/4HYEkxNDVewBf09NS" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-text-secondary hover:text-accent-gold transition-colors group">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Location</span>
            </a>
            <a href="https://wa.me/916282660237" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-text-secondary hover:text-accent-gold transition-colors group">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="text-sm">WhatsApp Direct</span>
            </a>
            <a href="https://chat.whatsapp.com/CNiGdxAEIAh3VxRXFo6Yyc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-text-secondary hover:text-accent-gold transition-colors group">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="text-sm">WhatsApp Group</span>
            </a>
          </div>
        </div>

        <div className="col-span-1">
          <h3 className="text-sm font-medium mb-6 uppercase tracking-wider">Shop</h3>
          <ul className="space-y-4">
            {['All Products', 'Bestsellers', 'New Arrivals', 'Preorders'].map((item) => (
              <li key={item}>
                <Link href="/category" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-1">
          <h3 className="text-sm font-medium mb-6 uppercase tracking-wider">Support</h3>
          <ul className="space-y-4">
            <li>
              <Link href="/about" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                Shipping & Store Policy
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                Refund & Return Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="text-text-secondary hover:text-accent-gold transition-colors text-sm">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between text-xs text-text-secondary max-w-7xl mx-auto">
        <p>&copy; {new Date().getFullYear()} Cluster. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link href="/privacy-policy" className="hover:text-text-primary">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-text-primary">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-text-primary">Return Policy</Link>
          <AnalyticsPreferencesButton />
        </div>
      </div>
    </footer>
  );
}
