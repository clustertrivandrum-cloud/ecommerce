import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import type { CartItemInput, CheckoutData } from '@/lib/api/order';
import { validateCoupon, incrementCouponUse } from '@/lib/server/coupons';
import { sendOrderInvoiceEmail } from '@/lib/server/order-email';
import { calculateShippingCharge } from '@/lib/shipping';
import { getShippingSettings } from '@/lib/server/app-settings';
import { buildVariantOptionLabel } from '@/lib/api/sellable-variants';

const PAYMENT_REQUEST_TTL_HOURS = Number(process.env.PAYMENT_REQUEST_TTL_HOURS || 24);

type PaymentStatus = 'pending' | 'paid' | 'failed';

type OrderItemRow = {
  variant_id: string | null;
  quantity: number;
};

type WebhookEventStatus = 'processing' | 'processed' | 'ignored' | 'failed';

type WebhookEventRow = {
  id: string;
  delivery_id: string;
  event_type: string;
  status: WebhookEventStatus;
  first_seen_at: string;
  processed_at: string | null;
  last_error: string | null;
};

type PaymentRequestOrderItem = {
  id: string;
  title: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type PaymentRequestOrder = {
  id: string;
  orderNumber: number | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  grandTotal: number;
  currency: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  createdAt: string;
  paymentRequestCreatedAt: string | null;
  items: PaymentRequestOrderItem[];
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function calculateGrandTotal(data: CheckoutData, subtotal: number, couponAmount = 0) {
  const taxTotal = 0;
  const discount = Math.max(data.discountAmount || 0, couponAmount);
  const shippingSettings = await getShippingSettings();
  const shippingCharge =
    calculateShippingCharge({
      subtotal,
      discount,
      state: data.address.state,
      settings: shippingSettings,
    }) ?? shippingSettings.otherStatesShippingCharge;
  const grandTotal = Math.max(0, subtotal - discount) + shippingCharge + taxTotal;

  return { taxTotal, discount, shippingCharge, grandTotal };
}

type VariantRow = {
  id: string;
  sku?: string | null;
  title?: string | null;
  price: number | null;
  allow_preorder?: boolean | null;
  sellable_status?: string | null;
  inventory_items: Array<{ available_quantity: number | null; reserved_quantity?: number | null; location_id?: string | null }> | null;
  products?: {
    title?: string | null;
    slug?: string | null;
    status?: string | null;
    product_media?: Array<{ media_url?: string | null; position?: number | null }> | null;
  } | null;
  variant_media?: Array<{ media_url?: string | null; position?: number | null }> | null;
  variant_option_values?: Array<{
    product_option_values?: {
      value?: string | null;
      position?: number | null;
      product_options?: {
        name?: string | null;
        position?: number | null;
      } | null;
    } | null;
  }> | null;
};

type SnapshotOption = {
  name: string;
  value: string;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value: string | null | undefined) {
  const normalized = value?.trim() || '';
  return normalized || null;
}

function normalizeFullName(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

function splitFullName(fullName: string) {
  const normalized = normalizeFullName(fullName);
  const [firstName = '', ...rest] = normalized.split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || null,
  };
}

async function resolveCheckoutCustomerId(data: CheckoutData) {
  const email = normalizeEmail(data.guestEmail);
  if (!email) {
    return null;
  }

  const fullName = normalizeFullName(
    data.guestName || `${data.address.firstName} ${data.address.lastName}`
  );
  const phone = normalizePhone(data.guestPhone);
  const { firstName, lastName } = splitFullName(fullName);

  const { data: customer, error } = await supabaseAdmin
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
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return customer?.id ?? null;
}

function buildOrderAddressPayload(data: CheckoutData) {
  const fullName = normalizeFullName(
    data.guestName || `${data.address.firstName} ${data.address.lastName}`
  );

  return {
    name: fullName,
    line1: data.address.addressLine.trim(),
    line2: data.address.apartment?.trim() || '',
    city: data.address.city.trim(),
    state: data.address.state?.trim() || '',
    postal_code: data.address.pincode.trim(),
    country: 'India',
    phone: normalizePhone(data.guestPhone) || '',
  };
}

async function fetchVariantPricingAndStock(items: CartItemInput[]) {
  const variantIds = items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
  if (variantIds.length === 0) {
    throw new Error('No variants provided for checkout.');
  }

  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select(`
      id,
      sku,
      title,
      price,
      allow_preorder,
      sellable_status,
      inventory_items(available_quantity, reserved_quantity, location_id),
      products(title, slug, status, product_media(media_url, position)),
      variant_media(media_url, position),
      variant_option_values(
        product_option_values(
          value,
          position,
          product_options(name, position)
        )
      )
    `)
    .in('id', variantIds);

  if (error) {
    throw error;
  }

  const byId = new Map<string, VariantRow>();
  (data as VariantRow[] | null || []).forEach((row) => byId.set(row.id, row));
  return byId;
}

function getSnapshotOptions(variant: VariantRow): SnapshotOption[] {
  return (variant.variant_option_values || [])
    .map((entry) => {
      const option = entry.product_option_values?.product_options;
      const value = entry.product_option_values?.value;

      if (!option?.name || !value) {
        return null;
      }

      return {
        name: option.name,
        value,
        optionPosition: option.position || 0,
        valuePosition: entry.product_option_values?.position || 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const a = left as SnapshotOption & { optionPosition: number; valuePosition: number };
      const b = right as SnapshotOption & { optionPosition: number; valuePosition: number };

      if (a.optionPosition !== b.optionPosition) {
        return a.optionPosition - b.optionPosition;
      }

      if (a.valuePosition !== b.valuePosition) {
        return a.valuePosition - b.valuePosition;
      }

      return a.name.localeCompare(b.name) || a.value.localeCompare(b.value);
    })
    .map((entry) => ({ name: (entry as SnapshotOption).name, value: (entry as SnapshotOption).value }));
}

function getVariantAvailableStock(variant: VariantRow) {
  return (variant.inventory_items || []).reduce((sum, item) => {
    const available = Number(item?.available_quantity || 0);
    const reserved = Number(item?.reserved_quantity || 0);
    return sum + Math.max(0, available - reserved);
  }, 0);
}

function getVariantSnapshotImage(variant: VariantRow) {
  const variantImage = (variant.variant_media || [])
    .slice()
    .sort((left, right) => Number(left.position || 0) - Number(right.position || 0))
    .find((media) => media.media_url)?.media_url;

  if (variantImage) {
    return variantImage;
  }

  return (variant.products?.product_media || [])
    .slice()
    .sort((left, right) => Number(left.position || 0) - Number(right.position || 0))
    .find((media) => media.media_url)?.media_url || null;
}

function validateAndPriceItems(items: CartItemInput[], variants: Map<string, VariantRow>) {
  let subtotal = 0;
  const pricedItems = items.map((item) => {
    if (!item.variantId) {
      throw new Error('Each cart item must include a variant.');
    }

    const variant = variants.get(item.variantId);
    if (!variant) {
      throw new Error(`Variant ${item.variantId} is unavailable.`);
    }

    if ((variant.sellable_status || 'draft') !== 'sellable') {
      throw new Error(`Variant ${item.variantId} is not sellable.`);
    }

    const available = getVariantAvailableStock(variant);
    if (available < item.quantity) {
      throw new Error(`Insufficient stock for ${item.name || 'item'}.`);
    }

    const unitPrice = Number(variant.price ?? 0);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    const snapshotOptions = getSnapshotOptions(variant);
    const variantLabel = variant.title || buildVariantOptionLabel(Object.fromEntries(snapshotOptions.map((option) => [option.name, option.value])));

    return {
      order_id: '', // filled later
      variant_id: item.variantId,
      title: variant.products?.title || item.name || 'Order item',
      sku: variant.sku || item.id,
      product_slug: variant.products?.slug || item.slug || null,
      image_url: getVariantSnapshotImage(variant),
      variant_title: variantLabel || 'Default Variant',
      variant_options: snapshotOptions,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: lineTotal,
    };
  });

  return { pricedItems, subtotal };
}

async function reserveVariantQuantities(items: Array<{ variant_id: string; quantity: number }>, reference?: string | null) {
  const reserved: Array<{ variant_id: string; quantity: number }> = [];

  for (const item of items) {
    const { data: ok, error } = await supabaseAdmin.rpc('reserve_stock', {
      p_variant_id: item.variant_id,
      p_qty: item.quantity,
      p_reference: reference || null,
    });

    if (error || ok === false) {
      for (const prior of reserved.slice().reverse()) {
        await supabaseAdmin.rpc('release_stock', {
          p_variant_id: prior.variant_id,
          p_qty: prior.quantity,
          p_reference: reference || null,
        });
      }

      throw error || new Error('Insufficient stock for one or more items.');
    }

    reserved.push(item);
  }

  return reserved;
}

async function releaseVariantQuantities(items: Array<{ variant_id: string | null; quantity: number }>, reference?: string | null) {
  for (const item of items) {
    if (!item.variant_id) continue;

    await supabaseAdmin.rpc('release_stock', {
      p_variant_id: item.variant_id,
      p_qty: item.quantity,
      p_reference: reference || null,
    });
  }
}

export function hasRazorpayCredentials() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay() {
  if (!hasRazorpayCredentials()) {
    throw new Error('Razorpay keys are missing.');
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export function hasRazorpayWebhookSecret() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export async function createPendingOrder(data: CheckoutData, items: CartItemInput[]) {
  const variants = await fetchVariantPricingAndStock(items);
  const { pricedItems, subtotal } = validateAndPriceItems(items, variants);
  const customerId = await resolveCheckoutCustomerId(data);
  let couponAmount = 0;
  if (data.couponCode) {
    const coupon = await validateCoupon(data.couponCode, subtotal);
    if (!coupon.valid) {
      throw new Error(coupon.reason);
    }
    couponAmount = coupon.amountOff;
  }

  const { taxTotal, discount, shippingCharge, grandTotal } = await calculateGrandTotal(data, subtotal, couponAmount);
  const addressPayload = buildOrderAddressPayload(data);
  const fullName = normalizeFullName(
    data.guestName || `${data.address.firstName} ${data.address.lastName}`
  );
  const reserved = await reserveVariantQuantities(
    pricedItems.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity }))
  );

  const { data: orderParams, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: data.userId || null,
      customer_id: customerId,
      guest_email: normalizeEmail(data.guestEmail),
      guest_name: fullName,
      guest_phone: normalizePhone(data.guestPhone),
      financial_status: 'pending',
      fulfillment_status: 'pending',
      status: 'pending',
      subtotal,
      shipping_total: shippingCharge,
      discount_total: discount,
      discount_amount: discount,
      notes: data.couponCode ? `Used Coupon: ${data.couponCode}` : null,
      tax_total: taxTotal,
      grand_total: grandTotal,
      shipping_charge: shippingCharge,
      sales_channel: 'online',
      payment_method: hasRazorpayCredentials() ? 'Razorpay' : 'Manual',
      shipping_address: addressPayload,
      billing_address: addressPayload,
    })
    .select('id')
    .single();

  if (orderError || !orderParams) {
    await releaseVariantQuantities(reserved);
    throw orderError || new Error('Order creation failed.');
  }

  const orderId = orderParams.id;

  const { error: addressError } = await supabaseAdmin
    .from('order_addresses')
    .insert({
      order_id: orderId,
      full_name: fullName,
      phone: normalizePhone(data.guestPhone) || '',
      address_line: `${data.address.addressLine} ${data.address.apartment || ''}`.trim(),
      city: data.address.city,
      state: data.address.state || null,
      pincode: data.address.pincode,
    });

  if (addressError) {
    await releaseVariantQuantities(reserved, orderId);
    await supabaseAdmin.from('orders').delete().eq('id', orderId);
    throw addressError;
  }

  const orderItems = pricedItems.map((item) => ({
    ...item,
    order_id: orderId,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    await releaseVariantQuantities(reserved, orderId);
    await supabaseAdmin.from('orders').delete().eq('id', orderId);
    throw itemsError;
  }

  if (data.couponCode && couponAmount > 0) {
    await incrementCouponUse(data.couponCode);
  }

  return { orderId, grandTotal };
}

export async function createRetryPaymentSession(orderId: string) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, grand_total, financial_status, order_items(variant_id, quantity)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw orderError || new Error('Order not found.');
  }

  if (order.financial_status === 'paid') {
    throw new Error('Order is already paid.');
  }

  const amountInPaise = Math.round((order.grand_total || 0) * 100);
  if (amountInPaise <= 0) {
    throw new Error('Order total is invalid.');
  }

  if (!hasRazorpayCredentials()) {
    throw new Error('Razorpay is not configured.');
  }

  if ((order.financial_status || '').toLowerCase() === 'failed') {
    await reserveVariantQuantities(
      ((order.order_items || []) as OrderItemRow[])
        .filter((item): item is { variant_id: string; quantity: number } => Boolean(item.variant_id && item.quantity > 0)),
      orderId
    );
  }

  const razorpay = getRazorpay();
  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: orderId.substring(0, 40),
  });

  await upsertPaymentRecord({
    orderId,
    provider: 'razorpay',
    providerReference: razorpayOrder.id,
    amount: order.grand_total,
    status: 'pending',
  });

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ financial_status: 'pending', payment_method: 'Razorpay' })
    .eq('id', orderId)
    .neq('financial_status', 'paid');

  if (updateError) {
    throw updateError;
  }

  return {
    orderId,
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
  };
}

export async function ensureOrderPaymentRequestToken(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, payment_request_token')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw error || new Error('Order not found.');
  }

  if (order.payment_request_token) {
    return order.payment_request_token;
  }

  const token = randomUUID();
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_request_token: token,
      payment_request_created_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    throw updateError;
  }

  return token;
}

export async function getPaymentRequestOrderByToken(token: string): Promise<PaymentRequestOrder | null> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      guest_name,
      guest_email,
      guest_phone,
      grand_total,
      currency,
      financial_status,
      fulfillment_status,
      created_at,
      payment_request_created_at,
      order_items (
        id,
        title,
        quantity,
        unit_price,
        total_price
      )
    `)
    .eq('payment_request_token', token)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!order) {
    return null;
  }

  // Expire tokens
  if (order.payment_request_created_at) {
    const created = new Date(order.payment_request_created_at);
    const now = new Date();
    const ttlMs = PAYMENT_REQUEST_TTL_HOURS * 60 * 60 * 1000;
    if (now.getTime() - created.getTime() > ttlMs) {
      return null;
    }
  }

  // Ignore if already paid
  if ((order.financial_status || '').toLowerCase() === 'paid') {
    return null;
  }

  return {
    id: order.id,
    orderNumber: order.order_number || null,
    guestName: order.guest_name || null,
    guestEmail: order.guest_email || null,
    guestPhone: order.guest_phone || null,
    grandTotal: Number(order.grand_total || 0),
    currency: order.currency || 'INR',
    financialStatus: order.financial_status || null,
    fulfillmentStatus: order.fulfillment_status || null,
    createdAt: order.created_at,
    paymentRequestCreatedAt: order.payment_request_created_at || null,
    items: ((order.order_items || []) as PaymentRequestOrderItem[]).map((item) => ({
      id: item.id,
      title: item.title || null,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })),
  };
}

export async function createPaymentRequestSessionByToken(token: string) {
  const order = await getPaymentRequestOrderByToken(token);

  if (!order) {
    throw new Error('Payment request not found or expired.');
  }

  if (order.financialStatus === 'paid') {
    throw new Error('This order has already been paid.');
  }

  return createRetryPaymentSession(order.id);
}

export async function upsertPaymentRecord({
  orderId,
  provider,
  providerReference,
  amount,
  status,
}: {
  orderId: string;
  provider: string;
  providerReference: string;
  amount?: number;
  status: PaymentStatus;
}) {
  const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('order_id', orderId)
    .eq('provider', provider)
    .maybeSingle();

  if (existingPaymentError) {
    throw existingPaymentError;
  }

  const payload = {
    order_id: orderId,
    provider,
    provider_reference: providerReference,
    amount,
    status,
  };

  if (existingPayment?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update(payload)
      .eq('id', existingPayment.id);

    if (updateError) {
      throw updateError;
    }

    return existingPayment.id;
  }

  const { data: newPayment, error: insertError } = await supabaseAdmin
    .from('payments')
    .insert(payload)
    .select('id')
    .single();

  if (insertError || !newPayment) {
    throw insertError || new Error('Payment creation failed.');
  }

  return newPayment.id;
}

function aggregateOrderItems(items: OrderItemRow[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.variant_id) return acc;
    acc[item.variant_id] = (acc[item.variant_id] || 0) + item.quantity;
    return acc;
  }, {});
}

export async function finalizePaidOrder({
  orderId,
  provider,
  providerReference,
  amount,
}: {
  orderId: string;
  provider: string;
  providerReference: string;
  amount?: number;
}) {
  await upsertPaymentRecord({
    orderId,
    provider,
    providerReference,
    amount,
    status: 'paid',
  });

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('financial_status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw orderError || new Error('Order not found.');
  }

  if (order.financial_status === 'paid') {
    return;
  }

  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', orderId);

  if (orderItemsError) {
    throw orderItemsError;
  }

  const variantQuantities = aggregateOrderItems((orderItems || []) as OrderItemRow[]);

  for (const [variantId, quantity] of Object.entries(variantQuantities)) {
    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, available_quantity, reserved_quantity, location_id')
      .eq('variant_id', variantId)
      .limit(1)
      .single();

    if (inventoryError || !inventoryItem) {
      throw inventoryError || new Error(`Inventory not found for variant ${variantId}.`);
    }

    const { error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert({
        variant_id: variantId,
        location_id: inventoryItem.location_id,
        quantity: -quantity,
        movement_type: 'sale',
        reference_id: orderId,
      });

    if (movementError) {
      throw movementError;
    }

    const { error: inventoryUpdateError } = await supabaseAdmin
      .from('inventory_items')
      .update({
        available_quantity: Math.max(0, Number(inventoryItem.available_quantity || 0) - quantity),
        reserved_quantity: Math.max(0, Number(inventoryItem.reserved_quantity || 0) - quantity),
      })
      .eq('id', inventoryItem.id);

    if (inventoryUpdateError) {
      throw inventoryUpdateError;
    }
  }

  const { error: orderUpdateError } = await supabaseAdmin
    .from('orders')
    .update({ financial_status: 'paid' })
    .eq('id', orderId);

  if (orderUpdateError) {
    throw orderUpdateError;
  }

  try {
    await sendOrderInvoiceEmail(orderId);
  } catch (emailError) {
    console.error('Order invoice email failed', emailError);
  }
}

export async function markOrderPaymentFailed({
  orderId,
  provider,
  providerReference,
  amount,
}: {
  orderId: string;
  provider: string;
  providerReference: string;
  amount?: number;
}) {
  await upsertPaymentRecord({
    orderId,
    provider,
    providerReference,
    amount,
    status: 'failed',
  });

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('financial_status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw orderError || new Error('Order not found.');
  }

  const financialStatus = (order.financial_status || '').toLowerCase();
  if (financialStatus === 'paid') {
    return;
  }

  if (financialStatus !== 'failed') {
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    if (orderItemsError) {
      throw orderItemsError;
    }

    await releaseVariantQuantities((orderItems || []) as OrderItemRow[], orderId);
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ financial_status: 'failed' })
    .eq('id', orderId)
    .neq('financial_status', 'paid');

  if (updateError) {
    throw updateError;
  }
}

export async function getOrderIdByProviderReference(provider: string, providerReference: string) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('order_id')
    .eq('provider', provider)
    .eq('provider_reference', providerReference)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.order_id || null;
}

export function deriveWebhookDeliveryId(rawBody: string, explicitDeliveryId?: string | null) {
  if (explicitDeliveryId) return explicitDeliveryId;
  return createHash('sha256').update(rawBody).digest('hex');
}

export async function claimWebhookEvent({
  provider,
  deliveryId,
  eventType,
  payload,
}: {
  provider: string;
  deliveryId: string;
  eventType: string;
  payload: unknown;
}) {
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .insert({
      provider,
      delivery_id: deliveryId,
      event_type: eventType,
      status: 'processing',
      payload,
    })
    .select('id, delivery_id, event_type, status, first_seen_at, processed_at, last_error')
    .single();

  if (!error && data) {
    return { event: data as WebhookEventRow, duplicate: false };
  }

  if (error?.code !== '23505') {
    throw error;
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('webhook_events')
    .select('id, delivery_id, event_type, status, first_seen_at, processed_at, last_error')
    .eq('provider', provider)
    .eq('delivery_id', deliveryId)
    .single();

  if (fetchError || !existing) {
    throw fetchError || new Error('Could not fetch duplicate webhook event.');
  }

  return { event: existing as WebhookEventRow, duplicate: true };
}

export async function completeWebhookEvent(id: string, status: Extract<WebhookEventStatus, 'processed' | 'ignored'>) {
  const { error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function failWebhookEvent(id: string, errorMessage: string) {
  const { error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      status: 'failed',
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function getRecentWebhookEvents(limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .select('id, delivery_id, event_type, status, first_seen_at, processed_at, last_error')
    .order('first_seen_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as WebhookEventRow[];
}

export async function getRecentOutstandingOrders(limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, financial_status, grand_total, created_at, guest_email, guest_phone')
    .in('financial_status', ['pending', 'failed'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('Razorpay secret is missing.');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(razorpaySignature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Razorpay webhook secret is missing.');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
