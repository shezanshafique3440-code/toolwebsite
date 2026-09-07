import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg bg-surface px-3 py-2 text-sm text-fg hairline shadow-subtle transition-colors',
          'placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-60',
          'aria-[invalid=true]:border-score-avoid',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full rounded-lg bg-surface px-3 py-2 text-sm text-fg hairline shadow-subtle transition-colors',
        'placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-score-avoid',
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg bg-surface px-3 text-sm text-fg hairline shadow-subtle transition-colors disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
