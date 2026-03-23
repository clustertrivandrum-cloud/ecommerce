import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type NoticeTone = 'error' | 'success' | 'info';

const toneStyles: Record<NoticeTone, { wrapper: string; icon: ReactNode }> = {
  error: {
    wrapper: 'notice-banner-error',
    icon: <AlertCircle className="h-4 w-4 shrink-0" />,
  },
  success: {
    wrapper: 'notice-banner-success',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  },
  info: {
    wrapper: 'notice-banner-info',
    icon: <Info className="h-4 w-4 shrink-0" />,
  },
};

type NoticeBannerProps = {
  children: ReactNode;
  tone?: NoticeTone;
  className?: string;
  onDismiss?: () => void;
};

export function NoticeBanner({
  children,
  tone = 'info',
  className,
  onDismiss,
}: NoticeBannerProps) {
  const { wrapper, icon } = toneStyles[tone];

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border px-4 py-3 text-sm',
        wrapper,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div>{children}</div>
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
