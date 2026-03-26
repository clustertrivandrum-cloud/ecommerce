'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Menu, Search, User, X, ChevronRight, Package, LogOut } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { SearchModal } from './SearchModal';
import { CartDrawer } from './CartDrawer';
import { getCategories, type Category } from '@/lib/api/home';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { MarqueeStrip } from './MarqueeStrip';

function subscribeToCartHydration(callback: () => void) {
  const unsubscribeHydrate = useCartStore.persist.onHydrate(callback);
  const unsubscribeFinishHydration = useCartStore.persist.onFinishHydration(callback);

  return () => {
    unsubscribeHydrate();
    unsubscribeFinishHydration();
  };
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const { user, setUser, setSession, setAuthModalOpen } = useUserStore();
  const router = useRouter();
  const cartItemsCount = useCartStore((state) => 
    state.items.reduce((acc, item) => acc + item.quantity, 0)
  );
  const cartHydrated = useSyncExternalStore(
    subscribeToCartHydration,
    () => useCartStore.persist.hasHydrated(),
    () => false
  );
  const visibleCartItemsCount = cartHydrated ? cartItemsCount : 0;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setMenuLoading(true);
      const data = await getCategories();
      if (!cancelled) {
        setCategories(data);
        setMenuLoading(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT';

      if (isTypingTarget) return;

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setMobileMenuOpen(false);
        setSearchOpen(true);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMobileMenuOpen(false);
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return;

    setSession(null);
    setUser(null);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300",
          scrolled ? "bg-primary/90 backdrop-blur-md border-b border-border py-4 md:py-6" : "bg-transparent py-6 md:py-8"
        )}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6">
          <div className="flex items-center gap-4 md:gap-6 min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden hover:text-accent-gold transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSearchOpen(true)}
              title="Search (/)"
              className="hidden lg:block hover:text-accent-gold transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link 
              href="/products" 
              className="hidden md:block text-xs font-medium tracking-widest uppercase hover:text-accent-gold transition-colors"
            >
              Shop All
            </Link>
          </div>

          <Link href="/" className="group flex items-center justify-center self-center px-2 md:px-4 gap-3 md:gap-5">
            <span className="hidden md:block font-heading text-lg md:text-xl tracking-[0.25em] uppercase text-text-primary group-hover:text-accent-gold transition-colors">
              Cluster
            </span>
            <span className="brand-logo-shell flex h-12 w-12 items-center justify-center rounded-full p-1.5 transition-transform group-hover:scale-[1.02] md:h-14 md:w-14 md:p-1.5 z-10 shrink-0">
              <Image
                src="/logo.svg"
                alt="Cluster Fascination"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="hidden md:block font-heading text-lg md:text-xl tracking-[0.25em] uppercase text-text-primary group-hover:text-accent-gold transition-colors">
              Fascination
            </span>
          </Link>

          <div className="flex items-center justify-end gap-4 md:gap-6 min-w-0">
            <button 
              onClick={() => setSearchOpen(true)}
              title="Search (/)"
              className="hover:text-accent-mint transition-colors lg:hidden"
            >
              <Search className="w-5 h-5" />
            </button>

            <div className="hidden lg:block">
              <ThemeToggle compact />
            </div>
            
            {user ? (
              <Link href="/profile" className="hidden lg:block hover:text-accent-gold transition-colors">
                <User className="w-5 h-5" />
              </Link>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="hidden lg:block hover:text-accent-gold transition-colors">
                <User className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={() => setCartOpen(true)} 
              className="relative hover:text-accent-gold transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {visibleCartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-text-primary text-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {visibleCartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <MarqueeStrip />
      </header>

      <div
        className={cn(
          'fixed inset-0 z-[70] bg-primary/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[80] w-[88vw] max-w-sm border-r border-border bg-primary/95 px-5 pb-8 pt-5 transition-transform duration-300 lg:hidden',
          'panel-shadow',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="block text-[11px] uppercase tracking-[0.3em] text-accent-gold">Cluster</span>
            <span className="mt-2 block text-lg font-heading tracking-[0.18em] text-text-primary">Navigation</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-full border border-border p-2 text-text-primary transition-colors hover:border-accent-gold hover:text-accent-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-6 overflow-y-auto pb-6 h-[calc(100vh-104px)]">
          <section className="rounded-[1.5rem] border border-border bg-card/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-text-secondary">
              {user ? 'Signed in' : 'Guest'}
            </p>
            <p className="mt-2 text-lg font-heading text-text-primary">
              {user?.email ?? 'Browse the collection'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {user ? (
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full border border-border px-4 py-3 text-center text-[11px] uppercase tracking-[0.24em] text-text-primary transition-colors hover:border-accent-gold hover:text-accent-gold"
                >
                  My Account
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="rounded-full border border-border px-4 py-3 text-center text-[11px] uppercase tracking-[0.24em] text-text-primary transition-colors hover:border-accent-gold hover:text-accent-gold"
                >
                  Sign In
                </button>
              )}
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-border px-4 py-3 text-center text-[11px] uppercase tracking-[0.24em] text-text-primary transition-colors hover:border-accent-gold hover:text-accent-gold"
              >
                Wishlist
              </Link>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-text-secondary">Appearance</p>
                <p className="mt-2 text-sm text-text-primary">Switch between dark and logo-inspired light mode.</p>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <section>
            <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-text-secondary">Quick links</p>
            <nav className="space-y-2">
              {[
                { href: '/products', label: 'Shop All' },
                { href: '/category', label: 'Collections' },
                { href: '/orders', label: 'Order History', icon: Package },
                { href: '/preorders', label: 'My Preorders', icon: Package },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card/40 px-4 py-3 transition-colors hover:border-accent-gold hover:text-accent-gold"
                  >
                    <span className="flex items-center gap-3 text-sm tracking-wide">
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/40 px-4 py-3 text-left transition-colors hover:border-accent-gold hover:text-accent-gold"
              >
                <span className="flex items-center gap-3 text-sm tracking-wide">
                  <Search className="h-4 w-4" />
                  Search
                </span>
                <ChevronRight className="h-4 w-4 text-text-secondary" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCartOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/40 px-4 py-3 text-left transition-colors hover:border-accent-gold hover:text-accent-gold"
              >
                <span className="flex items-center gap-3 text-sm tracking-wide">
                  <ShoppingCart className="h-4 w-4" />
                  Cart
                </span>
                <span className="rounded-full bg-text-primary px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {visibleCartItemsCount}
                </span>
              </button>
            </nav>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.28em] text-text-secondary">Collections</p>
              <Link href="/category" onClick={() => setMobileMenuOpen(false)} className="text-[11px] uppercase tracking-[0.22em] text-accent-gold">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {menuLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl border border-border bg-card/40" />
                ))
              ) : (
                categories.slice(0, 10).map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 transition-colors hover:border-accent-gold hover:text-accent-gold"
                  >
                    <span className="truncate pr-4 text-sm">{category.bannerTitle || category.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
                  </Link>
                ))
              )}
            </div>
          </section>

          {user ? (
            <section className="border-t border-border pt-5">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-sm transition-colors hover:border-red-500/40 hover:text-red-400"
              >
                <span className="flex items-center gap-3">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </span>
                <ChevronRight className="h-4 w-4 text-text-secondary" />
              </button>
            </section>
          ) : null}
        </div>
      </aside>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
