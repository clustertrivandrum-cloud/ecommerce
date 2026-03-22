import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CreatePreorderInput = {
  email: string;
  variantId: string;
  quantity?: number;
};

type VariantOptionValueRow = {
  product_option_values?: {
    value?: string | null;
    product_options?: {
      name?: string | null;
    } | null;
  } | null;
};

type PreorderRow = {
  id: string;
  quantity: number | null;
  status: string | null;
  created_at: string;
  order_id?: string | null;
  orders?: {
    id?: string | null;
    order_number?: number | null;
    financial_status?: string | null;
  } | null;
  product_variants?: {
    id: string;
    price: number | null;
    products?: {
      title?: string | null;
      slug?: string | null;
      product_media?: Array<{
        media_url?: string | null;
        position?: number | null;
      }> | null;
    } | null;
    variant_option_values?: Array<{
      product_option_values?: VariantOptionValueRow['product_option_values'];
    }> | null;
  } | null;
};

export type CustomerPreorderSummary = {
  id: string;
  quantity: number;
  status: string;
  createdAt: string;
  productName: string;
  productSlug: string | null;
  productImage: string | null;
  variantLabel: string | null;
  unitPrice: number | null;
  orderId: string | null;
  orderNumber: number | null;
  orderFinancialStatus: string | null;
};

function formatVariantLabel(
  optionValues?: VariantOptionValueRow[] | null
) {
  const parts = (optionValues || [])
    .map((item) => {
      const optionName = item?.product_option_values?.product_options?.name;
      const optionValue = item?.product_option_values?.value;
      return optionName && optionValue ? `${optionName}: ${optionValue}` : null;
    })
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(' / ') : null;
}

export async function listCustomerPreordersByEmail(email: string): Promise<CustomerPreorderSummary[]> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return [];
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (customerError) {
    throw customerError;
  }

  if (!customer?.id) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('preorders')
    .select(`
      id,
      quantity,
      status,
      created_at,
      order_id,
      orders (
        id,
        order_number,
        financial_status
      ),
      product_variants (
        id,
        price,
        products (
          title,
          slug,
          product_media ( media_url, position )
        ),
        variant_option_values (
          product_option_values (
            value,
            product_options ( name )
          )
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as unknown as PreorderRow[]).map((preorder) => {
    const media = (preorder.product_variants?.products?.product_media || []).slice().sort((a, b) => {
      return (a.position || 0) - (b.position || 0);
    });

    return {
      id: preorder.id,
      quantity: preorder.quantity || 1,
      status: preorder.status || 'pending',
      createdAt: preorder.created_at,
      productName: preorder.product_variants?.products?.title || 'Product unavailable',
      productSlug: preorder.product_variants?.products?.slug || null,
      productImage: media[0]?.media_url || null,
      variantLabel: formatVariantLabel(preorder.product_variants?.variant_option_values),
      unitPrice: preorder.product_variants?.price || null,
      orderId: preorder.order_id || preorder.orders?.id || null,
      orderNumber: preorder.orders?.order_number || null,
      orderFinancialStatus: preorder.orders?.financial_status || null,
    };
  });
}

export async function createPreorderReservation({
  email,
  variantId,
  quantity = 1,
}: CreatePreorderInput) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!variantId) {
    throw new Error('A product variant is required for preorder.');
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be at least 1.');
  }

  const { data: variant, error: variantError } = await supabaseAdmin
    .from('product_variants')
    .select('id, allow_preorder')
    .eq('id', variantId)
    .maybeSingle();

  if (variantError) {
    throw variantError;
  }

  if (!variant) {
    throw new Error('Selected variant could not be found.');
  }

  if (!variant.allow_preorder) {
    throw new Error('This variant is not currently available for preorder.');
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .upsert(
      {
        email: normalizedEmail,
      },
      {
        onConflict: 'email',
      }
    )
    .select('id')
    .single();

  if (customerError || !customer) {
    throw customerError || new Error('Customer record could not be created.');
  }

  const { data: existingReservation, error: existingReservationError } = await supabaseAdmin
    .from('preorders')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('variant_id', variantId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingReservationError) {
    throw existingReservationError;
  }

  if (existingReservation) {
    return {
      preorderId: existingReservation.id,
      alreadyReserved: true,
    };
  }

  const { data: preorder, error: preorderError } = await supabaseAdmin
    .from('preorders')
    .insert({
      customer_id: customer.id,
      variant_id: variantId,
      quantity,
      status: 'pending',
    })
    .select('id')
    .single();

  if (preorderError || !preorder) {
    throw preorderError || new Error('Preorder reservation could not be saved.');
  }

  return {
    preorderId: preorder.id,
    alreadyReserved: false,
  };
}
