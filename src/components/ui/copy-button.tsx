'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Copies text to the clipboard with a transient confirmation state. */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  showLabel = true,
  className,
  variant = 'secondary',
  size = 'sm',
  ...props
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  showLabel?: boolean;
} & Omit<ButtonProps, 'value' | 'children'>) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for browsers without async clipboard access.
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(className)}
      aria-label={copied ? copiedLabel : `${label} to clipboard`}
      {...props}
    >
      {copied ? <Check className="text-score-strong" aria-hidden /> : <Copy aria-hidden />}
      {showLabel && <span>{copied ? copiedLabel : label}</span>}
    </Button>
  );
}
