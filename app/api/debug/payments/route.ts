import { NextResponse } from 'next/server';
import {
  getRecentOutstandingOrders,
  getRecentWebhookEvents,
  hasRazorpayCredentials,
  hasRazorpayWebhookSecret,
} from '@/lib/server/checkout';
import { getRazorpayWebhookUrl, getSiteUrl } from '@/lib/server/site-url';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const siteUrl = getSiteUrl(req);

    const [orders, webhookEvents] = await Promise.all([
      getRecentOutstandingOrders(20),
      getRecentWebhookEvents(20),
    ]);

    return NextResponse.json({
      health: {
        siteUrl,
        webhookUrl: getRazorpayWebhookUrl(req),
        hasSiteUrl: Boolean(siteUrl),
        hasRazorpayKeys: hasRazorpayCredentials(),
        hasWebhookSecret: hasRazorpayWebhookSecret(),
      },
      outstandingOrders: orders,
      webhookEvents,
    });
  } catch (err: unknown) {
    console.error('Debug payments fetch error', err);
    return NextResponse.json({ error: 'Could not load payment diagnostics.' }, { status: 500 });
  }
}
