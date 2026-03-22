'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? MoonStar : SunMedium;
  const label = `${theme} mode`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className={cn(
        'theme-toggle hover:theme-toggle-hover inline-flex items-center rounded-full border text-[11px] font-semibold uppercase tracking-[0.22em]',
        compact ? 'h-11 w-11 justify-center p-0' : 'gap-3 px-2 py-2 pr-4',
        className
      )}
    >
      <span className="theme-toggle-indicator flex h-7 w-7 items-center justify-center rounded-full">
        <Icon className="h-4 w-4" />
      </span>
      {compact ? (
        <span className="sr-only">{`Switch to ${nextTheme} theme`}</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
