'use client';

const OPEN_PREFERENCES_EVENT = 'cluster:analytics-preferences-open';

export function AnalyticsPreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))}
      className="hover:text-text-primary"
    >
      Cookie Preferences
    </button>
  );
}
