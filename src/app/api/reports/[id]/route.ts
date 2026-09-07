import { jsonOk, noStore, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { deleteReport, getReport } from '@/lib/services/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<Record<string, string>> };

async function reportId(context: Context) {
  const params = await context.params;
  return params.id ?? '';
}

export const GET = route('reports.get', async (_request, context: Context) => {
  const user = await requireUser();
  await enforceRateLimit('read', user.id);
  const report = await getReport(user.id, await reportId(context));
  return noStore(jsonOk(report));
});

export const DELETE = route('reports.delete', async (_request, context: Context) => {
  const user = await requireUser();
  await enforceRateLimit('write', user.id);
  await deleteReport(user.id, await reportId(context));
  return jsonOk({ ok: true });
});
