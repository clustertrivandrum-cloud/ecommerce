import { createClient } from '@supabase/supabase-js';
import type { CustomerAddress, CustomerAddressInput } from '@/lib/customer-addresses';
import { normalizeAddressInput } from '@/lib/customer-addresses';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CustomerRow = {
  id: string;
};

type CustomerAddressRow = {
  id: string;
  customer_id: string;
  full_name: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean | null;
  created_at: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapAddressRow(row: CustomerAddressRow): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    addressLine: row.address_line ?? '',
    apartment: '',
    city: row.city ?? '',
    state: row.state ?? '',
    pincode: row.pincode ?? '',
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

async function ensureCustomerByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const { data: existingCustomer, error: customerReadError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle<CustomerRow>();

  if (customerReadError) {
    throw customerReadError;
  }

  if (existingCustomer?.id) {
    return existingCustomer.id;
  }

  const { data: createdCustomer, error: customerCreateError } = await supabaseAdmin
    .from('customers')
    .insert({
      email: normalizedEmail,
    })
    .select('id')
    .single<CustomerRow>();

  if (customerCreateError || !createdCustomer?.id) {
    throw customerCreateError || new Error('Could not create customer.');
  }

  return createdCustomer.id;
}

export async function listCustomerAddressesByEmail(email: string) {
  const customerId = await ensureCustomerByEmail(email);

  const { data, error } = await supabaseAdmin
    .from('customer_addresses')
    .select('id, customer_id, full_name, phone, address_line, city, state, pincode, is_default, created_at')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapAddressRow(row as CustomerAddressRow));
}

export async function saveCustomerAddressByEmail(input: {
  email: string;
  address: CustomerAddressInput;
  addressId?: string;
}) {
  const customerId = await ensureCustomerByEmail(input.email);
  const normalized = normalizeAddressInput(input.address);

  const { count, error: countError } = await supabaseAdmin
    .from('customer_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId);

  if (countError) {
    throw countError;
  }

  const shouldBeDefault = normalized.isDefault || !count;

  if (shouldBeDefault) {
    const { error: resetDefaultError } = await supabaseAdmin
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);

    if (resetDefaultError) {
      throw resetDefaultError;
    }
  }

  const payload = {
    customer_id: customerId,
    full_name: normalized.fullName,
    phone: normalized.phone,
    address_line: normalized.addressLine,
    city: normalized.city,
    state: normalized.state,
    pincode: normalized.pincode,
    is_default: shouldBeDefault,
  };

  const query = input.addressId
    ? supabaseAdmin
        .from('customer_addresses')
        .update(payload)
        .eq('id', input.addressId)
        .eq('customer_id', customerId)
    : supabaseAdmin.from('customer_addresses').insert(payload);

  const { data, error } = await query
    .select('id, customer_id, full_name, phone, address_line, city, state, pincode, is_default, created_at')
    .single<CustomerAddressRow>();

  if (error || !data) {
    throw error || new Error('Could not save address.');
  }

  return mapAddressRow(data);
}
