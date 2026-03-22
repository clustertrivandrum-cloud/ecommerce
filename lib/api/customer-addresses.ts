import { supabase } from '@/lib/supabase';
import type { CustomerAddress, CustomerAddressInput } from '@/lib/customer-addresses';

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Please sign in to manage saved addresses.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function getCustomerAddresses() {
  const response = await fetch('/api/account/addresses', {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });

  const payload = await response.json() as {
    error?: string;
    addresses?: CustomerAddress[];
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load saved addresses.');
  }

  return payload.addresses ?? [];
}

export async function createCustomerAddress(input: CustomerAddressInput) {
  const response = await fetch('/api/account/addresses', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await response.json() as {
    error?: string;
    address?: CustomerAddress;
  };

  if (!response.ok || !payload.address) {
    throw new Error(payload.error || 'Could not save address.');
  }

  return payload.address;
}

export async function updateCustomerAddress(id: string, input: CustomerAddressInput) {
  const response = await fetch(`/api/account/addresses/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await response.json() as {
    error?: string;
    address?: CustomerAddress;
  };

  if (!response.ok || !payload.address) {
    throw new Error(payload.error || 'Could not update address.');
  }

  return payload.address;
}
