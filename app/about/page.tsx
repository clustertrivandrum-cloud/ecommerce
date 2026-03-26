import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Us | Cluster Fascination',
  description: 'Driven by passion and creativity, Cluster Fascination brings you timeless classics and statement jewellery pieces.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-24 pb-32 overflow-hidden bg-background">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 md:px-12 mb-20 md:mb-32">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-mint/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto pt-12 md:pt-24 space-y-8">
          <span className="text-accent-gold uppercase tracking-[0.3em] text-xs font-semibold">Our Story</span>
          <h1 className="text-4xl md:text-6xl font-heading leading-tight tracking-wide">
            Where tradition meets modern trend.
          </h1>
          <div className="h-px w-24 bg-accent-gold/40 mx-auto" />
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center relative z-10">
        <div className="space-y-8 order-2 md:order-1">
          <div className="space-y-6 text-text-secondary leading-relaxed md:text-lg font-light text-justify">
            <p>
              <strong className="text-text-primary font-heading tracking-wide">Cluster Fascination</strong>, founded in 2024 as an online store and expanded offline in 2025, is a passionate student start-up by <span className="text-accent-gold">Arya Suresh S</span>, a young entrepreneur driven by her love for business and creativity. Located in Kazhakkoottam, Thiruvananthapuram, the brand aims to grow as a trusted destination for those who value both trend and affordability.
            </p>
            <p>
              At Cluster Fascination, we believe jewellery is more than just an accessory. It reflects your style and your cherished moments. Our handpicked collections blend tradition with modern trends, offering timeless classics and statement pieces for both men and women. From everyday wear to festive occasions, each piece is crafted to bring you elegance, confidence, and shine.
            </p>
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row gap-6">
            <Link 
              href="/products" 
              className="bg-text-primary text-primary px-8 py-4 text-center text-sm font-medium hover:bg-accent-gold hover:text-white transition-all duration-300 uppercase tracking-[0.2em]"
            >
              Explore Collection
            </Link>
            <Link 
              href="/category" 
              className="border border-border text-center px-8 py-4 text-sm font-medium hover:border-accent-gold hover:text-accent-gold transition-all duration-300 uppercase tracking-[0.2em]"
            >
              View Categories
            </Link>
          </div>
        </div>

        {/* Decorative / Image Column */}
        <div className="order-1 md:order-2 relative aspect-[4/5] md:aspect-[3/4] w-full max-w-md mx-auto">
          <div className="absolute inset-0 border border-border rotate-3 transition-transform duration-700 hover:rotate-6 bg-card" />
          <div className="absolute inset-0 border border-accent-gold/30 -rotate-3 transition-transform duration-700 hover:-rotate-1" />
          <div className="absolute inset-0 bg-card z-10 p-2 overflow-hidden shadow-2xl">
            <div className="w-full h-full relative bg-background flex flex-col items-center justify-center overflow-hidden group">
              {/* Optional Placeholder for an actual about image. If no image exists, this graceful fallback stays. */}
              <div className="absolute inset-0 bg-gradient-to-tr from-card via-background to-card opacity-50" />
              <div className="relative z-10 flex flex-col items-center justify-center space-y-6 h-full w-full p-8 text-center border-[0.5px] border-border/50">
                 <Image
                   src="/logo.svg"
                   alt="Cluster Fascination Logo Mark"
                   width={120}
                   height={120}
                   className="opacity-80 drop-shadow-sm group-hover:scale-110 transition-transform duration-700 ease-out"
                 />
                 <span className="font-heading text-2xl tracking-widest text-text-primary/90 uppercase opacity-90">Est. 2024</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values/Pillars */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 mt-32 md:mt-40 border-t border-border pt-24 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-4">
             <div className="w-12 h-12 mx-auto border border-accent-gold/40 flex items-center justify-center rounded-full text-accent-gold mb-6">
                <span className="font-heading text-xl">✦</span>
             </div>
             <h3 className="font-heading text-xl tracking-wide">Trend & Affordability</h3>
             <p className="text-text-secondary text-sm leading-relaxed">High-quality, trusted destinations shouldn't break the bank. Providing value is our uncompromised promise.</p>
          </div>
          <div className="space-y-4">
             <div className="w-12 h-12 mx-auto border border-accent-gold/40 flex items-center justify-center rounded-full text-accent-gold mb-6">
                <span className="font-heading text-xl">✦</span>
             </div>
             <h3 className="font-heading text-xl tracking-wide">Handpicked Elegance</h3>
             <p className="text-text-secondary text-sm leading-relaxed">Each piece is crafted and selected to bring you elegance, confidence, and shine for everyday or festive wear.</p>
          </div>
          <div className="space-y-4">
             <div className="w-12 h-12 mx-auto border border-accent-gold/40 flex items-center justify-center rounded-full text-accent-gold mb-6">
                <span className="font-heading text-xl">✦</span>
             </div>
             <h3 className="font-heading text-xl tracking-wide">Expression of Style</h3>
             <p className="text-text-secondary text-sm leading-relaxed">Jewellery is more than an accessory; it reflects your inner self and your most cherished lifelong moments.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
