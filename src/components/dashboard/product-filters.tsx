'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'score_desc', label: 'Highest score' },
  { value: 'score_asc', label: 'Lowest score' },
  { value: 'name_asc', label: 'Name (A–Z)' },
];

const FILTERS = [
  { value: 'all', label: 'All products' },
  { value: 'STRONG', label: 'Strong products' },
  { value: 'POTENTIAL', label: 'Potential products' },
  { value: 'RISKY', label: 'Risky products' },
  { value: 'AVOID', label: 'Avoid' },
  { value: 'unanalyzed', label: 'Not analysed yet' },
];

export function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '');
  const sort = searchParams.get('sort') ?? 'newest';
  const filter = searchParams.get('filter') ?? 'all';

  React.useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const update = React.useCallback(
    (changes: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (!value || value === 'all' || (key === 'sort' && value === 'newest')) params.delete(key);
        else params.set(key, value);
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const hasFilters = Boolean(searchParams.get('q') || searchParams.get('filter') || searchParams.get('sort'));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: query.trim() });
        }}
        role="search"
      >
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input
          id="product-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or category…"
          className="pl-9"
        />
      </form>

      <div className="flex gap-2">
        <div className="flex-1 sm:w-44 sm:flex-none">
          <label htmlFor="product-filter" className="sr-only">
            Filter by verdict
          </label>
          <Select id="product-filter" value={filter} onChange={(event) => update({ filter: event.target.value })}>
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex-1 sm:w-44 sm:flex-none">
          <label htmlFor="product-sort" className="sr-only">
            Sort products
          </label>
          <Select id="product-sort" value={sort} onChange={(event) => update({ sort: event.target.value })}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={() => router.push(pathname)} aria-label="Clear filters">
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
