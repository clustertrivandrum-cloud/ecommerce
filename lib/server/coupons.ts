import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CouponRow = {
  id: string
  code: string
  discount_type?: 'percentage' | 'fixed' | null
  discount_value?: number | string | null
  min_order_value?: number | string | null
  max_discount?: number | string | null
  usage_limit?: number | null
  used_count?: number | null
  is_active?: boolean | null
  starts_at?: string | null
  expires_at?: string | null
  discount_amount?: number | string | null
  discount_percent?: number | string | null
  max_uses?: number | null
  uses?: number | null
}

export type CouponResult =
  | { valid: true; code: string; amountOff: number }
  | { valid: false; reason: string }

function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase()
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeCoupon(row: CouponRow): Required<Pick<CouponRow, 'id' | 'code'>> & {
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number
  max_discount: number | string | null | undefined
  usage_limit: number | null
  used_count: number | null
  is_active: boolean
  starts_at: string | null
  expires_at: string | null
} {
  const discountType = row.discount_type || (toNumber(row.discount_percent) > 0 ? 'percentage' : 'fixed')
  const discountValue = discountType === 'percentage'
    ? toNumber(row.discount_value ?? row.discount_percent)
    : toNumber(row.discount_value ?? row.discount_amount)

  return {
    id: row.id,
    code: row.code,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_value: toNumber(row.min_order_value),
    max_discount: row.max_discount,
    usage_limit: row.usage_limit ?? row.max_uses ?? null,
    used_count: row.used_count ?? row.uses ?? 0,
    is_active: row.is_active ?? true,
    starts_at: row.starts_at || null,
    expires_at: row.expires_at || null,
  }
}

function calculateDiscountAmount(coupon: CouponRow, orderSubtotal: number) {
  if (coupon.discount_type === 'percentage') {
    const percentAmount = (orderSubtotal * toNumber(coupon.discount_value)) / 100
    const maxDiscount = toNumber(coupon.max_discount)
    return maxDiscount > 0 ? Math.min(percentAmount, maxDiscount) : percentAmount
  }

  return toNumber(coupon.discount_value)
}

export async function validateCoupon(code: string, orderSubtotal: number): Promise<CouponResult> {
  const normalized = normalizeCouponCode(code)
  if (!normalized) return { valid: false, reason: 'Coupon code required.' }

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .ilike('code', normalized)
    .maybeSingle<CouponRow>()

  if (error || !data) return { valid: false, reason: 'Invalid coupon.' }
  const coupon = normalizeCoupon(data)
  if (!coupon.is_active) return { valid: false, reason: 'This coupon is inactive.' }

  const now = new Date()
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, reason: 'Coupon not active yet.' }
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, reason: 'Coupon expired.' }
  }
  if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) {
    return { valid: false, reason: 'Coupon usage limit reached.' }
  }
  if (coupon.min_order_value > 0 && orderSubtotal < coupon.min_order_value) {
    return { valid: false, reason: `Minimum order value is ₹${coupon.min_order_value}.` }
  }

  const amountOff = calculateDiscountAmount(coupon, orderSubtotal)
  if (amountOff <= 0) {
    return { valid: false, reason: 'This coupon does not apply to the current cart.' }
  }

  return { valid: true, code: coupon.code, amountOff }
}

export async function incrementCouponUse(code: string) {
  const normalized = normalizeCouponCode(code)
  if (!normalized) return

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .ilike('code', normalized)
    .maybeSingle<CouponRow>()

  if (error || !data?.id) return
  const coupon = normalizeCoupon(data)

  const nextCount = (coupon.used_count || 0) + 1

  const primary = await supabaseAdmin
    .from('coupons')
    .update({ used_count: nextCount })
    .eq('id', data.id)

  if (!primary.error) return

  await supabaseAdmin
    .from('coupons')
    .update({ uses: nextCount })
    .eq('id', data.id)
}
