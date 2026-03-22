import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  type ShippingSettings,
} from '@/lib/shipping';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AppSettingsRow = {
  free_shipping_threshold?: number | string | null;
  kerala_shipping_charge?: number | string | null;
  other_states_shipping_charge?: number | string | null;
  homepage_slides?: unknown;
  announcement_bar_enabled?: boolean | null;
  announcement_text?: string | null;
  announcement_link_label?: string | null;
  announcement_link_href?: string | null;
  announcement_background?: string | null;
  announcement_text_color?: string | null;
  promise_kicker_text?: string | null;
  promise_title?: string | null;
  promise_description?: string | null;
  promise_image_url?: string | null;
  hero_badge_text?: string | null;
  hero_title?: string | null;
  hero_highlight_text?: string | null;
  hero_description?: string | null;
  hero_cta_label?: string | null;
  hero_cta_href?: string | null;
  hero_image_url?: string | null;
};

export type HomepageSlide = {
  id: string;
  badgeText: string;
  title: string;
  highlightText: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  mobileImageUrl: string;
};

export type HomeBannerSettings = {
  slides: HomepageSlide[];
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
    background: string;
    textColor: string;
  };
  promiseKickerText: string;
  promiseTitle: string;
  promiseDescription: string;
  promiseImageUrl: string;
};

const DEFAULT_SLIDES: HomepageSlide[] = [
  {
    id: 'hero-1',
    badgeText: 'Cluster Fascination',
    title: 'Adorn Yourself',
    highlightText: 'In Gold.',
    description: 'Anti-tarnish gold-plated jewellery crafted for everyday elegance. From bracelets to earrings, each piece tells a story.',
    ctaLabel: 'Shop All Collections',
    ctaHref: '/category',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=80',
    mobileImageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80',
  }
];

export const DEFAULT_HOME_BANNER_SETTINGS: HomeBannerSettings = {
  slides: DEFAULT_SLIDES,
  announcement: {
    enabled: false,
    text: '',
    linkLabel: '',
    linkHref: '',
    background: '#111111',
    textColor: '#f5f5f5',
  },
  promiseKickerText: 'Our Promise',
  promiseTitle: 'Gold That Lasts.',
  promiseDescription: 'Every piece in our collection is 18K gold-plated and anti-tarnish — built to maintain its shine through daily wear. No nickel, no compromises. Just timeless jewellery made for real life.',
  promiseImageUrl: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80',
};

function normalizeText(value: string | null | undefined, fallback = '') {
  return value?.trim() || fallback;
}

function normalizeSlide(row: Partial<HomepageSlide>, index: number): HomepageSlide {
  const imageUrl = normalizeText(row.imageUrl, DEFAULT_SLIDES[0].imageUrl);
  return {
    id: normalizeText(row.id, `hero-${index + 1}`),
    badgeText: normalizeText(row.badgeText, DEFAULT_SLIDES[0].badgeText),
    title: normalizeText(row.title, DEFAULT_SLIDES[0].title),
    highlightText: normalizeText(row.highlightText, DEFAULT_SLIDES[0].highlightText),
    description: normalizeText(row.description, DEFAULT_SLIDES[0].description),
    ctaLabel: normalizeText(row.ctaLabel, DEFAULT_SLIDES[0].ctaLabel),
    ctaHref: normalizeText(row.ctaHref, DEFAULT_SLIDES[0].ctaHref),
    imageUrl,
    mobileImageUrl: normalizeText(row.mobileImageUrl, imageUrl),
  };
}

function parseSlides(raw: unknown, row?: AppSettingsRow | null): HomepageSlide[] {
  const parsed = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (() => {
          try {
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
          } catch {
            return [];
          }
        })()
      : [];

  if (parsed.length === 0) {
    return [
      normalizeSlide({
        id: 'hero-1',
        badgeText: row?.hero_badge_text || undefined,
        title: row?.hero_title || undefined,
        highlightText: row?.hero_highlight_text || undefined,
        description: row?.hero_description || undefined,
        ctaLabel: row?.hero_cta_label || undefined,
        ctaHref: row?.hero_cta_href || undefined,
        imageUrl: row?.hero_image_url || undefined,
        mobileImageUrl: row?.hero_image_url || undefined,
      }, 0),
    ];
  }

  return parsed.slice(0, 5).map((slide, index) => normalizeSlide((slide || {}) as Partial<HomepageSlide>, index));
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('free_shipping_threshold, kerala_shipping_charge, other_states_shipping_charge')
    .single<AppSettingsRow>();

  if (error || !data) {
    return DEFAULT_SHIPPING_SETTINGS;
  }

  return normalizeShippingSettings({
    freeShippingThreshold: data.free_shipping_threshold == null ? undefined : Number(data.free_shipping_threshold),
    keralaShippingCharge: data.kerala_shipping_charge == null ? undefined : Number(data.kerala_shipping_charge),
    otherStatesShippingCharge: data.other_states_shipping_charge == null ? undefined : Number(data.other_states_shipping_charge),
  });
}

export async function getHomeBannerSettings(): Promise<HomeBannerSettings> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('homepage_slides, announcement_bar_enabled, announcement_text, announcement_link_label, announcement_link_href, announcement_background, announcement_text_color, promise_kicker_text, promise_title, promise_description, promise_image_url, hero_badge_text, hero_title, hero_highlight_text, hero_description, hero_cta_label, hero_cta_href, hero_image_url')
    .single<AppSettingsRow>();

  if (error || !data) {
    return DEFAULT_HOME_BANNER_SETTINGS;
  }

  return {
    slides: parseSlides(data.homepage_slides, data),
    announcement: {
      enabled: data.announcement_bar_enabled ?? DEFAULT_HOME_BANNER_SETTINGS.announcement.enabled,
      text: normalizeText(data.announcement_text),
      linkLabel: normalizeText(data.announcement_link_label),
      linkHref: normalizeText(data.announcement_link_href),
      background: normalizeText(data.announcement_background, DEFAULT_HOME_BANNER_SETTINGS.announcement.background),
      textColor: normalizeText(data.announcement_text_color, DEFAULT_HOME_BANNER_SETTINGS.announcement.textColor),
    },
    promiseKickerText: normalizeText(data.promise_kicker_text, DEFAULT_HOME_BANNER_SETTINGS.promiseKickerText),
    promiseTitle: normalizeText(data.promise_title, DEFAULT_HOME_BANNER_SETTINGS.promiseTitle),
    promiseDescription: normalizeText(data.promise_description, DEFAULT_HOME_BANNER_SETTINGS.promiseDescription),
    promiseImageUrl: normalizeText(data.promise_image_url, DEFAULT_HOME_BANNER_SETTINGS.promiseImageUrl),
  };
}
