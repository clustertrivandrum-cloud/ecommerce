import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Twitter } from 'lucide-react';

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
            Curated elegance, redefined for the modern aesthete. 
            Mobile-first, high-conversion experiences.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 border border-border hover:bg-border transition-colors group">
              <Instagram className="w-5 h-5 group-hover:text-accent-gold transition-colors" />
            </a>
            <a href="#" className="p-2 border border-border hover:bg-border transition-colors group">
              <Twitter className="w-5 h-5 group-hover:text-accent-gold transition-colors" />
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
            {['Contact Us', 'Shipping Options', 'Returns & Exchanges', 'FAQ'].map((item) => (
              <li key={item}>
                <Link href="#" className="text-text-secondary hover:text-accent-mint transition-colors text-sm">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between text-xs text-text-secondary max-w-7xl mx-auto">
        <p>&copy; {new Date().getFullYear()} Cluster. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link href="/policy/privacy" className="hover:text-text-primary">Privacy Policy</Link>
          <Link href="/policy/terms" className="hover:text-text-primary">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
