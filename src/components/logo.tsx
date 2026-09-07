import Link from 'next/link';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M4 19 L10 9 L14 14 L20 5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="5" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-fg', className)}
    >
      <LogoMark />
      <span>{APP_NAME}</span>
    </Link>
  );
}
