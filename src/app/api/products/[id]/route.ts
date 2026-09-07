import { jsonOk, noStore, parseJsonBody, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { updateProductSchema } from '@/lib/validation/tools';
import { deleteProduct, getOwnedProduct, getProductDetail } from '@/lib/services/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<Record<string, string>> };

async function productId(context: Context) {
  const params = await context.params;
  return params.id ?? '';
}

export const GET = route('products.get', async (_request, context: Context) => {
  const user = await requireUser();
  await enforceRateLimit('read', user.id);
  const product = await getProductDetail(user.id, await productId(context));
  return noStore(jsonOk(product));
});

export const PATCH = route('products.update', async (request, context: Context) => {
  const user = await requireUser();
  await enforceRateLimit('write', user.id);
  const id = await productId(context);
  await getOwnedProduct(user.id, id);
  const input = await parseJsonBody(request, updateProductSchema);

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      url: input.url === '' ? null : (input.url ?? undefined),
      imageUrl: input.imageUrl === '' ? null : (input.imageUrl ?? undefined),
      category: input.category ?? undefined,
      notes: input.notes ?? undefined,
    },
  });

  return jsonOk(product);
});

export const DELETE = route('products.delete', async (_request, context: Context) => {
  const user = await requireUser();
  await enforceRateLimit('write', user.id);
  await deleteProduct(user.id, await productId(context));
  return jsonOk({ ok: true });
});
