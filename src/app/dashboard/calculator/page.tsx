import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { ProfitCalculator } from '@/components/dashboard/profit-calculator';
import { requireUser } from '@/lib/auth/current-user';

export const metadata: Metadata = { title: 'Profit Calculator' };

function toNumber(value: string | string[] | undefined) {
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Profit Calculator"
        description="Model the unit economics before you commit budget. Unlimited on every plan, including Free."
      />
      <ProfitCalculator
        initial={{
          productCost: toNumber(params.cost),
          sellingPrice: toNumber(params.price),
        }}
      />
    </>
  );
}
