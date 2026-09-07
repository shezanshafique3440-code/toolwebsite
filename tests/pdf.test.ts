import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PdfDocument, measureText, sanitizeText, wrapText } from '@/lib/pdf/writer';
import { renderReportPdf } from '@/lib/pdf/report';
import { productAnalysisSchema } from '@/lib/ai/schemas';
import { DemoProvider } from '@/lib/ai/providers/demo';
import type { ReportSnapshot } from '@/lib/services/reports';

test('text measurement uses real glyph widths', () => {
  assert.ok(measureText('iiii', 10, 'regular') < measureText('WWWW', 10, 'regular'));
  assert.ok(measureText('Hello', 10, 'bold') > measureText('Hello', 10, 'regular'));
});

test('wrapText respects the given width and keeps every word', () => {
  const text = 'The quick brown fox jumps over the lazy dog again and again';
  const lines = wrapText(text, 10, 'regular', 120);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(measureText(line, 10, 'regular') <= 120.5, `line too wide: ${line}`);
  }
  assert.equal(lines.join(' ').replace(/\s+/g, ' ').trim(), text);
});

test('sanitizeText transliterates characters outside the font encoding', () => {
  assert.equal(sanitizeText('“smart” — quotes…'), '"smart" - quotes...');
});

test('a built document is a well-formed PDF', () => {
  const doc = new PdfDocument();
  doc.text('Hello', 40, 700, { size: 12, font: 'bold' });
  doc.addPage();
  doc.text('Second page', 40, 700);
  const bytes = doc.build({ title: 'Test', author: 'Test' });
  const text = Buffer.from(bytes).toString('latin1');

  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.match(text, /\/Count 2/);
  assert.match(text, /startxref\n\d+/);
});

test('renders a full report snapshot to a multi-page PDF', async () => {
  const provider = new DemoProvider();
  const response = await provider.complete({
    operation: 'product_analysis',
    system: 'test',
    prompt: 'test',
    schema: productAnalysisSchema,
    schemaName: 'product_analysis',
    maxTokens: 1000,
    context: { productName: 'Mini Projector' },
  });
  const detail = productAnalysisSchema.parse(response.output);

  const snapshot: ReportSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    isDemo: true,
    product: {
      id: 'p1',
      name: 'Mini Projector',
      url: 'https://example.com/mini-projector',
      imageUrl: null,
      category: 'Consumer electronics',
      notes: null,
    },
    analysis: {
      id: 'a1',
      createdAt: new Date().toISOString(),
      provider: 'demo',
      model: 'demo-heuristic-v1',
      overallScore: 78,
      verdict: 'STRONG',
      scores: { demand: 82, competition: 61, profit: 80, viral: 88 },
      detail,
    },
    competitors: {
      summary: 'Sample competitor summary.',
      rows: [
        {
          name: 'example.com',
          url: 'https://example.com',
          price: 49.99,
          positioning: 'Value-led challenger',
          targetCustomer: 'Budget shoppers',
          marketingAngle: 'Price anchoring',
          offerStructure: 'Single unit + bundle',
          cta: 'Shop now',
          estimatedPositioning: 'Value',
          strengths: ['Reviews'],
          weaknesses: ['Thin content'],
          sellingPoints: ['Free shipping'],
        },
      ],
    },
    keywords: {
      primaryKeyword: 'mini projector',
      suggestedTitle: 'Mini Projector — Portable Home Cinema',
      items: [
        { keyword: 'mini projector', group: 'PRIMARY', estimatedIntent: 'COMMERCIAL', rationale: 'Head term' },
        { keyword: 'best mini projector', group: 'SECONDARY', estimatedIntent: 'COMMERCIAL', rationale: 'Comparison' },
      ],
    },
    marketing: { channels: detail.marketingChannels },
  };

  const bytes = renderReportPdf(snapshot);
  const text = Buffer.from(bytes).toString('latin1');

  assert.ok(bytes.byteLength > 3000, 'report should not be trivially small');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.match(text, /Mini Projector/);
  assert.match(text, /SAMPLE DATA/);
});
