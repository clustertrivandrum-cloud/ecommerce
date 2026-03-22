/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabase';

const CATEGORY_BASE_SELECT = 'id, name, slug, image_url, parent_id';
const CATEGORY_BANNER_SELECT = `${CATEGORY_BASE_SELECT}, banner_kicker, banner_title, banner_description, banner_image_url, banner_mobile_image_url`;

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  banner_kicker?: string | null;
  banner_title?: string | null;
  banner_description?: string | null;
  banner_image_url?: string | null;
  banner_mobile_image_url?: string | null;
};

async function fetchCategoryRows(filter?: { parentId?: string; slug?: string }): Promise<CategoryRow[]> {
  let query = supabase.from('categories').select(CATEGORY_BANNER_SELECT);

  if (filter?.parentId) query = query.eq('parent_id', filter.parentId);
  if (filter?.slug) query = query.eq('slug', filter.slug);

  const { data, error } = await query.order('name');

  if (!error && data) {
    return data as CategoryRow[];
  }

  let fallbackQuery = supabase.from('categories').select(CATEGORY_BASE_SELECT);

  if (filter?.parentId) fallbackQuery = fallbackQuery.eq('parent_id', filter.parentId);
  if (filter?.slug) fallbackQuery = fallbackQuery.eq('slug', filter.slug);

  const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('name');

  if (fallbackError || !fallbackData) {
    return [];
  }

  return fallbackData as CategoryRow[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  parentId: string | null;
  bannerKicker?: string;
  bannerTitle?: string;
  bannerDescription?: string;
  bannerImage?: string;
  bannerMobileImage?: string;
  subcategories?: Category[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  image: string;
  images?: string[];
  is_bestseller?: boolean;
  stock: number;
  allow_preorder: boolean;
  is_free_delivery?: boolean;
  material?: string;
  care_instructions?: string;
  features?: string[];
  description?: string;
  rating?: number;
  review_count?: number;
  brand?: string;
  collection?: string;
  gender?: string;
  return_policy?: string;
  categoryId?: string | null;
  parentCategoryId?: string | null;
  variantId?: string;
  variants?: {
    id: string;
    price: number;
    compare_at_price?: number;
    allow_preorder?: boolean;
    stock: number;
    options: Record<string, string>;
  }[];
}

// Fetch all categories (both parent and sub)
export async function getCategories(): Promise<Category[]> {
  const data = await fetchCategoryRows();

  if (!data.length) return [];

  // Top-level categories only (parent_id is null)
  const parents = data.filter(c => c.parent_id === null).map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.banner_image_url || cat.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80',
    parentId: null,
    bannerKicker: cat.banner_kicker || undefined,
    bannerTitle: cat.banner_title || undefined,
    bannerDescription: cat.banner_description || undefined,
    bannerImage: cat.banner_image_url || undefined,
    bannerMobileImage: cat.banner_mobile_image_url || undefined,
    subcategories: data
      .filter(sub => sub.parent_id === cat.id)
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        image: sub.banner_image_url || sub.image_url || cat.banner_image_url || cat.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80',
        parentId: cat.id,
        bannerKicker: sub.banner_kicker || undefined,
        bannerTitle: sub.banner_title || undefined,
        bannerDescription: sub.banner_description || undefined,
        bannerImage: sub.banner_image_url || undefined,
        bannerMobileImage: sub.banner_mobile_image_url || undefined,
      }))
  }));

  return parents;
}

// Fetch subcategories for a specific parent
export async function getSubcategories(parentSlug: string): Promise<Category[]> {
  // First get parent
  const parentRows = await fetchCategoryRows({ slug: parentSlug });
  const parent = parentRows[0];

  if (!parent) return [];

  const data = await fetchCategoryRows({ parentId: parent.id });

  return (data || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.banner_image_url || cat.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80',
    parentId: cat.parent_id,
    bannerKicker: cat.banner_kicker || undefined,
    bannerTitle: cat.banner_title || undefined,
    bannerDescription: cat.banner_description || undefined,
    bannerImage: cat.banner_image_url || undefined,
    bannerMobileImage: cat.banner_mobile_image_url || undefined,
  }));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      slug,
      is_free_delivery,
      description,
      material,
      is_featured,
      rating,
      review_count,
      brand,
      product_variants (
        id,
        price,
        compare_at_price,
        allow_preorder,
        inventory_items ( location_id, available_quantity ),
        variant_option_values (
          option_value_id,
          product_option_values ( value, option_id, product_options ( name ) )
        )
      ),
      product_media ( media_url, position )
    `)
    .eq('is_featured', true)
    .eq('status', 'active')
    .limit(8);

  if (error || !data) return [];

  return data.map((p: Record<string, any>) => {
    const variants = (p.product_variants || []).map((v: any) => {
      const stock = (v.inventory_items || []).reduce(
        (sum: number, row: any) => sum + (row?.available_quantity || 0),
        0
      );
      const options: Record<string, string> = {};
      (v.variant_option_values || []).forEach((ov: any) => {
        const optName = ov.product_option_values?.product_options?.name;
        const optVal = ov.product_option_values?.value;
        if (optName && optVal) options[optName] = optVal;
      });
      return { ...v, stock, options };
    });
    const defaultVariant = variants.find((v: any) => v.stock > 0) || variants[0] || {};
    const sortedMedia = (p.product_media || []).sort((a: Record<string, number>, b: Record<string, number>) => a.position - b.position);
    const stock = defaultVariant.stock || 0;
    
    return {
      id: p.id,
      name: p.title,
      slug: p.slug,
      price: defaultVariant.price || 0,
      original_price: defaultVariant.compare_at_price || undefined,
      image: sortedMedia[0]?.media_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80',
      images: sortedMedia.map((m: Record<string, string>) => m.media_url),
      is_bestseller: true,
      stock,
      allow_preorder: defaultVariant.allow_preorder || false,
      is_free_delivery: p.is_free_delivery,
      description: p.description,
      material: p.material,
      rating: p.rating,
      review_count: p.review_count,
      brand: p.brand,
      variantId: defaultVariant.id,
      variants,
    };
  });
}
