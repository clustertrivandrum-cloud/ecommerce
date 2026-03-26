import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/api/product";
import { DEFAULT_SITE_URL, getSiteUrl } from "@/lib/server/site-url";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Product } from "@/lib/api/home";
import VariantSelectorShell from "./VariantSelectorShell";
import Script from "next/script";

function getProductDescription(product: Product) {
  if (product.description?.trim()) {
    return product.description.trim();
  }

  const fallback = [product.brand, product.collection, product.material]
    .filter(Boolean)
    .join(" • ");

  return fallback || "Explore this product from Cluster Fascination.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Cluster Fascination",
      description: "The requested product could not be found.",
    };
  }

  const title = `${product.name} | Cluster Fascination`;
  const description = getProductDescription(product);
  const primaryImage = product.images?.[0] || product.image;

  return {
    title,
    description,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/product/${product.slug}`,
      images: primaryImage
        ? [{ url: primaryImage, alt: product.name }]
        : [{ url: '/og-image.png', alt: 'Cluster Fascination' }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: primaryImage ? [primaryImage] : ['/og-image.png'],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const siteUrl = getSiteUrl() || DEFAULT_SITE_URL;
  const primaryImage = product.images?.[0] || product.image;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — Cluster Fascination`,
    image: product.images?.length ? product.images : primaryImage ? [primaryImage] : [],
    brand: { '@type': 'Brand', name: 'Cluster Fascination' },
    url: `${siteUrl}/product/${product.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: String(product.price),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Cluster Fascination' },
      url: `${siteUrl}/product/${product.slug}`,
    },
  };

  return (
    <>
      <Script
        id="product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Suspense>
        <ProductPageInner product={product} />
      </Suspense>
    </>
  );
}

function getOptionSchema(variants: Product["variants"] = []) {
  const optionMap: Record<string, Set<string>> = {};
  variants.forEach((v) => {
    Object.entries(v.options || {}).forEach(([name, val]) => {
      if (!optionMap[name]) optionMap[name] = new Set();
      optionMap[name].add(val as string);
    });
  });
  return Object.entries(optionMap).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

function ProductPageInner({ product }: { product: Product }) {
  const optionSchema = getOptionSchema(product.variants);
  const defaultVariant =
    product.variants?.find((variant) => variant.id === product.variantId) ||
    product.variants?.[0];
  const initialSelection: Record<string, string> = { ...(defaultVariant?.options || {}) };

  return (
    <VariantSelectorShell
      key={product.id}
      product={product}
      optionSchema={optionSchema}
      initialSelection={initialSelection}
    />
  );
}
