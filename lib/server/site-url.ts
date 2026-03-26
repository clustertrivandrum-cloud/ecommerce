export const DEFAULT_SITE_URL = 'https://www.clusterfascination.com';

function normalizeSiteUrl(siteUrl: string) {
  const candidate = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const url = new URL(candidate);

  if (url.hostname === 'clusterfascination.com') {
    url.hostname = 'www.clusterfascination.com';
  }

  return url.origin;
}

export function getSiteUrl(request?: Request) {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    null;

  if (configuredSiteUrl) {
    return normalizeSiteUrl(configuredSiteUrl);
  }

  if (!request) return null;

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!forwardedHost) return null;

  return normalizeSiteUrl(`${forwardedProto}://${forwardedHost}`);
}

export function getRazorpayWebhookUrl(request?: Request) {
  const siteUrl = getSiteUrl(request);
  if (!siteUrl) return null;
  return `${siteUrl.replace(/\/$/, '')}/api/webhooks/razorpay`;
}
