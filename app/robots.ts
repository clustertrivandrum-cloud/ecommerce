import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/server/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl() || 'https://clusterfascination.com';
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
