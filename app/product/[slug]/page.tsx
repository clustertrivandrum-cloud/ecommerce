import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/api/product";
import { getSiteUrl } from "@/lib/server/site-url";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Product } from "@/lib/api/home";
import VariantSelectorShell from "./VariantSelectorShell";

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
  const siteUrl = getSiteUrl();
  const primaryImage = product.images?.[0] || product.image;

  return {
    title,
    description,
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/product/${product.slug}`,
      images: primaryImage
        ? [
            {
              url: primaryImage,
              alt: product.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: primaryImage ? [primaryImage] : undefined,
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

  return (
    <Suspense>
      <ProductPageInner product={product} />
    </Suspense>
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
