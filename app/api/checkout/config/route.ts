import { NextResponse } from 'next/server';
import { hasRazorpayCredentials } from '@/lib/server/checkout';
import { getShippingSettings } from '@/lib/server/app-settings';

export async function GET() {
  const shippingSettings = await getShippingSettings();

  return NextResponse.json({
    paymentsEnabled: hasRazorpayCredentials(),
    shippingSettings,
  });
}
