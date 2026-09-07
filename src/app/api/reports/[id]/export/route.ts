import { requireUser } from '@/lib/auth/current-user';
import { route, toErrorResponse } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getReport } from '@/lib/services/reports';
import { assertFeature } from '@/lib/services/tools';
import { renderReportPdf } from '@/lib/pdf/report';
import type { ReportSnapshot } from '@/lib/services/reports';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route('reports.export', async (_request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireUser();
  assertFeature(user, 'export');
  await enforceRateLimit('write', `export:${user.id}`);

  const params = await context.params;
  const report = await getReport(user.id, params.id ?? '');
  const snapshot = report.snapshot as unknown as ReportSnapshot;

  try {
    const bytes = renderReportPdf(snapshot);
    const filename = `${slugify(snapshot.product.name) || 'product'}-report.pdf`;
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return toErrorResponse(error, { route: 'reports.export', userId: user.id });
  }
});
