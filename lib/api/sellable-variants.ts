/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product } from './home';

export const SELLABLE_VARIANT_SELECT = `
  id,
  title,
  option_signature,
  sellable_status,
  is_default,
  variant_rank,
  price,
  compare_at_price,
  allow_preorder,
  inventory_items ( location_id, available_quantity, reserved_quantity ),
  variant_media ( media_url, position ),
  variant_option_values (
    option_value_id,
    product_option_values ( value, position, option_id, product_options ( name, position ) )
  )
`;

type ProductVariantLike = {
  id: string;
  title?: string | null;
  option_signature?: string | null;
  sellable_status?: string | null;
  is_default?: boolean | null;
  variant_rank?: number | null;
  price?: number | null;
  compare_at_price?: number | null;
  allow_preorder?: boolean | null;
  inventory_items?: Array<{
    available_quantity?: number | null;
    reserved_quantity?: number | null;
  }> | null;
  variant_media?: Array<{
    media_url?: string | null;
    position?: number | null;
  }> | null;
  variant_option_values?: Array<{
    product_option_values?: {
      value?: string | null;
      position?: number | null;
      product_options?: {
        name?: string | null;
        position?: number | null;
      } | null;
    } | null;
  }> | null;
};

export type ProductRowLike = Record<string, any> & {
  id: string;
  title: string;
  slug: string;
  is_free_delivery?: boolean | null;
  description?: string | null;
  material?: string | null;
  care_instructions?: string | null;
  features?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  brand?: string | null;
  collection?: string | null;
  gender?: string | null;
  return_policy?: string | null;
  product_variants?: ProductVariantLike[] | null;
  product_media?: Array<{ media_url?: string | null; position?: number | null }> | null;
  categories?: { id?: string | null; parent_id?: string | null } | null;
  category_id?: string | null;
};

function compareNullableNumber(left?: number | null, right?: number | null) {
  return Number(left || 0) - Number(right || 0);
}

export function buildVariantOptionLabel(options: Record<string, string> = {}) {
  const parts = Object.entries(options).map(([name, value]) => `${name}: ${value}`);
  return parts.length > 0 ? parts.join(' / ') : null;
}

export function projectSellableVariants(rawVariants: ProductVariantLike[] = []) {
  const normalized = rawVariants
    .map((variant) => {
      const optionEntries = (variant.variant_option_values || [])
        .map((entry) => {
          const option = entry.product_option_values?.product_options;
          const value = entry.product_option_values?.value;

          if (!option?.name || !value) {
            return null;
          }

          return {
            name: option.name,
            value,
            optionPosition: option.position || 0,
            valuePosition: entry.product_option_values?.position || 0,
          };
        })
        .filter(Boolean) as Array<{
          name: string;
          value: string;
          optionPosition: number;
          valuePosition: number;
        }>;

      optionEntries.sort((left, right) => {
        if (left.optionPosition !== right.optionPosition) {
          return left.optionPosition - right.optionPosition;
        }

        if (left.valuePosition !== right.valuePosition) {
          return left.valuePosition - right.valuePosition;
        }

        return left.name.localeCompare(right.name) || left.value.localeCompare(right.value);
      });

      const options = Object.fromEntries(optionEntries.map((entry) => [entry.name, entry.value]));
      const variantMedia = (variant.variant_media || [])
        .slice()
        .sort((left, right) => compareNullableNumber(left.position, right.position))
        .map((media) => media.media_url)
        .filter((value): value is string => Boolean(value));

      const stock = (variant.inventory_items || []).reduce((sum, item) => {
        const available = Number(item?.available_quantity || 0);
        const reserved = Number(item?.reserved_quantity || 0);
        return sum + Math.max(0, available - reserved);
      }, 0);

      return {
        id: variant.id,
        title: variant.title || undefined,
        option_signature: variant.option_signature || null,
        sellable_status: variant.sellable_status || 'draft',
        is_default: Boolean(variant.is_default),
        variant_rank: Number(variant.variant_rank || 0),
        price: Number(variant.price || 0),
        compare_at_price: variant.compare_at_price ?? undefined,
        allow_preorder: Boolean(variant.allow_preorder),
        stock,
        options,
        images: variantMedia,
      };
    })
    .filter((variant) => variant.sellable_status === 'sellable');

  normalized.sort((left, right) => {
    if (left.is_default !== right.is_default) {
      return left.is_default ? -1 : 1;
    }

    if (left.variant_rank !== right.variant_rank) {
      return left.variant_rank - right.variant_rank;
    }

    return left.title?.localeCompare(right.title || '') || 0;
  });

  return normalized;
}

export function pickDefaultSellableVariant(variants: ReturnType<typeof projectSellableVariants>) {
  if (variants.length === 0) {
    return null;
  }

  return (
    variants.find((variant) => variant.is_default && variant.stock > 0) ||
    variants.find((variant) => variant.stock > 0) ||
    variants.find((variant) => variant.is_default) ||
    variants.find((variant) => variant.allow_preorder) ||
    variants[0]
  );
}

export function projectProductRow(row: ProductRowLike): Product {
  const variants = projectSellableVariants(row.product_variants || []);
  const defaultVariant = pickDefaultSellableVariant(variants);
  const productMedia = (row.product_media || [])
    .slice()
    .sort((left, right) => compareNullableNumber(left.position, right.position))
    .map((media) => media.media_url)
    .filter((value): value is string => Boolean(value));
  const effectiveImages = defaultVariant?.images?.length ? defaultVariant.images : productMedia;
  const primaryImage = effectiveImages[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80';

  return {
    id: row.id,
    name: row.title,
    slug: row.slug,
    description: row.description || undefined,
    material: row.material || undefined,
    care_instructions: row.care_instructions || undefined,
    features: row.features || undefined,
    price: defaultVariant?.price || 0,
    original_price: defaultVariant?.compare_at_price,
    image: primaryImage,
    images: effectiveImages,
    stock: defaultVariant?.stock || 0,
    allow_preorder: defaultVariant?.allow_preorder || false,
    is_free_delivery: row.is_free_delivery ?? undefined,
    rating: row.rating ?? undefined,
    review_count: row.review_count ?? undefined,
    brand: row.brand || undefined,
    collection: row.collection || undefined,
    gender: row.gender || undefined,
    return_policy: row.return_policy || undefined,
    categoryId: row.categories?.id ?? row.category_id ?? undefined,
    parentCategoryId: row.categories?.parent_id ?? undefined,
    variantId: defaultVariant?.id,
    variants,
  };
}
