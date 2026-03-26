import { MetadataRoute } from 'next';
import { DEFAULT_SITE_URL, getSiteUrl } from '@/lib/server/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl() || DEFAULT_SITE_URL;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/checkout/',
          '/cart/',
          '/orders/',
          '/profile/',
          '/pay/',
          '/preorders/',
          '/wishlist/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
