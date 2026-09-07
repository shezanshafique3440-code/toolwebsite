import { jsonCreated, jsonOk, noStore, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { saveReportSchema } from '@/lib/validation/tools';
import { listReports, saveReport } from '@/lib/services/reports';
import { assertFeature } from '@/lib/services/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route('reports.list', async () => {
  const user = await requireUser();
  await enforceRateLimit('read', user.id);
  return noStore(jsonOk(await listReports(user.id)));
});

export const POST = route('reports.create', async (request) => {
  const user = await requireUser();
  assertFeature(user, 'savedReports');
  await enforceRateLimit('write', user.id);
  const input = await parseJsonBody(request, saveReportSchema);
  const report = await saveReport(user.id, input.productId, input.analysisId, input.title);
  return jsonCreated({ id: report.id, title: report.title, createdAt: report.createdAt });
});
