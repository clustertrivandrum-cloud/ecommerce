'use client';

import Link from 'next/link';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

type AnalyticsConsentState = 'granted' | 'denied' | 'pending';
type GtagConsentPayload = {
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  wait_for_update?: number;
};
type GtagCommand = 'js' | 'config' | 'consent' | 'event';
type Gtag = (command: GtagCommand, ...args: unknown[]) => void;

const STORAGE_KEY = 'cluster-analytics-consent';
const OPEN_PREFERENCES_EVENT = 'cluster:analytics-preferences-open';
const CONSENT_CHANGED_EVENT = 'cluster:analytics-consent-changed';
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const deniedConsent: GtagConsentPayload = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

const defaultConsent: GtagConsentPayload = {
  ...deniedConsent,
  wait_for_update: 500,
};

const grantedConsent: GtagConsentPayload = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

function readStoredConsent(): AnalyticsConsentState {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === 'granted' || storedValue === 'denied') {
      return storedValue;
    }
  } catch {}

  return 'pending';
}

function writeStoredConsent(nextConsent: Exclude<AnalyticsConsentState, 'pending'>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, nextConsent);
  } catch {}
}

function subscribeToConsent(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };
  const handleConsentChange = () => callback();

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
  };
}

function getConsentSnapshot() {
  if (typeof window === 'undefined') {
    return 'pending' as const;
  }

  return readStoredConsent();
}

function updateConsent(nextConsent: Exclude<AnalyticsConsentState, 'pending'>) {
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  if (!gtag) return;

  gtag('consent', 'update', nextConsent === 'granted' ? grantedConsent : deniedConsent);
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, () => 'pending');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const hasConfiguredRef = useRef(false);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const handleOpenPreferences = () => setPreferencesOpen(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, handleOpenPreferences);

    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, handleOpenPreferences);
  }, []);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || consent !== 'granted' || !scriptReady || hasConfiguredRef.current) {
      return;
    }

    const gtag = (window as Window & { gtag?: Gtag }).gtag;
    if (!gtag) return;

    gtag('js', new Date());
    gtag('consent', 'update', grantedConsent);
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: false,
    });

    hasConfiguredRef.current = true;
  }, [consent, scriptReady]);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || consent !== 'granted' || !scriptReady || !hasConfiguredRef.current) {
      return;
    }

    const gtag = (window as Window & { gtag?: Gtag }).gtag;
    if (!gtag) return;

    const search = searchParams.toString();
    const pagePath = search ? `${pathname}?${search}` : pathname;

    gtag('event', 'page_view', {
      page_title: document.title,
      page_path: pagePath,
      page_location: window.location.href,
    });
  }, [consent, pathname, scriptReady, searchParams]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  const setConsentChoice = (nextConsent: Exclude<AnalyticsConsentState, 'pending'>) => {
    writeStoredConsent(nextConsent);
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    setPreferencesOpen(false);
    updateConsent(nextConsent);

    if (nextConsent === 'denied') {
      hasConfiguredRef.current = false;
      setScriptReady(false);
    }
  };

  return (
    <>
      <Script id="google-analytics-consent" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          window.gtag('consent', 'default', ${JSON.stringify(defaultConsent)});
        `}
      </Script>

      {consent === 'granted' ? (
        <Script
          id="google-analytics-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
      ) : null}

      {consent === 'pending' || preferencesOpen ? (
        <div className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-3xl rounded-[1.75rem] border border-border bg-card/95 p-5 text-sm text-text-secondary shadow-2xl backdrop-blur md:bottom-6 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-gold">
                Analytics Preferences
              </p>
              <p className="text-base font-medium text-text-primary">
                We use Google Analytics only if you allow it.
              </p>
              <p>
                Accepting enables privacy-aware traffic measurement for the storefront. Declining keeps analytics disabled.
                Read the details in our{' '}
                <Link href="/privacy-policy" className="text-text-primary underline underline-offset-4">
                  privacy policy
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConsentChoice('denied')}
                className="rounded-full border border-border px-4 py-2 font-medium text-text-primary transition-colors hover:border-text-secondary"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => setConsentChoice('granted')}
                className="rounded-full bg-accent-gold px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
              >
                Accept Analytics
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
