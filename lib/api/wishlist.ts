import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export async function isProductWishlisted(user: User, productId: string): Promise<boolean> {
  if (!user?.id) return false;

  const token = await getAccessToken();
  if (!token) return false;

  const response = await fetch(`/api/account/wishlist?productId=${encodeURIComponent(productId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return false;
  }

  const payload = await response.json() as { isWishlisted?: boolean };
  return Boolean(payload.isWishlisted);
}

export async function toggleWishlistProduct(user: User, productId: string) {
  if (!user?.id) {
    throw new Error('Please log in to use your wishlist.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please log in again to use your wishlist.');
  }

  const response = await fetch('/api/account/wishlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId }),
  });

  const payload = await response.json().catch(() => null) as { error?: string; isWishlisted?: boolean } | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Could not update wishlist.');
  }

  return {
    isWishlisted: Boolean(payload?.isWishlisted),
  };
}
