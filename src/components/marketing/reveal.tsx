'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Reveals content on scroll. Visibility is applied directly to the node rather
 * than held in state: the transition is a one-way, purely visual change, so it
 * costs no re-render. Content is shown immediately when IntersectionObserver is
 * unavailable or the visitor prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const show = () => {
      node.style.opacity = '1';
      node.style.transform = 'none';
    };

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn('transition-[opacity,transform] duration-700 ease-out', className)}
      style={{ opacity: 0, transform: 'translateY(14px)', transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
