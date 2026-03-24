import { createClient } from '@supabase/supabase-js';
import { buildVariantOptionLabel } from '@/lib/api/sellable-variants';

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
    } | Array<{
      name?: string | null;
    }> | null;
  } | Array<{
    value?: string | null;
    product_options?: {
      name?: string | null;
    } | Array<{
      name?: string | null;
    }> | null;
  }> | null;
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
    } | Array<{
      title?: string | null;
      slug?: string | null;
      product_media?: Array<{
        media_url?: string | null;
        position?: number | null;
      }> | null;
    }> | null;
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

function normalizeVariantOptions(
  optionValues?: VariantOptionValueRow[] | null
) {
  return (optionValues || [])
    .map((item) => {
      const optionValueRow = Array.isArray(item?.product_option_values)
        ? item?.product_option_values[0]
        : item?.product_option_values;
      const optionRow = Array.isArray(optionValueRow?.product_options)
        ? optionValueRow?.product_options[0]
        : optionValueRow?.product_options;
      const optionName = optionRow?.name;
      const optionValue = optionValueRow?.value;
      return optionName && optionValue ? { name: optionName, value: optionValue } : null;
    })
    .filter((value): value is { name: string; value: string } => Boolean(value));
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
      product_title,
      product_slug,
      image_url,
      variant_title,
      variant_options,
      unit_price,
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
    const product = Array.isArray(preorder.product_variants?.products)
      ? preorder.product_variants?.products[0]
      : preorder.product_variants?.products;
    const media = (product?.product_media || []).slice().sort((a, b) => {
      return (a.position || 0) - (b.position || 0);
    });
    const snapshotOptions = Array.isArray((preorder as PreorderRow & { variant_options?: unknown }).variant_options)
      ? ((preorder as PreorderRow & { variant_options?: Array<{ name?: string; value?: string }> }).variant_options || [])
          .filter((option): option is { name: string; value: string } => Boolean(option?.name && option?.value))
      : [];
    const joinedVariantOptions = normalizeVariantOptions(preorder.product_variants?.variant_option_values);
    const variantLabel = (preorder as PreorderRow & { variant_title?: string | null }).variant_title
      || buildVariantOptionLabel(Object.fromEntries((snapshotOptions.length > 0 ? snapshotOptions : joinedVariantOptions).map((option) => [option.name, option.value])));

    return {
      id: preorder.id,
      quantity: preorder.quantity || 1,
      status: preorder.status || 'pending',
      createdAt: preorder.created_at,
      productName: (preorder as PreorderRow & { product_title?: string | null }).product_title || product?.title || 'Product unavailable',
      productSlug: (preorder as PreorderRow & { product_slug?: string | null }).product_slug || product?.slug || null,
      productImage: (preorder as PreorderRow & { image_url?: string | null }).image_url || media[0]?.media_url || null,
      variantLabel: variantLabel || null,
      unitPrice: (preorder as PreorderRow & { unit_price?: number | null }).unit_price || preorder.product_variants?.price || null,
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
    .select(`
      id,
      title,
      price,
      allow_preorder,
      products(title, slug, product_media(media_url, position)),
      variant_media(media_url, position),
      variant_option_values(
        product_option_values(
          value,
          product_options(name)
        )
      )
    `)
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

  const optionValues = normalizeVariantOptions(variant.variant_option_values);
  const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
  const variantTitle = variant.title || buildVariantOptionLabel(Object.fromEntries(optionValues.map((option) => [option.name, option.value]))) || 'Default Variant';
  const variantImage = (variant.variant_media || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .find((media) => media.media_url)?.media_url
    || (product?.product_media || [])
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .find((media) => media.media_url)?.media_url
    || null;

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
      product_title: product?.title || null,
      product_slug: product?.slug || null,
      image_url: variantImage,
      variant_title: variantTitle,
      variant_options: optionValues,
      unit_price: variant.price || null,
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
