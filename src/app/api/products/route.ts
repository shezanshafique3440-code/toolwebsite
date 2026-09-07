import { jsonCreated, jsonOk, noStore, parseJsonBody, parseQuery, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/current-user';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { createProductSchema, listProductsSchema } from '@/lib/validation/tools';
import { listProducts } from '@/lib/services/products';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route('products.list', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('read', user.id);
  const query = parseQuery(request, listProductsSchema);
  const result = await listProducts(user.id, query);
  return noStore(jsonOk(result));
});

export const POST = route('products.create', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('write', `${user.id}:${clientIp(request)}`);
  const input = await parseJsonBody(request, createProductSchema);

  const product = await prisma.product.create({
    data: {
      userId: user.id,
      name: input.name,
      slug: slugify(input.name),
      url: input.url || null,
      imageUrl: input.imageUrl || null,
      category: input.category || null,
      notes: input.notes || null,
    },
  });

  return jsonCreated(product);
});
