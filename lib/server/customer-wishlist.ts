import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeFullName(fullName: string | null | undefined) {
  return fullName?.trim().replace(/\s+/g, ' ') ?? '';
}

function splitFullName(fullName: string | null | undefined) {
  const normalized = normalizeFullName(fullName);
  const [firstName = '', ...rest] = normalized.split(' ');

  return {
    firstName: firstName || null,
    lastName: rest.join(' ') || null,
  };
}

async function getOrCreateCustomerId(input: {
  email: string;
  fullName?: string | null;
  phone?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const { firstName, lastName } = splitFullName(input.fullName);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from('customers')
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      phone: input.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single<{ id: string }>();

  if (createError || !created?.id) {
    throw createError || new Error('Could not create customer.');
  }

  return created.id;
}

async function getOrCreateWishlistId(customerId: string) {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('wishlists')
    .select('id')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existing = existingRows?.[0];
  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from('wishlists')
    .insert({ customer_id: customerId })
    .select('id')
    .single<{ id: string }>();

  if (createError || !created?.id) {
    throw createError || new Error('Could not create wishlist.');
  }

  return created.id;
}

export async function getWishlistState(input: {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  productId: string;
}) {
  const customerId = await getOrCreateCustomerId(input);
  const wishlistId = await getOrCreateWishlistId(customerId);

  const { data: rows, error } = await supabaseAdmin
    .from('wishlist_items')
    .select('id')
    .eq('wishlist_id', wishlistId)
    .eq('product_id', input.productId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  return { isWishlisted: Boolean(rows?.[0]?.id) };
}

export async function toggleWishlistState(input: {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  productId: string;
}) {
  const customerId = await getOrCreateCustomerId(input);
  const wishlistId = await getOrCreateWishlistId(customerId);

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('wishlist_items')
    .select('id')
    .eq('wishlist_id', wishlistId)
    .eq('product_id', input.productId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existing = existingRows?.[0];
  if (existing?.id) {
    const { error: deleteError } = await supabaseAdmin
      .from('wishlist_items')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      throw deleteError;
    }

    return { isWishlisted: false };
  }

  const { error: insertError } = await supabaseAdmin
    .from('wishlist_items')
    .insert({
      wishlist_id: wishlistId,
      product_id: input.productId,
    });

  if (insertError) {
    throw insertError;
  }

  return { isWishlisted: true };
}
