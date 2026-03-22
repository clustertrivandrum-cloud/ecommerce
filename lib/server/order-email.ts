import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/server/site-url';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StoreMailContext = {
  storeName: string;
  storeEmail: string | null;
};

type OrderEmailRow = {
  id: string;
  order_number?: number | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  created_at: string;
  grand_total?: number | null;
  subtotal?: number | null;
  discount_total?: number | null;
  shipping_total?: number | null;
  tax_total?: number | null;
  currency?: string | null;
  shipping_address?: Record<string, unknown> | null;
  order_items?: Array<{
    id: string;
    title?: string | null;
    quantity: number;
    unit_price?: number | string | null;
    total_price?: number | string | null;
  }> | null;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.ORDER_EMAIL_FROM ||
    process.env.CUSTOMER_EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    null;

  if (!apiKey || !fromEmail) {
    return null;
  }

  return { apiKey, fromEmail };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount: number, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

function formatAddress(address?: Record<string, unknown> | null) {
  if (!address || typeof address !== 'object') {
    return [];
  }

  const keys = ['name', 'line1', 'line2', 'city', 'state', 'postal_code', 'country', 'phone'];
  const ordered = keys
    .map((key) => address[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return ordered.length > 0
    ? ordered
    : Object.values(address).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

async function getStoreMailContext(): Promise<StoreMailContext> {
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('store_name, store_email')
    .single();

  return {
    storeName: data?.store_name || 'Cluster Fascination',
    storeEmail: data?.store_email || null,
  };
}

async function getOrderForEmail(orderId: string): Promise<OrderEmailRow | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      guest_name,
      guest_email,
      guest_phone,
      created_at,
      grand_total,
      subtotal,
      discount_total,
      shipping_total,
      tax_total,
      currency,
      shipping_address,
      order_items (
        id,
        title,
        quantity,
        unit_price,
        total_price
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as OrderEmailRow;
}

async function sendResendEmail({
  to,
  subject,
  html,
  text,
  storeName,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  storeName: string;
  replyTo?: string | null;
}) {
  const config = getResendConfig();
  if (!config) {
    return { sent: false as const, reason: 'missing-config' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${storeName} <${config.fromEmail}>`,
      to: [to],
      reply_to: replyTo || undefined,
      subject,
      html,
      text,
    }),
  });

  const result = await response.json() as { id?: string; message?: string };
  if (!response.ok) {
    throw new Error(result.message || 'Resend email send failed.');
  }

  return {
    sent: true as const,
    deliveryId: result.id || null,
  };
}

function buildInvoiceHtml(order: OrderEmailRow, store: StoreMailContext, orderUrl: string | null) {
  const currency = order.currency || 'INR';
  const itemRows = (order.order_items || []).map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(item.title || 'Item')}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">${item.quantity}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">${escapeHtml(formatCurrency(Number(item.unit_price || 0), currency))}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:700;">${escapeHtml(formatCurrency(Number(item.total_price || 0), currency))}</td>
    </tr>
  `).join('');
  const shippingAddress = formatAddress(order.shipping_address);
  const orderLabel = order.order_number ? `#${order.order_number}` : order.id.slice(0, 8);
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_total || 0);
  const tax = Number(order.tax_total || 0);
  const shipping = Number(order.shipping_total || 0);
  const total = Number(order.grand_total || 0);

  return `
    <div style="background:#f7f4ef;padding:40px 16px;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:28px;overflow:hidden;">
        <div style="background:#111827;padding:28px 32px;color:#f9fafb;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:0.8;">${escapeHtml(store.storeName)}</div>
          <h1 style="margin:12px 0 0;font-size:30px;line-height:1.2;">Your order invoice</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#d1d5db;">Thank you for your purchase. Your order has been paid successfully.</p>
        </div>
        <div style="padding:32px;">
          <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;">
            <div>
              <p style="margin:0;color:#6b7280;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">Invoice For</p>
              <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(order.guest_name || 'Customer')}</p>
              <p style="margin:6px 0 0;color:#4b5563;">${escapeHtml(order.guest_email || '-')}</p>
              <p style="margin:4px 0 0;color:#4b5563;">${escapeHtml(order.guest_phone || '-')}</p>
            </div>
            <div>
              <p style="margin:0;color:#6b7280;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">Order</p>
              <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(orderLabel)}</p>
              <p style="margin:6px 0 0;color:#4b5563;">Date: ${escapeHtml(new Date(order.created_at).toLocaleDateString())}</p>
              <p style="margin:4px 0 0;color:#4b5563;">Total: ${escapeHtml(formatCurrency(total, currency))}</p>
            </div>
          </div>

          <table style="width:100%;margin-top:28px;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:0 0 12px;text-align:left;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Item</th>
                <th style="padding:0 0 12px;text-align:right;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Qty</th>
                <th style="padding:0 0 12px;text-align:right;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Price</th>
                <th style="padding:0 0 12px;text-align:right;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <div style="margin-top:24px;display:flex;justify-content:flex-end;">
            <div style="width:100%;max-width:320px;">
              <div style="display:flex;justify-content:space-between;padding:6px 0;color:#4b5563;"><span>Subtotal</span><span>${escapeHtml(formatCurrency(subtotal, currency))}</span></div>
              ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#dc2626;"><span>Discount</span><span>-${escapeHtml(formatCurrency(discount, currency))}</span></div>` : ''}
              <div style="display:flex;justify-content:space-between;padding:6px 0;color:#4b5563;"><span>Shipping</span><span>${escapeHtml(formatCurrency(shipping, currency))}</span></div>
              <div style="display:flex;justify-content:space-between;padding:6px 0;color:#4b5563;"><span>Tax</span><span>${escapeHtml(formatCurrency(tax, currency))}</span></div>
              <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;border-top:1px solid #e5e7eb;color:#111827;font-size:18px;font-weight:700;"><span>Grand Total</span><span>${escapeHtml(formatCurrency(total, currency))}</span></div>
            </div>
          </div>

          ${shippingAddress.length > 0 ? `
            <div style="margin-top:28px;padding:18px 20px;background:#f9fafb;border-radius:18px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Shipping Address</p>
              ${shippingAddress.map((line) => `<p style="margin:0 0 4px;color:#4b5563;">${escapeHtml(line)}</p>`).join('')}
            </div>
          ` : ''}

          <div style="margin-top:28px;color:#6b7280;font-size:14px;line-height:1.7;">
            <p style="margin:0;">Thank you for shopping with ${escapeHtml(store.storeName)}.</p>
            ${orderUrl ? `<p style="margin:12px 0 0;"><a href="${orderUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;">View Order</a></p>` : ''}
            ${store.storeEmail ? `<p style="margin:14px 0 0;">For help, reply to this email or contact ${escapeHtml(store.storeEmail)}.</p>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildInvoiceText(order: OrderEmailRow, store: StoreMailContext, orderUrl: string | null) {
  const currency = order.currency || 'INR';
  const itemLines = (order.order_items || [])
    .map((item) => `${item.title || 'Item'} x${item.quantity} - ${formatCurrency(Number(item.total_price || 0), currency)}`)
    .join('\n');
  const orderLabel = order.order_number ? `#${order.order_number}` : order.id;

  return [
    `Thank you for shopping with ${store.storeName}.`,
    `Invoice for order ${orderLabel}`,
    `Customer: ${order.guest_name || 'Customer'}`,
    `Email: ${order.guest_email || '-'}`,
    `Phone: ${order.guest_phone || '-'}`,
    '',
    itemLines,
    '',
    `Grand Total: ${formatCurrency(Number(order.grand_total || 0), currency)}`,
    orderUrl ? `View order: ${orderUrl}` : '',
  ].filter(Boolean).join('\n');
}

export async function sendOrderInvoiceEmail(orderId: string) {
  const order = await getOrderForEmail(orderId);
  if (!order?.guest_email) {
    return { sent: false as const, reason: 'missing-recipient' };
  }

  const store = await getStoreMailContext();
  const siteUrl = getSiteUrl();
  const orderUrl = siteUrl ? `${siteUrl.replace(/\/$/, '')}/orders?orderId=${order.id}&status=paid` : null;
  const orderLabel = order.order_number ? `#${order.order_number}` : `Order ${order.id.slice(0, 8)}`;

  return sendResendEmail({
    to: order.guest_email,
    subject: `Invoice for ${orderLabel}`,
    html: buildInvoiceHtml(order, store, orderUrl),
    text: buildInvoiceText(order, store, orderUrl),
    storeName: store.storeName,
    replyTo: store.storeEmail,
  });
}
