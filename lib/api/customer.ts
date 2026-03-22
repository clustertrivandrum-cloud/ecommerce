import { supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type UserProfileRow = {
  full_name: string | null;
  phone: string | null;
};

export type CustomerProfileState = {
  customerId: string | null;
  fullName: string;
  phone: string;
  needsOnboarding: boolean;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

function normalizeFullName(fullName: string | null | undefined) {
  return fullName?.trim().replace(/\s+/g, ' ') ?? '';
}

function normalizePhone(phone: string | null | undefined) {
  return phone?.trim().replace(/\s+/g, ' ') ?? '';
}

function joinCustomerName(customer: CustomerRow | null) {
  if (!customer) return '';

  return normalizeFullName([customer.first_name, customer.last_name].filter(Boolean).join(' '));
}

function splitFullName(fullName: string) {
  const normalized = normalizeFullName(fullName);
  const [firstName = '', ...rest] = normalized.split(' ');

  return {
    firstName,
    lastName: rest.join(' ') || null,
  };
}

export async function getCustomerProfileState(user: User): Promise<CustomerProfileState> {
  const email = normalizeEmail(user.email);

  if (!email) {
    return {
      customerId: null,
      fullName: '',
      phone: '',
      needsOnboarding: true,
    };
  }

  const [{ data: customer, error: customerError }, { data: userProfile, error: profileError }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('email', email)
      .maybeSingle<CustomerRow>(),
    supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle<UserProfileRow>(),
  ]);

  if (customerError) {
    console.error('Failed to read customer profile:', customerError);
  }

  if (profileError) {
    console.error('Failed to read user profile:', profileError);
  }

  const metadata = user.user_metadata ?? {};
  const fullName = normalizeFullName(
    userProfile?.full_name ||
      joinCustomerName(customer ?? null) ||
      (typeof metadata.full_name === 'string' ? metadata.full_name : '')
  );
  const phone = normalizePhone(
    userProfile?.phone ||
      customer?.phone ||
      (typeof metadata.phone === 'string' ? metadata.phone : '')
  );

  return {
    customerId: customer?.id ?? null,
    fullName,
    phone,
    needsOnboarding: !fullName || !phone,
  };
}

export async function saveCustomerProfile(
  user: User,
  input: { fullName: string; phone: string }
): Promise<string | null> {
  const email = normalizeEmail(user.email);
  const fullName = normalizeFullName(input.fullName);
  const phone = normalizePhone(input.phone);

  if (!email || !fullName || !phone) {
    throw new Error('Name, email, and phone are required.');
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      phone,
    },
  });

  if (authUpdateError) {
    throw authUpdateError;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }

  const response = await fetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      fullName,
      phone,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || 'Could not save profile.');
  }

  const payload = await response.json() as { customerId?: string | null };
  return payload.customerId ?? null;
}

// Helper to reliably get or create a customer record for an authenticated user
export async function getOrCreateCustomer(user: User): Promise<string | null> {
  const email = normalizeEmail(user.email);

  if (!email) return null;

  const profile = await getCustomerProfileState(user);
  if (profile.customerId) return profile.customerId;

  const { firstName, lastName } = splitFullName(profile.fullName);

  const { data: newCust, error: createError } = await supabase
    .from('customers')
    .upsert(
      {
        email,
        first_name: firstName || null,
        last_name: lastName,
        phone: profile.phone || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  if (createError) {
    console.error('Customer creation failed:', createError);
    return null;
  }

  return newCust?.id || null;
}
