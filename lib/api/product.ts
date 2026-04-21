/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabase';
import { Product } from './home';
import { projectProductRow, SELLABLE_VARIANT_SELECT, type ProductRowLike } from './sellable-variants';

type CategoryBannerRow = {
  id: string;
  name: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  banner_kicker?: string | null;
  banner_title?: string | null;
  banner_description?: string | null;
  banner_image_url?: string | null;
  banner_mobile_image_url?: string | null;
};

async function getCategoryBannerRowBySlug(slug: string): Promise<CategoryBannerRow | null> {
  // Single query — banner columns are part of the live schema
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, parent_id, image_url, sort_order, banner_kicker, banner_title, banner_description, banner_image_url, banner_mobile_image_url')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('getCategoryBannerRowBySlug error:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    parent_id: data.parent_id ?? null,
    image_url: data.image_url ?? null,
    sort_order: Number(data.sort_order ?? 0),
    banner_kicker: (data as any).banner_kicker ?? null,
    banner_title: (data as any).banner_title ?? null,
    banner_description: (data as any).banner_description ?? null,
    banner_image_url: (data as any).banner_image_url ?? null,
    banner_mobile_image_url: (data as any).banner_mobile_image_url ?? null,
  };
}

export type CategoryBanner = {
  id: string;
  name: string;
  bannerKicker: string;
  bannerTitle: string;
  bannerDescription: string;
  bannerImage: string;
  bannerMobileImage: string;
};

export async function getProducts(categorySlug?: string, search?: string): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select(`
      id,
      title,
      slug,
      is_free_delivery,
      material,
      collection,
      rating,
      review_count,
      brand,
      product_variants (
        ${SELLABLE_VARIANT_SELECT}
      ),
      product_media ( media_url, position ),
      categories ( id, slug, parent_id )
    `)
    .eq('status', 'active');

  if (categorySlug) {
    // Fetch the category id safely, then include its children
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (cat?.id) {
      const { data: children } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', cat.id);
      const ids = [cat.id, ...(children || []).map((c: any) => c.id)];
      query = query.in('category_id', ids);
    } else {
      // fall back to slug match
      query = query.eq('categories.slug', categorySlug);
    }
  }

  // Normalize search: strip hyphens so "anti tarnish" matches "Anti-Tarnish"
  // We generate two patterns: one for exact input, one for hyphen ↔ space variant
  const searchTerm = search?.trim().replace(/[,%]/g, ' ');

  if (searchTerm) {
    // Generate both variants: "anti tarnish" → also try "anti-tarnish" and vice versa
    const withHyphen = searchTerm.replace(/\s+/g, '-');
    const withSpace = searchTerm.replace(/-+/g, ' ');

    const patterns = [...new Set([searchTerm, withHyphen, withSpace])]; // unique patterns

    const orClauses = patterns.flatMap((term) => {
      const p = `%${term}%`;
      return [
        `title.ilike.${p}`,
        `brand.ilike.${p}`,
        `material.ilike.${p}`,
        `collection.ilike.${p}`,
      ];
    });

    query = query.or(orClauses.join(','));
  }


  const { data, error } = await query.limit(50);

  if (error || !data) return [];

  return data.map((p: Record<string, any>) => projectProductRow(p as ProductRowLike));
}

export async function getAllProductSlugs(): Promise<{slug: string}[]> {
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .eq('status', 'active');
    
  if (error || !data) return [];
  
  return data as {slug: string}[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      slug,
      description,
      material,
      care_instructions,
      features,
      is_free_delivery,
      rating,
      review_count,
      brand,
      collection,
      gender,
      return_policy,
      categories ( id, name, slug, parent_id ),
      product_variants (
        ${SELLABLE_VARIANT_SELECT}
      ),
      product_media ( media_url, position )
    `)
    .eq('slug', normalizedSlug)
    .single();

  if (error || !data) return null;

  return projectProductRow(data as ProductRowLike);
}

// Fetch products under a category AND all its subcategories
export async function getProductsByCategory(categorySlug: string): Promise<{ products: Product[]; categoryName: string; categoryBanner: CategoryBanner | null }> {
  // 1. Find the category
  const catData = await getCategoryBannerRowBySlug(categorySlug);

  if (!catData) return { products: [], categoryName: '', categoryBanner: null };

  // 2. Collect all valid category IDs (category itself + all its children)
  const { data: allCats } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', catData.id);

  const catIds = [catData.id, ...(allCats || []).map(c => c.id)];

  // 3. Fetch products in those categories
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, title, slug, is_free_delivery, rating, review_count, brand,
      product_variants (
        ${SELLABLE_VARIANT_SELECT}
      ),
      product_media ( media_url, position ),
      category_id
    `)
    .in('category_id', catIds)
    .eq('status', 'active');

  if (error || !data) {
    return {
      products: [],
      categoryName: catData.name,
      categoryBanner: {
        id: catData.id,
        name: catData.name,
        bannerKicker: catData.banner_kicker || 'Collection',
        bannerTitle: catData.banner_title || catData.name,
        bannerDescription: catData.banner_description || `Explore everything in ${catData.name}.`,
        bannerImage: catData.banner_image_url || catData.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80',
        bannerMobileImage: catData.banner_mobile_image_url || catData.banner_image_url || catData.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      },
    };
  }

  const products = data.map((p: Record<string, any>) => projectProductRow(p as ProductRowLike));

  return {
    products,
    categoryName: catData.name,
    categoryBanner: {
      id: catData.id,
      name: catData.name,
      bannerKicker: catData.banner_kicker || 'Collection',
      bannerTitle: catData.banner_title || catData.name,
      bannerDescription: catData.banner_description || `Explore everything in ${catData.name}.`,
      bannerImage: catData.banner_image_url || catData.image_url || (products.length > 0 ? products[0].image : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80'),
      bannerMobileImage: catData.banner_mobile_image_url || catData.banner_image_url || catData.image_url || (products.length > 0 ? products[0].image : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80'),
    },
  };
}
