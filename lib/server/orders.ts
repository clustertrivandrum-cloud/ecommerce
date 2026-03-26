import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type OrderHistoryRow = {
  id: string;
  user_id?: string | null;
  customer_id?: string | null;
  guest_email?: string | null;
  order_number?: number | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  grand_total?: number | null;
  created_at: string;
  order_items?: Array<{
    title?: string | null;
    variant_title?: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }> | null;
};

export type CustomerOrderSummary = {
  id: string;
  order_number: number | null;
  financial_status: string;
  fulfillment_status: string;
  grand_total: number;
  created_at: string;
  order_items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_title: string | null;
  }>;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

async function getCustomerIdByEmail(email: string | null) {
  if (!email) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

function mapOrder(row: OrderHistoryRow): CustomerOrderSummary {
  return {
    id: row.id,
    order_number: row.order_number ?? null,
    financial_status: row.financial_status || 'pending',
    fulfillment_status: row.fulfillment_status || 'pending',
    grand_total: Number(row.grand_total || 0),
    created_at: row.created_at,
    order_items: (row.order_items || []).map((item) => ({
      title: item.title || 'Item',
      quantity: item.quantity,
      unit_price: Number(item.unit_price || 0),
      total_price: Number(item.total_price || 0),
      variant_title: item.variant_title || null,
    })),
  };
}

async function fetchOrdersByFilter(column: 'user_id' | 'customer_id' | 'guest_email', value: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      user_id,
      customer_id,
      guest_email,
      order_number,
      financial_status,
      fulfillment_status,
      grand_total,
      created_at,
      order_items ( title, variant_title, quantity, unit_price, total_price )
    `)
    .eq(column, value)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as OrderHistoryRow[];
}

export async function listCustomerOrdersByIdentity({
  userId,
  email,
}: {
  userId?: string | null;
  email?: string | null;
}): Promise<CustomerOrderSummary[]> {
  const normalizedEmail = normalizeEmail(email);
  const customerId = await getCustomerIdByEmail(normalizedEmail);
  const rowsById = new Map<string, CustomerOrderSummary>();

  if (userId) {
    for (const row of await fetchOrdersByFilter('user_id', userId)) {
      rowsById.set(row.id, mapOrder(row));
    }
  }

  if (normalizedEmail) {
    for (const row of await fetchOrdersByFilter('guest_email', normalizedEmail)) {
      rowsById.set(row.id, mapOrder(row));
    }
  }

  if (customerId) {
    for (const row of await fetchOrdersByFilter('customer_id', customerId)) {
      rowsById.set(row.id, mapOrder(row));
    }
  }

  return Array.from(rowsById.values()).sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export async function customerCanAccessOrder({
  orderId,
  userId,
  email,
}: {
  orderId: string;
  userId?: string | null;
  email?: string | null;
}) {
  const normalizedEmail = normalizeEmail(email);
  const customerId = await getCustomerIdByEmail(normalizedEmail);

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, customer_id, guest_email')
    .eq('id', orderId)
    .maybeSingle<OrderHistoryRow>();

  if (error) {
    throw error;
  }

  if (!order) {
    return false;
  }

  if (userId && order.user_id === userId) {
    return true;
  }

  if (normalizedEmail && normalizeEmail(order.guest_email) === normalizedEmail) {
    return true;
  }

  if (customerId && order.customer_id === customerId) {
    return true;
  }

  return false;
}
