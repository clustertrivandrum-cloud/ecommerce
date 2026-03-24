"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Package, RotateCcw, Share2, Star, Truck } from "lucide-react";
import { Product } from "@/lib/api/home";
import { ProductActions } from "@/components/product/ProductActions";
import { NoticeBanner } from "@/components/ui/NoticeBanner";

type OptionSchema = { name: string; values: string[] };
type OptionValueState = {
  disabled: boolean;
  badge?: string;
  reason?: string;
};

function formatVariantLabel(options: Record<string, string> = {}) {
  const entries = Object.entries(options);
  if (entries.length === 0) return undefined;
  return entries.map(([name, value]) => `${name}: ${value}`).join(' / ');
}

function resolveVariant(variants: Product["variants"] = [], selected: Record<string, string>) {
  return variants.find((v) => {
    const opts = v.options || {};
    return Object.keys(selected).every((key) => opts[key] === selected[key]);
  });
}

function getOptionValueState(
  variants: Product["variants"] = [],
  selected: Record<string, string>,
  optionName: string,
  optionValue: string
) : OptionValueState {
  const matchingVariants = variants.filter((variant) => {
    const options = variant.options || {};
    if (options[optionName] !== optionValue) return false;

    return Object.entries(selected).every(([key, value]) => {
      if (key === optionName) return true;
      return options[key] === value;
    });
  });

  if (matchingVariants.length === 0) {
    return {
      disabled: true,
      badge: "Unavailable",
      reason: "This option combination does not exist.",
    };
  }

  const hasInStockVariant = matchingVariants.some((variant) => (variant.stock || 0) > 0);
  if (hasInStockVariant) {
    return { disabled: false };
  }

  const hasPreorderVariant = matchingVariants.some((variant) => variant.allow_preorder);
  if (hasPreorderVariant) {
    return {
      disabled: false,
      badge: "Preorder",
      reason: "This option is available on preorder.",
    };
  }

  return {
    disabled: true,
    badge: "Sold Out",
    reason: "This option is currently out of stock.",
  };
}

export default function VariantSelectorShell({
  product,
  optionSchema,
  initialSelection,
}: {
  product: Product;
  optionSchema: OptionSchema[];
  initialSelection: Record<string, string>;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(initialSelection);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [shareState, setShareState] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const selectedVariant = useMemo(
    () => resolveVariant(product.variants, selected),
    [product.variants, selected]
  );

  const isUnavailable = optionSchema.length > 0 && !selectedVariant;
  const allowPreorder = isUnavailable ? false : (selectedVariant?.allow_preorder ?? product.allow_preorder);
  const isSoldOut = !isUnavailable && (selectedVariant?.stock ?? product.stock ?? 0) === 0 && !allowPreorder;
  const isPreorder = !isUnavailable && (selectedVariant?.stock ?? product.stock ?? 0) === 0 && allowPreorder;
  const price = selectedVariant?.price ?? product.price ?? 0;
  const compareAt = selectedVariant?.compare_at_price ?? product.original_price;
  const discount = compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const images = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images
    : product.images && product.images.length > 0
      ? product.images
      : [product.image];
  const activeImage = images[activeImageIndex] || images[0];
  const currentStock = selectedVariant?.stock ?? product.stock ?? 0;
  const selectedVariantLabel =
    selectedVariant?.title && selectedVariant.title !== 'Default Variant'
      ? selectedVariant.title
      : formatVariantLabel(selectedVariant?.options);

  useEffect(() => {
    setActiveImageIndex(0);
    setShareState(null);
  }, [product.id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariant?.id]);

  async function handleShare() {
    const shareUrl = window.location.href;
    const shareText = [product.brand, selectedVariantLabel, `₹${price.toFixed(0)}`]
      .filter(Boolean)
      .join(" • ");

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText || product.name,
          url: shareUrl,
        });
        setShareState({
          tone: "success",
          message: `${product.name} is ready to share.`,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareState({
          tone: "success",
          message: "Product link copied to clipboard.",
        });
        return;
      }

      throw new Error("Sharing is not supported in this browser.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareState({
        tone: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Could not share this product right now.",
      });
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-12 md:py-20 min-h-screen">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-secondary mb-8">
        <Link href="/" className="hover:text-accent-gold transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/category" className="hover:text-accent-gold transition-colors">Collections</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
        {/* Left: Image Gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative aspect-square w-full bg-card overflow-hidden">
            <Image
              src={activeImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-accent-mint text-primary text-xs px-3 py-1 font-bold tracking-widest z-10">
                {discount}% OFF
              </span>
            )}
            {isPreorder && (
              <span className="absolute top-4 left-4 bg-accent-gold text-primary text-xs px-3 py-1 font-bold tracking-widest z-10">
                PREORDER
              </span>
            )}
          </div>
          {/* Thumbnail row */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => {
                const isActive = i === activeImageIndex;

                return (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative aspect-square overflow-hidden bg-card transition-colors ${
                      isActive ? "border border-accent-gold" : "border border-transparent hover:border-accent-gold"
                    }`}
                    aria-label={`View image ${i + 1} of ${images.length}`}
                  >
                  <Image
                    src={img}
                    alt={`${product.name} view ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Product Details */}
        <div className="flex flex-col">
          {/* Brand & Collection */}
          {product.brand && (
            <span className="text-accent-gold text-xs uppercase tracking-widest font-medium mb-2">{product.brand}</span>
          )}

          <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight leading-tight mb-4">
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating && product.rating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {Array(5).fill(0).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(product.rating!) ? "text-accent-gold fill-accent-gold" : "text-border"}`}
                  />
                ))}
              </div>
              <span className="text-text-secondary text-sm">({product.review_count} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-end gap-3 mb-6 pb-6 border-b border-border">
            <span className="text-3xl font-semibold">₹{price.toFixed(0)}</span>
            {compareAt && (
              <span className="text-lg text-text-secondary/80 line-through font-light mb-0.5">
                ₹{compareAt.toFixed(0)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-accent-gold text-sm font-medium mb-0.5">Save ₹{(compareAt! - price).toFixed(0)}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/72 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-text-secondary backdrop-blur-sm transition-colors hover:border-accent-gold hover:text-accent-gold"
            >
              <Share2 className="h-4 w-4" />
              Share Product
            </button>
            <span className="text-xs uppercase tracking-[0.22em] text-text-secondary">
              Link preview now uses this product&apos;s own title, image, and description.
            </span>
          </div>

          {shareState ? (
            <NoticeBanner
              tone={shareState.tone}
              className="mb-6"
              onDismiss={() => setShareState(null)}
            >
              {shareState.message}
            </NoticeBanner>
          ) : null}

          {/* Variant options */}
          {optionSchema.length > 0 && (
            <div className="space-y-4 mb-6">
              {optionSchema.map((opt) => (
                <div key={opt.name} className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-text-secondary">{opt.name}</label>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const active = selected[opt.name] === val;
                      const optionState = getOptionValueState(product.variants, selected, opt.name, val);
                      return (
                        <span
                          key={val}
                          title={optionState.reason}
                          className="inline-flex"
                        >
                          <button
                            type="button"
                            disabled={optionState.disabled}
                            aria-label={optionState.reason ? `${val} - ${optionState.reason}` : val}
                            onClick={() => setSelected((prev) => ({ ...prev, [opt.name]: val }))}
                            className={`px-3 py-2 border text-sm rounded-md transition-colors ${
                              optionState.disabled
                                ? "border-border bg-card/60 text-text-secondary/50 cursor-not-allowed opacity-60"
                                : active
                                ? "border-text-primary text-text-primary bg-card"
                                : "border-border bg-card/72 text-text-secondary hover:border-text-primary"
                            }`}
                          >
                            <span className="flex flex-col items-start gap-1">
                              <span>{val}</span>
                              {optionState.badge && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                                    optionState.disabled
                                      ? "bg-border text-text-secondary"
                                      : "bg-accent-gold/15 text-accent-gold"
                                  }`}
                                >
                                  {optionState.badge}
                                </span>
                              )}
                            </span>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stock & Actions */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
              <div
                className={`w-2 h-2 rounded-full ${
                  isUnavailable ? "bg-text-secondary" : isSoldOut ? "bg-red-500" : isPreorder ? "bg-accent-gold" : "bg-accent-mint"
                }`}
              />
              {isUnavailable
                ? "This combination is unavailable"
                : isSoldOut
                ? "Currently out of stock"
                : isPreorder
                  ? "Available for Preorder — Ships in 3 weeks"
                  : currentStock <= 5
                    ? `Only ${currentStock} left in stock!`
                    : "In Stock"}
            </div>

            <ProductActions
              product={product}
              isStickyMobile
              selectedVariant={{
                id: selectedVariant?.id,
                price,
                stock: isUnavailable ? 0 : currentStock,
                allowPreorder,
                label: selectedVariantLabel,
                image: images[0] || product.image,
              }}
            />
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-4 mb-8 py-6 border-y border-border">
            <div className="flex flex-col items-center gap-1 text-center">
              <Truck className="w-4 h-4 text-accent-gold" />
              <span className="text-[10px] text-text-secondary uppercase tracking-widest">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Package className="w-4 h-4 text-accent-gold" />
              <span className="text-[10px] text-text-secondary uppercase tracking-widest">Secure Pack</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <RotateCcw className="w-4 h-4 text-accent-gold" />
              <span className="text-[10px] text-text-secondary uppercase tracking-widest">
                {product.return_policy || "Easy Return"}
              </span>
            </div>
          </div>

          {/* Product Info Accordion */}
          <div className="space-y-4 text-sm">
            {product.description && (
              <div className="pb-4 border-b border-border">
                <h3 className="font-heading tracking-widest text-xs uppercase mb-3 text-text-secondary">Description</h3>
                <p className="text-text-secondary leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.material && (
              <div className="pb-4 border-b border-border">
                <h3 className="font-heading tracking-widest text-xs uppercase mb-2 text-text-secondary">Material</h3>
                <p className="text-text-secondary">{product.material}</p>
              </div>
            )}

            {product.features && product.features.length > 0 && (
              <div className="pb-4 border-b border-border">
                <h3 className="font-heading tracking-widest text-xs uppercase mb-3 text-text-secondary">Features</h3>
                <ul className="space-y-1.5 text-text-secondary">
                  {product.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent-gold mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.care_instructions && (
              <div className="pb-4">
                <h3 className="font-heading tracking-widest text-xs uppercase mb-3 text-text-secondary">Care Instructions</h3>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line">{product.care_instructions}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
