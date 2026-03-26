import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    absolute: 'Cluster Fascination — Fashion Jewellery & Accessories',
  },
  description:
    'Discover handpicked fashion jewellery & accessories at Cluster Fascination. Timeless classics and statement pieces for men and women — shipped Pan-India.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Cluster Fascination — Fashion Jewellery & Accessories',
    description:
      'Discover handpicked fashion jewellery & accessories. Timeless classics and statement pieces — shipped Pan-India.',
    url: '/',
  },
};
import Image from "next/image";
import { getCategories, getFeaturedProducts } from "@/lib/api/home";
import { ProductCard } from "@/components/product/ProductCard";
import { getHomeBannerSettings } from "@/lib/server/app-settings";
import { AnnouncementBar } from "@/components/home/AnnouncementBar";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://clusterfascination.com';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Cluster Fascination',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  sameAs: [
    'https://www.instagram.com/clusterfascination',
    'https://chat.whatsapp.com/CNiGdxAEIAh3VxRXFo6Yyc',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'Malayalam'],
    },
  ],
};

const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Cluster Fascination',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/products?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export default async function Home() {
  const [categories, featuredProducts, homeBanner] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
    getHomeBannerSettings(),
  ]);

  return (
    <>
      <Script id="org-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Script id="website-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
    <main className="flex-1 space-y-24 pb-24">
      {homeBanner.announcement.enabled ? (
        <AnnouncementBar
          text={homeBanner.announcement.text}
          linkLabel={homeBanner.announcement.linkLabel}
          linkHref={homeBanner.announcement.linkHref}
          background={homeBanner.announcement.background}
          textColor={homeBanner.announcement.textColor}
        />
      ) : null}

      <HomeHeroCarousel slides={homeBanner.slides} />

      {/* Trust Badges */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-border">
          {[
            { label: 'Quick & Secure Shipping', sub: 'On all orders' },
            { label: 'Premium Quality', sub: 'Products' },
            { label: 'Worldwide delivery', sub: 'On all orders' },
            { label: '3500+ Happy Customers', sub: 'Trusted quality' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center gap-1">
              <span className="text-accent-gold font-heading text-sm tracking-wide">{item.label}</span>
              <span className="text-text-secondary text-xs">{item.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Scroll */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto space-y-8">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-heading tracking-wide">Shop by Category</h2>
          <Link href="/category" className="text-sm border-b border-text-primary/40 hover:text-accent-gold hover:border-accent-gold transition-colors pb-1 tracking-widest uppercase text-xs">
            View All
          </Link>
        </div>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/category/${cat.slug}`}
              className="relative flex-shrink-0 w-40 h-52 md:w-52 md:h-64 bg-card overflow-hidden group snap-start"
            >
              <Image 
                src={cat.image} 
                alt={cat.name} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-110" 
                sizes="(max-width: 768px) 160px, 208px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/82 via-28% to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col items-center justify-end">
                <span className="font-heading text-sm tracking-widest text-white text-center [text-shadow:0_3px_18px_rgba(0,0,0,0.95)] group-hover:text-accent-gold transition-colors uppercase">
                  {cat.name}
                </span>
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <span className="mt-1 text-[10px] text-white/95 [text-shadow:0_3px_14px_rgba(0,0,0,0.95)]">
                    {cat.subcategories.length} styles
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured / Bestsellers */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-accent-gold text-xs uppercase tracking-widest block mb-1">Handpicked</span>
            <h2 className="text-3xl font-heading tracking-wide">Bestsellers</h2>
          </div>
          <Link 
             href="/products" 
            className="text-sm border-b border-text-primary/40 hover:text-accent-gold hover:border-accent-gold transition-colors pb-1 hidden md:block tracking-widest uppercase text-xs"
          >
            Shop All
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-text-secondary border border-border bg-card">
            <p>No featured products yet. Check back soon!</p>
          </div>
        )}
      </section>

      {/* Brand Promise Section */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-square md:aspect-[4/5] overflow-hidden">
          <Image 
            src={homeBanner.promiseImageUrl} 
            alt="Cluster Fascination jewellery story" 
            fill 
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="flex flex-col gap-6 md:pl-8">
          <span className="text-accent-gold uppercase tracking-widest text-xs font-medium">{homeBanner.promiseKickerText}</span>
          <h2 className="text-4xl md:text-5xl font-heading leading-tight">
            {homeBanner.promiseTitle}
          </h2>
          <p className="text-text-secondary leading-relaxed">
            {homeBanner.promiseDescription}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-border pt-6 mt-6">
            <div className="text-center sm:text-left space-y-1">
              <span className="block text-lg font-heading text-accent-gold">Fast Shipping</span>
              <span className="text-text-secondary text-xs block leading-relaxed">Quick and reliable delivery to your doorstep.</span>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <span className="block text-lg font-heading text-accent-gold">Secure Payments</span>
              <span className="text-text-secondary text-xs block leading-relaxed">Safe and trusted payment methods.</span>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <span className="block text-lg font-heading text-accent-gold">Quality Assured</span>
              <span className="text-text-secondary text-xs block leading-relaxed">Carefully selected jewelry you can trust.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
