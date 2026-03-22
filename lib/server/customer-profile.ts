import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeFullName(fullName: string) {
  return fullName.trim().replace(/\s+/g, ' ');
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/\s+/g, ' ');
}

function splitFullName(fullName: string) {
  const normalized = normalizeFullName(fullName);
  const [firstName = '', ...rest] = normalized.split(' ');

  return {
    firstName,
    lastName: rest.join(' ') || null,
  };
}

export async function syncCustomerProfile(input: {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  existingUserMetadata?: Record<string, unknown> | null;
}) {
  const email = normalizeEmail(input.email);
  const fullName = normalizeFullName(input.fullName);
  const phone = normalizePhone(input.phone);

  if (!input.userId || !email || !fullName || !phone) {
    throw new Error('User id, email, full name, and phone are required.');
  }

  const { firstName, lastName } = splitFullName(fullName);

  const [
    { error: profileError },
    { error: usersError },
    { data: customer, error: customerError },
    authUpdateResult,
  ] = await Promise.all([
    supabaseAdmin.from('user_profiles').upsert(
      {
        id: input.userId,
        full_name: fullName,
        phone,
      },
      { onConflict: 'id' }
    ),
    supabaseAdmin.from('users').upsert(
      {
        id: input.userId,
        email,
        full_name: fullName,
      },
      { onConflict: 'id' }
    ),
    supabaseAdmin
      .from('customers')
      .upsert(
        {
          email,
          first_name: firstName || null,
          last_name: lastName,
          phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single<{ id: string }>(),
    supabaseAdmin.auth.admin.updateUserById(input.userId, {
      user_metadata: {
        ...(input.existingUserMetadata ?? {}),
        full_name: fullName,
        phone,
      },
    }),
  ]);

  if (profileError) {
    throw profileError;
  }

  if (usersError) {
    throw usersError;
  }

  if (customerError) {
    throw customerError;
  }

  if (authUpdateResult.error) {
    throw authUpdateResult.error;
  }

  return {
    customerId: customer?.id ?? null,
    fullName,
    phone,
  };
}
