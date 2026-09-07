'use client';

import * as React from 'react';
import { Download, Search } from 'lucide-react';
import { ToolForm, type ProductOption } from '@/components/dashboard/tool-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { KeywordAnalysis } from '@/lib/ai/schemas';

const GROUP_LABELS: Record<string, string> = {
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary',
  LONG_TAIL: 'Long tail',
  BUYER_INTENT: 'Buyer intent',
  PROBLEM: 'Problem',
  QUESTION: 'Question',
};

function toCsv(analysis: KeywordAnalysis) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ['keyword', 'group', 'intent', 'rationale'],
    ...analysis.keywords.map((item) => [item.keyword, item.group, item.estimatedIntent, item.rationale]),
  ];
  return rows.map((row) => row.map((cell) => escape(String(cell))).join(',')).join('\n');
}

function KeywordResult({ analysis }: { analysis: KeywordAnalysis }) {
  const [group, setGroup] = React.useState<string>('ALL');

  const groups = React.useMemo(
    () => ['ALL', ...Array.from(new Set(analysis.keywords.map((item) => item.group)))],
    [analysis.keywords],
  );

  const visible = group === 'ALL' ? analysis.keywords : analysis.keywords.filter((item) => item.group === group);
  const allKeywords = analysis.keywords.map((item) => item.keyword).join('\n');

  function downloadCsv() {
    const blob = new Blob([toCsv(analysis)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keywords.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Primary keyword and title</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Primary keyword</p>
              <p className="mt-1 truncate text-lg font-semibold">{analysis.primaryKeyword}</p>
            </div>
            <CopyButton value={analysis.primaryKeyword} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Suggested product title</p>
              <p className="mt-1 text-sm font-medium leading-relaxed">{analysis.suggestedProductTitle}</p>
            </div>
            <CopyButton value={analysis.suggestedProductTitle} />
          </div>

          <p className="text-sm leading-relaxed text-fg-muted">{analysis.notes}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{analysis.keywords.length} keywords</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">Grouped by search intent.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={allKeywords} label="Copy all" />
            <Button variant="secondary" size="sm" onClick={downloadCsv}>
              <Download aria-hidden />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {groups.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGroup(value)}
                aria-pressed={group === value}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  group === value ? 'bg-accent text-accent-fg' : 'bg-surface-muted text-fg-muted hover:text-fg'
                }`}
              >
                {value === 'ALL' ? 'All' : (GROUP_LABELS[value] ?? value)}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead className="hidden md:table-cell">Why</TableHead>
                  <TableHead className="w-20 text-right">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow key={`${item.group}-${item.keyword}`}>
                    <TableCell className="font-medium">{item.keyword}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{GROUP_LABELS[item.group] ?? item.group}</Badge>
                    </TableCell>
                    <TableCell className="text-fg-muted">{item.estimatedIntent.toLowerCase()}</TableCell>
                    <TableCell className="hidden max-w-72 text-fg-muted md:table-cell">{item.rationale}</TableCell>
                    <TableCell className="text-right">
                      <CopyButton value={item.keyword} showLabel={false} variant="ghost" size="icon" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="mt-3 text-xs text-fg-subtle">
            Search volume and difficulty are deliberately not shown — no keyword data source is connected, so any
            number here would be invented. Validate these against a keyword tool before committing budget.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function KeywordTool({
  products,
  defaultProductId,
  defaultName,
}: {
  products: ProductOption[];
  defaultProductId?: string;
  defaultName?: string;
}) {
  return (
    <ToolForm<KeywordAnalysis>
      endpoint="/api/keywords/generate"
      submitLabel="Generate keywords"
      creditCost={1}
      products={products}
      defaultProductId={defaultProductId}
      defaultName={defaultName}
      buildBody={(form) => ({
        productId: String(form.get('productId') ?? '') || undefined,
        productName: String(form.get('productName') ?? ''),
        category: String(form.get('category') ?? '') || undefined,
        notes: String(form.get('notes') ?? '') || undefined,
      })}
      renderResult={(analysis) => <KeywordResult analysis={analysis} />}
      emptyState={
        <EmptyState
          icon={Search}
          title="No keywords generated yet"
          description="Enter a product and generate primary, long-tail, buyer-intent, problem and question keywords in one pass."
        />
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" maxLength={80} placeholder="e.g. Kitchen appliances" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Product details</Label>
        <Textarea id="notes" name="notes" rows={4} maxLength={4000} placeholder="Anything that should shape the keywords." />
      </div>
    </ToolForm>
  );
}
