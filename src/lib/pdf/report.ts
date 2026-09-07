import { PdfDocument, measureText, wrapText, type FontName, type RGB } from '@/lib/pdf/writer';
import type { ReportSnapshot } from '@/lib/services/reports';
import { VERDICT_LABELS, VERDICT_HEX, scoreColor } from '@/lib/scoring';
import { APP_NAME } from '@/lib/constants';

const MARGIN = 48;
const INK: RGB = [0.06, 0.09, 0.11];
const MUTED: RGB = [0.33, 0.37, 0.42];
const SUBTLE: RGB = [0.55, 0.59, 0.65];
const LINE: RGB = [0.88, 0.9, 0.93];
const SURFACE: RGB = [0.965, 0.97, 0.976];

function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

/** Cursor-based layout with automatic page breaks and a repeating footer. */
class Layout {
  readonly doc = new PdfDocument();
  private y: number;
  readonly contentWidth: number;
  private pageNumber = 1;
  private readonly title: string;

  constructor(title: string) {
    this.title = title;
    this.contentWidth = this.doc.pageWidth - MARGIN * 2;
    this.y = this.doc.pageHeight - MARGIN;
  }

  get cursor() {
    return this.y;
  }

  get left() {
    return MARGIN;
  }

  get right() {
    return this.doc.pageWidth - MARGIN;
  }

  ensure(space: number) {
    if (this.y - space >= MARGIN + 36) return;
    this.footer();
    this.doc.addPage();
    this.pageNumber += 1;
    this.y = this.doc.pageHeight - MARGIN;
    this.runningHeader();
  }

  private runningHeader() {
    this.doc.text(this.title, MARGIN, this.y, { size: 8, color: SUBTLE });
    this.doc.line(MARGIN, this.y - 8, this.right, this.y - 8, LINE, 0.6);
    this.y -= 26;
  }

  footer() {
    const y = MARGIN - 14;
    this.doc.line(MARGIN, y + 14, this.right, y + 14, LINE, 0.6);
    this.doc.text(`${APP_NAME} — AI-generated research report`, MARGIN, y, { size: 7.5, color: SUBTLE });
    const label = `Page ${this.pageNumber}`;
    this.doc.text(label, this.right - measureText(label, 7.5, 'regular'), y, { size: 7.5, color: SUBTLE });
  }

  space(amount: number) {
    this.y -= amount;
  }

  heading(text: string, options: { size?: number; space?: number } = {}) {
    const size = options.size ?? 13;
    // Reserve room for the first lines of the section too, so a heading is never
    // left stranded at the bottom of a page with its content overleaf.
    this.ensure(size + 22 + 72);
    this.y -= size;
    this.doc.text(text, MARGIN, this.y, { size, font: 'bold', color: INK });
    this.y -= 8;
    this.doc.line(MARGIN, this.y, this.right, this.y, LINE, 0.6);
    this.y -= options.space ?? 14;
  }

  paragraph(
    text: string,
    options: { size?: number; font?: FontName; color?: RGB; width?: number; leading?: number; x?: number } = {},
  ) {
    const size = options.size ?? 9.5;
    const leading = options.leading ?? size * 1.5;
    const width = options.width ?? this.contentWidth;
    const x = options.x ?? MARGIN;
    for (const line of wrapText(text, size, options.font ?? 'regular', width)) {
      this.ensure(leading);
      this.y -= leading;
      if (line) this.doc.text(line, x, this.y, { size, font: options.font, color: options.color ?? MUTED });
    }
  }

  bullets(items: string[], options: { color?: RGB; size?: number } = {}) {
    const size = options.size ?? 9.5;
    for (const item of items) {
      this.ensure(size * 1.5);
      this.y -= size * 1.5;
      this.doc.text('•', MARGIN + 2, this.y, { size, color: options.color ?? SUBTLE });
      const lines = wrapText(item, size, 'regular', this.contentWidth - 16);
      lines.forEach((line, index) => {
        if (index > 0) {
          this.ensure(size * 1.45);
          this.y -= size * 1.45;
        }
        this.doc.text(line, MARGIN + 16, this.y, { size, color: MUTED });
      });
    }
  }

  /** Labelled value pair rendered in a light panel. */
  statPanel(entries: Array<{ label: string; value: string }>) {
    const columns = Math.min(entries.length, 3);
    const gap = 10;
    const boxWidth = (this.contentWidth - gap * (columns - 1)) / columns;
    const rows = Math.ceil(entries.length / columns);
    const boxHeight = 46;

    this.ensure(rows * (boxHeight + gap));

    entries.forEach((entry, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = MARGIN + column * (boxWidth + gap);
      const top = this.y - row * (boxHeight + gap);
      this.doc.rect(x, top - boxHeight, boxWidth, boxHeight, SURFACE);
      this.doc.text(entry.label.toUpperCase(), x + 10, top - 17, { size: 7, color: SUBTLE });
      this.doc.text(entry.value, x + 10, top - 34, { size: 12, font: 'bold', color: INK });
    });

    this.y -= rows * (boxHeight + gap);
  }

  scoreBar(label: string, score: number) {
    const height = 22;
    this.ensure(height + 6);
    this.y -= height;
    const barX = MARGIN + 130;
    const barWidth = this.contentWidth - 130 - 40;
    this.doc.text(label, MARGIN, this.y + 6, { size: 9, color: MUTED });
    this.doc.rect(barX, this.y + 4, barWidth, 8, [0.91, 0.92, 0.94]);
    this.doc.rect(barX, this.y + 4, (barWidth * Math.max(0, Math.min(100, score))) / 100, 8, hexToRgb(scoreColor(score)));
    this.doc.text(String(Math.round(score)), this.right - 22, this.y + 6, { size: 9, font: 'bold', color: INK });
    this.y -= 4;
  }

  table(headers: string[], rows: string[][], widths: number[]) {
    const size = 8;
    const padding = 6;
    const totalWidth = widths.reduce((sum, value) => sum + value, 0);
    const scale = this.contentWidth / totalWidth;
    const columnWidths = widths.map((width) => width * scale);

    const renderHeader = () => {
      this.ensure(22);
      this.y -= 18;
      this.doc.rect(MARGIN, this.y - 4, this.contentWidth, 20, SURFACE);
      let x = MARGIN;
      headers.forEach((header, index) => {
        this.doc.text(header.toUpperCase(), x + padding, this.y + 2, { size: 7, font: 'bold', color: SUBTLE });
        x += columnWidths[index] as number;
      });
      this.y -= 6;
    };

    renderHeader();

    for (const row of rows) {
      const cellLines = row.map((cell, index) =>
        wrapText(cell, size, 'regular', (columnWidths[index] as number) - padding * 2),
      );
      const height = Math.max(...cellLines.map((lines) => lines.length)) * (size * 1.45) + 8;

      if (this.y - height < MARGIN + 36) {
        this.ensure(height + 30);
        renderHeader();
      }

      let x = MARGIN;
      const top = this.y;
      cellLines.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => {
          this.doc.text(line, x + padding, top - 10 - lineIndex * (size * 1.45), { size, color: MUTED });
        });
        x += columnWidths[index] as number;
      });
      this.y -= height;
      this.doc.line(MARGIN, this.y + 2, this.right, this.y + 2, LINE, 0.5);
    }

    this.y -= 6;
  }

  finish(meta: { title: string; author: string }) {
    this.footer();
    return this.doc.build(meta);
  }
}

/**
 * Renders a saved report snapshot as a print-ready PDF.
 * Every AI-produced figure is labelled as an estimate, exactly as in the UI.
 */
export function renderReportPdf(snapshot: ReportSnapshot): Uint8Array {
  const detail = snapshot.analysis.detail;
  const layout = new Layout(`${snapshot.product.name} — research report`);
  const doc = layout.doc;
  const verdictColor = hexToRgb(VERDICT_HEX[snapshot.analysis.verdict]);

  // ---- Cover block -------------------------------------------------------
  doc.rect(0, doc.pageHeight - 132, doc.pageWidth, 132, [0.043, 0.055, 0.067]);
  doc.text(APP_NAME.toUpperCase(), MARGIN, doc.pageHeight - 42, { size: 8, font: 'bold', color: [0.75, 0.79, 0.84] });
  doc.text('PRODUCT RESEARCH REPORT', MARGIN, doc.pageHeight - 42 - 14, { size: 7, color: [0.5, 0.55, 0.62] });

  const nameLines = wrapText(snapshot.product.name, 20, 'bold', layout.contentWidth - 150);
  nameLines.slice(0, 2).forEach((line, index) => {
    doc.text(line, MARGIN, doc.pageHeight - 86 - index * 24, { size: 20, font: 'bold', color: [1, 1, 1] });
  });

  const metaLine = [snapshot.product.category ?? 'Uncategorised', new Date(snapshot.generatedAt).toISOString().slice(0, 10)]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(metaLine, MARGIN, doc.pageHeight - 122, { size: 8, color: [0.62, 0.67, 0.73] });

  // Score badge on the right of the cover band.
  const badgeWidth = 122;
  const badgeX = doc.pageWidth - MARGIN - badgeWidth;
  doc.rect(badgeX, doc.pageHeight - 116, badgeWidth, 74, [0.098, 0.118, 0.141]);
  doc.text('OVERALL SCORE', badgeX + 12, doc.pageHeight - 58, { size: 7, color: [0.6, 0.65, 0.71] });
  doc.text(`${snapshot.analysis.overallScore}`, badgeX + 12, doc.pageHeight - 84, {
    size: 26,
    font: 'bold',
    color: verdictColor,
  });
  doc.text('/ 100', badgeX + 12 + measureText(`${snapshot.analysis.overallScore}`, 26, 'bold') + 6, doc.pageHeight - 84, {
    size: 9,
    color: [0.6, 0.65, 0.71],
  });
  doc.text(VERDICT_LABELS[snapshot.analysis.verdict], badgeX + 12, doc.pageHeight - 102, {
    size: 9,
    font: 'bold',
    color: [0.88, 0.91, 0.94],
  });

  layout.space(150);

  if (snapshot.isDemo) {
    doc.rect(MARGIN, layout.cursor - 26, layout.contentWidth, 26, [0.99, 0.96, 0.9]);
    doc.text(
      'SAMPLE DATA — generated in demo mode without a connected AI provider.',
      MARGIN + 10,
      layout.cursor - 17,
      { size: 8, font: 'bold', color: [0.55, 0.36, 0.02] },
    );
    layout.space(38);
  }

  layout.paragraph(
    'Every score, price and projection in this report is an AI estimate produced from the product information supplied. It is not measured market data, and no live marketplace, advertising or search source was consulted.',
    { size: 8.5, color: SUBTLE },
  );
  layout.space(14);

  // ---- Scores ------------------------------------------------------------
  layout.heading('Product score');
  layout.scoreBar('Demand', snapshot.analysis.scores.demand);
  layout.scoreBar('Competition', snapshot.analysis.scores.competition);
  layout.scoreBar('Profit potential', snapshot.analysis.scores.profit);
  layout.scoreBar('Viral potential', snapshot.analysis.scores.viral);
  layout.space(10);
  layout.paragraph(`Demand — ${detail.scoreReasoning.demand}`, { size: 8.5 });
  layout.paragraph(`Competition — ${detail.scoreReasoning.competition}`, { size: 8.5 });
  layout.paragraph(`Profit potential — ${detail.scoreReasoning.profit}`, { size: 8.5 });
  layout.paragraph(`Viral potential — ${detail.scoreReasoning.viral}`, { size: 8.5 });
  layout.space(16);

  // ---- Overview ----------------------------------------------------------
  layout.heading('Product overview');
  layout.paragraph(detail.overview);
  layout.space(10);
  layout.paragraph('Target audience', { font: 'bold', color: INK, size: 9.5 });
  layout.paragraph(detail.targetAudience);
  layout.space(8);
  layout.paragraph('Problem solved', { font: 'bold', color: INK, size: 9.5 });
  layout.paragraph(detail.painPoint);
  layout.space(16);

  // ---- Pricing -----------------------------------------------------------
  layout.heading('Pricing and profitability');
  const currency = detail.pricing.currency || 'USD';
  layout.statPanel([
    {
      label: 'Est. sourcing price',
      value: `${currency} ${detail.pricing.sourcingPriceMin.toFixed(2)}-${detail.pricing.sourcingPriceMax.toFixed(2)}`,
    },
    {
      label: 'Recommended price',
      value: `${currency} ${detail.pricing.recommendedPriceMin.toFixed(2)}-${detail.pricing.recommendedPriceMax.toFixed(2)}`,
    },
    { label: 'Est. gross margin', value: `${detail.pricing.estimatedMarginPercent.toFixed(1)}%` },
  ]);
  layout.space(6);
  layout.paragraph(detail.pricing.rationale);
  layout.space(16);

  // ---- Market ------------------------------------------------------------
  layout.heading('Market opportunity');
  layout.paragraph(`Market saturation — ${detail.marketSaturation.level}`, { font: 'bold', color: INK, size: 9.5 });
  layout.paragraph(detail.marketSaturation.explanation);
  layout.space(8);
  layout.paragraph(`Seasonal dependency — ${detail.seasonality.dependency}`, { font: 'bold', color: INK, size: 9.5 });
  layout.paragraph(detail.seasonality.explanation);
  if (detail.seasonality.peakPeriods.length > 0) {
    layout.paragraph(`Peak periods: ${detail.seasonality.peakPeriods.join(', ')}`, { size: 8.5, color: SUBTLE });
  }
  layout.space(8);
  layout.paragraph(`Trend direction — ${detail.trend.direction} (estimated ${detail.trend.score}/100)`, {
    font: 'bold',
    color: INK,
    size: 9.5,
  });
  layout.paragraph(detail.trend.explanation);
  layout.paragraph('Live trend data is not connected; this is a reasoned estimate only.', {
    size: 8,
    color: SUBTLE,
  });
  layout.space(16);

  // ---- SWOT --------------------------------------------------------------
  layout.heading('SWOT');
  layout.paragraph('Strengths', { font: 'bold', color: INK, size: 9.5 });
  layout.bullets(detail.swot.strengths);
  layout.space(6);
  layout.paragraph('Weaknesses', { font: 'bold', color: INK, size: 9.5 });
  layout.bullets(detail.swot.weaknesses);
  layout.space(6);
  layout.paragraph('Opportunities', { font: 'bold', color: INK, size: 9.5 });
  layout.bullets(detail.swot.opportunities);
  layout.space(6);
  layout.paragraph('Risks', { font: 'bold', color: INK, size: 9.5 });
  layout.bullets(detail.swot.risks);
  layout.space(16);

  // ---- Competition -------------------------------------------------------
  layout.heading('Competition');
  if (snapshot.competitors && snapshot.competitors.rows.length > 0) {
    layout.paragraph(snapshot.competitors.summary);
    layout.space(8);
    layout.table(
      ['Competitor', 'Est. price', 'Positioning', 'Marketing angle', 'CTA'],
      snapshot.competitors.rows.map((row) => [
        row.name,
        row.price === null ? '—' : `$${row.price.toFixed(2)}`,
        row.estimatedPositioning,
        row.marketingAngle,
        row.cta,
      ]),
      [26, 12, 18, 30, 14],
    );
  } else {
    layout.paragraph(
      'No competitor analysis has been run for this product yet. Add competitor URLs in the Competitor Analysis tool to include a comparison here.',
      { color: SUBTLE },
    );
  }
  layout.space(16);

  // ---- SEO ---------------------------------------------------------------
  layout.heading('SEO keywords');
  if (snapshot.keywords && snapshot.keywords.items.length > 0) {
    layout.paragraph(`Primary keyword: ${snapshot.keywords.primaryKeyword}`, { font: 'bold', color: INK, size: 9.5 });
    layout.paragraph(`Suggested title: ${snapshot.keywords.suggestedTitle}`);
    layout.space(8);
    layout.table(
      ['Keyword', 'Group', 'Intent'],
      snapshot.keywords.items.slice(0, 24).map((item) => [item.keyword, item.group, item.estimatedIntent]),
      [50, 25, 25],
    );
    layout.paragraph('Search volume is not shown: no keyword data source is connected to this tool.', {
      size: 8,
      color: SUBTLE,
    });
  } else {
    layout.paragraph('No keyword research has been generated for this product yet.', { color: SUBTLE });
  }
  layout.space(16);

  // ---- Marketing ---------------------------------------------------------
  layout.heading('Marketing recommendations');
  for (const channel of snapshot.marketing.channels) {
    layout.paragraph(`${channel.channel} — ${channel.priority} priority`, { font: 'bold', color: INK, size: 9.5 });
    layout.paragraph(channel.why);
    layout.paragraph(`First step: ${channel.firstStep}`, { size: 8.5, color: SUBTLE });
    layout.space(6);
  }
  layout.space(10);

  // ---- Verdict -----------------------------------------------------------
  layout.heading('Final verdict');
  layout.ensure(40);
  doc.rect(MARGIN, layout.cursor - 30, layout.contentWidth, 30, SURFACE);
  doc.rect(MARGIN, layout.cursor - 30, 4, 30, verdictColor);
  doc.text(VERDICT_LABELS[snapshot.analysis.verdict], MARGIN + 16, layout.cursor - 19, {
    size: 12,
    font: 'bold',
    color: verdictColor,
  });
  const scoreLabel = `${snapshot.analysis.overallScore}/100`;
  doc.text(scoreLabel, layout.right - measureText(scoreLabel, 11, 'bold') - 12, layout.cursor - 19, {
    size: 11,
    font: 'bold',
    color: INK,
  });
  layout.space(42);
  layout.paragraph(detail.verdictReasoning);
  layout.space(10);
  layout.paragraph('Assumptions made', { font: 'bold', color: INK, size: 9.5 });
  layout.bullets(detail.assumptions);
  layout.space(10);
  layout.paragraph(
    `Confidence: ${detail.confidence}. Generated ${new Date(snapshot.generatedAt).toUTCString()} using ${snapshot.analysis.provider}/${snapshot.analysis.model}.`,
    { size: 8, color: SUBTLE },
  );

  return layout.finish({ title: `${snapshot.product.name} — research report`, author: APP_NAME });
}
