import { MetadataRoute } from 'next';
import { DEFAULT_SITE_URL, getSiteUrl } from '@/lib/server/site-url';
import { getProducts } from '@/lib/api/product';
import { getCategories } from '@/lib/api/home';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl() || DEFAULT_SITE_URL;

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/category`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/shipping-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Dynamic: Categories
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categories = await getCategories();
    categoryRoutes = categories.map((cat) => ({
      url: `${siteUrl}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // silently skip if DB unavailable at build time
  }

  // Dynamic: Products
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts();
    productRoutes = products.map((product) => ({
      url: `${siteUrl}/product/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // silently skip if DB unavailable at build time
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
