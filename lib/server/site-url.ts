export function getSiteUrl(request?: Request) {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    null;

  if (configuredSiteUrl) {
    return configuredSiteUrl.startsWith('http')
      ? configuredSiteUrl
      : `https://${configuredSiteUrl}`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (!request) return null;

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!forwardedHost) return null;

  return `${forwardedProto}://${forwardedHost}`;
}

export function getRazorpayWebhookUrl(request?: Request) {
  const siteUrl = getSiteUrl(request);
  if (!siteUrl) return null;
  return `${siteUrl.replace(/\/$/, '')}/api/webhooks/razorpay`;
}
