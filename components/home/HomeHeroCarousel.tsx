'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomepageSlide } from '@/lib/server/app-settings';

type HomeHeroCarouselProps = {
  slides: HomepageSlide[];
};

export function HomeHeroCarousel({ slides }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeIndex] || slides[0];

  return (
    <section className="relative h-[85vh] w-full overflow-hidden bg-card">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <Image
            src={slide.imageUrl}
            alt={slide.title}
            fill
            priority={index === 0}
            className="hidden object-cover object-center md:block"
            sizes="100vw"
          />
          <Image
            src={slide.mobileImageUrl || slide.imageUrl}
            alt={slide.title}
            fill
            priority={index === 0}
            className="object-cover object-center md:hidden"
            sizes="100vw"
          />
        </div>
      ))}

      <div className="absolute inset-0 z-10 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 md:p-16">
        <span className="w-fit border border-accent-gold/30 px-4 py-1 text-sm font-medium uppercase tracking-[0.3em] text-accent-gold">
          {activeSlide.badgeText}
        </span>
        <h1 className="text-5xl font-heading font-medium leading-[1.05] tracking-tight md:text-7xl">
          {activeSlide.title}
          <br />
          <span className="text-accent-gold">{activeSlide.highlightText}</span>
        </h1>
        <p className="mt-2 mb-4 max-w-md text-base leading-relaxed text-text-secondary">
          {activeSlide.description}
        </p>
        <Link
          href={activeSlide.ctaHref}
          className="group inline-flex w-fit items-center justify-center gap-3 bg-accent-gold px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary transition-all hover:bg-text-primary active:scale-95"
        >
          {activeSlide.ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {slides.length > 1 ? (
        <>
          <div className="absolute right-6 top-6 z-20 flex gap-2 md:right-10 md:top-10">
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current - 1 + slides.length) % slides.length)}
              className="rounded-full border border-white/20 bg-black/30 p-2 text-white backdrop-blur hover:bg-black/45"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
              className="rounded-full border border-white/20 bg-black/30 p-2 text-white backdrop-blur hover:bg-black/45"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-10">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-10 bg-accent-gold' : 'w-2.5 bg-white/55'}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
