/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabase';
import { Product } from './home';

const CATEGORY_BASE_SELECT = 'id, name, parent_id, image_url';
const CATEGORY_BANNER_SELECT = `${CATEGORY_BASE_SELECT}, banner_kicker, banner_title, banner_description, banner_image_url, banner_mobile_image_url`;

type CategoryBannerRow = {
  id: string;
  name: string;
  parent_id: string | null;
  image_url: string | null;
  banner_kicker?: string | null;
  banner_title?: string | null;
  banner_description?: string | null;
  banner_image_url?: string | null;
  banner_mobile_image_url?: string | null;
};

async function getCategoryBannerRowBySlug(slug: string): Promise<CategoryBannerRow | null> {
  const { data, error } = await supabase
    .from('categories')
    .select(CATEGORY_BANNER_SELECT)
    .eq('slug', slug)
    .single();

  if (!error && data) {
    return data as CategoryBannerRow;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('categories')
    .select(CATEGORY_BASE_SELECT)
    .eq('slug', slug)
    .single();

  if (fallbackError || !fallbackData) {
    return null;
  }

  return fallbackData as CategoryBannerRow;
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
      product_media ( media_url, position ),
      categories!inner( id, slug, parent_id )
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

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query.limit(50);

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
      stock,
      allow_preorder: defaultVariant.allow_preorder || false,
      is_free_delivery: p.is_free_delivery,
      rating: p.rating,
      review_count: p.review_count,
      brand: p.brand,
      categoryId: p.categories?.id,
      parentCategoryId: p.categories?.parent_id,
      variantId: defaultVariant.id,
      variants,
    };
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
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
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  const d = data as any;
  const variants = (d.product_variants || []).map((v: any) => {
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
  const sortedMedia = (d.product_media || []).sort((a: Record<string, number>, b: Record<string, number>) => a.position - b.position);
  const stock = defaultVariant.stock || 0;
  
  return {
    id: d.id,
    name: d.title,
    slug: d.slug,
    description: d.description,
    material: d.material,
    care_instructions: d.care_instructions,
    features: d.features,
    price: defaultVariant.price || 0,
    original_price: defaultVariant.compare_at_price || undefined,
    image: sortedMedia[0]?.media_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80',
    images: sortedMedia.map((m: Record<string, string>) => m.media_url),
    stock,
    allow_preorder: defaultVariant.allow_preorder || false,
    is_free_delivery: d.is_free_delivery,
    rating: d.rating,
    review_count: d.review_count,
    brand: d.brand,
    collection: d.collection,
    gender: d.gender,
    return_policy: d.return_policy,
    categoryId: d.categories?.id,
    parentCategoryId: d.categories?.parent_id,
    variantId: defaultVariant.id,
    variants,
  };
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

  const products = data.map((p: Record<string, any>) => {
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
      stock,
      allow_preorder: defaultVariant.allow_preorder || false,
      is_free_delivery: p.is_free_delivery,
      rating: p.rating,
      review_count: p.review_count,
      brand: p.brand,
      categoryId: p.category_id,
      parentCategoryId: null, // Depending on payload we might not have it here unless queried
      variantId: defaultVariant.id,
      variants,
    };
  });

  return {
    products,
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
