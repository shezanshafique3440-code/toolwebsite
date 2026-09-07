/**
 * Minimal PDF writer.
 *
 * Report export needs to work on a serverless runtime with no headless browser
 * and no native modules, so the document is assembled directly: base-14 Type1
 * fonts (Helvetica / Helvetica-Bold), WinAnsi encoding, and real glyph widths so
 * text wrapping and centring are accurate rather than estimated.
 */

export type RGB = [number, number, number];

const HELVETICA_WIDTHS: Record<number, number> = buildWidths(
  '278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584',
);

const HELVETICA_BOLD_WIDTHS: Record<number, number> = buildWidths(
  '278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584',
);

function buildWidths(source: string) {
  const values = source.trim().split(/\s+/).map(Number);
  const table: Record<number, number> = {};
  values.forEach((width, index) => {
    table[32 + index] = width;
  });
  return table;
}

/** Characters outside WinAnsi's safe ASCII range are transliterated. */
const TRANSLITERATIONS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '‚': ',',
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '—',
  '…': '...',
  ' ': ' ',
  '•': '-',
  '→': '->',
  '×': 'x',
};

export function sanitizeText(value: string) {
  let out = '';
  for (const char of value.replace(/\r\n?/g, '\n')) {
    const replacement = TRANSLITERATIONS[char];
    if (replacement !== undefined) {
      out += replacement === '—' ? '-' : replacement;
      continue;
    }
    const code = char.codePointAt(0) ?? 32;
    out += code >= 32 && code <= 126 ? char : code === 10 ? '\n' : ' ';
  }
  return out;
}

export type FontName = 'regular' | 'bold';

export function measureText(text: string, size: number, font: FontName) {
  const table = font === 'bold' ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    total += table[text.charCodeAt(index)] ?? 556;
  }
  return (total * size) / 1000;
}

export function wrapText(text: string, size: number, font: FontName, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of sanitizeText(text).split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureText(candidate, size, font) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function escapeString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Accumulates one page's content stream. */
class Page {
  readonly operations: string[] = [];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export class PdfDocument {
  readonly pageWidth: number;
  readonly pageHeight: number;
  private pages: Page[] = [];
  private current: Page;

  constructor(pageWidth = 595.28, pageHeight = 841.89) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.current = new Page(pageWidth, pageHeight);
    this.pages.push(this.current);
  }

  addPage() {
    this.current = new Page(this.pageWidth, this.pageHeight);
    this.pages.push(this.current);
    return this.current;
  }

  get pageCount() {
    return this.pages.length;
  }

  /** Draws a single line of text with its baseline at `y` (origin bottom-left). */
  text(value: string, x: number, y: number, options: { size?: number; font?: FontName; color?: RGB } = {}) {
    const size = options.size ?? 10;
    const font = options.font ?? 'regular';
    const [r, g, b] = options.color ?? [0.06, 0.09, 0.11];
    const resource = font === 'bold' ? '/F2' : '/F1';
    this.current.operations.push(
      `BT ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${resource} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapeString(sanitizeText(value))}) Tj ET`,
    );
  }

  rect(x: number, y: number, width: number, height: number, color: RGB) {
    const [r, g, b] = color;
    this.current.operations.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.7) {
    const [r, g, b] = color;
    this.current.operations.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  /** Serialises the document, building the cross-reference table as it goes. */
  build(meta: { title: string; author: string }): Uint8Array {
    const objects: string[] = [];
    const pageObjectStart = 5;
    const pageIds = this.pages.map((_, index) => pageObjectStart + index * 2);

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    this.pages.forEach((page, index) => {
      const pageId = pageIds[index] as number;
      const contentId = pageId + 1;
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width.toFixed(2)} ${page.height.toFixed(2)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
      const stream = page.operations.join('\n');
      objects[contentId] = `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`;
    });

    const infoId = pageObjectStart + this.pages.length * 2;
    objects[infoId] =
      `<< /Title (${escapeString(sanitizeText(meta.title))}) /Author (${escapeString(sanitizeText(meta.author))}) ` +
      `/Producer (ProductPilot AI) /CreationDate (${pdfDate(new Date())}) >>`;

    let output = '%PDF-1.4\n%âãÏÓ\n';
    const offsets: number[] = [];

    for (let id = 1; id <= infoId; id += 1) {
      const body = objects[id];
      if (!body) continue;
      offsets[id] = byteLength(output);
      output += `${id} 0 obj\n${body}\nendobj\n`;
    }

    const xrefOffset = byteLength(output);
    const maxId = infoId + 1;
    output += `xref\n0 ${maxId}\n0000000000 65535 f \n`;
    for (let id = 1; id < maxId; id += 1) {
      const offset = offsets[id];
      output +=
        offset === undefined
          ? '0000000000 65535 f \n'
          : `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }
    output += `trailer\n<< /Size ${maxId} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return latin1Bytes(output);
  }
}

function byteLength(value: string) {
  // Content is written as Latin-1, so one character is one byte.
  return value.length;
}

function latin1Bytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function pdfDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}
