/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabase';
import { projectProductRow, SELLABLE_VARIANT_SELECT, type ProductRowLike } from './sellable-variants';

const CATEGORY_BASE_SELECT = 'id, name, slug, image_url, parent_id, sort_order';
const CATEGORY_BANNER_SELECT = `${CATEGORY_BASE_SELECT}, banner_kicker, banner_title, banner_description, banner_image_url, banner_mobile_image_url`;

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
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

  const { data, error } = await query.order('sort_order').order('name');

  if (!error && data) {
    return data as CategoryRow[];
  }

  let fallbackQuery = supabase.from('categories').select(CATEGORY_BASE_SELECT);

  if (filter?.parentId) fallbackQuery = fallbackQuery.eq('parent_id', filter.parentId);
  if (filter?.slug) fallbackQuery = fallbackQuery.eq('slug', filter.slug);

  const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('sort_order').order('name');

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
  sortOrder: number;
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
    title?: string;
    option_signature?: string | null;
    price: number;
    compare_at_price?: number;
    allow_preorder?: boolean;
    stock: number;
    options: Record<string, string>;
    images?: string[];
  }[];
}

// Fetch all categories (both parent and sub)
export async function getCategories(): Promise<Category[]> {
  const data = await fetchCategoryRows();

  if (!data.length) return [];

  // Find categories missing images
  const missingImageIds = data.filter(c => !c.banner_image_url && !c.image_url).map(c => c.id);
  const categoryImageMap: Record<string, string> = {};

  if (missingImageIds.length > 0) {
    const { data: fallbackMedia } = await supabase
      .from('products')
      .select('category_id, product_media ( media_url )')
      .in('category_id', missingImageIds)
      .eq('status', 'active');
      
    if (fallbackMedia) {
      for (const item of fallbackMedia) {
        if (!categoryImageMap[item.category_id] && item.product_media && (item.product_media as any[]).length > 0) {
          categoryImageMap[item.category_id] = (item.product_media as any[])[0].media_url;
        }
      }
    }
  }

  const getCatImage = (cat: any) => cat.banner_image_url || cat.image_url || categoryImageMap[cat.id] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80';

  // Top-level categories only (parent_id is null)
  const parents = data.filter(c => c.parent_id === null).map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: getCatImage(cat),
    parentId: null,
    sortOrder: cat.sort_order ?? 0,
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
        image: getCatImage(sub),
        parentId: cat.id,
        sortOrder: sub.sort_order ?? 0,
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
  if (!data || !data.length) return [];

  const missingImageIds = data.filter(c => !c.banner_image_url && !c.image_url).map(c => c.id);
  const categoryImageMap: Record<string, string> = {};

  if (missingImageIds.length > 0) {
    const { data: fallbackMedia } = await supabase
      .from('products')
      .select('category_id, product_media ( media_url )')
      .in('category_id', missingImageIds)
      .eq('status', 'active');
      
    if (fallbackMedia) {
      for (const item of fallbackMedia) {
        if (!categoryImageMap[item.category_id] && item.product_media && (item.product_media as any[]).length > 0) {
          categoryImageMap[item.category_id] = (item.product_media as any[])[0].media_url;
        }
      }
    }
  }

  const getCatImage = (cat: any) => cat.banner_image_url || cat.image_url || categoryImageMap[cat.id] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80';

  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: getCatImage(cat),
    parentId: cat.parent_id,
    sortOrder: cat.sort_order ?? 0,
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
        ${SELLABLE_VARIANT_SELECT}
      ),
      product_media ( media_url, position )
    `)
    .eq('is_featured', true)
    .eq('status', 'active')
    .limit(8);

  if (error || !data) return [];

  return data.map((p: Record<string, any>) => ({
    ...projectProductRow(p as ProductRowLike),
    is_bestseller: true,
  }));
}
