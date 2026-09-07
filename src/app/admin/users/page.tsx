import type { Metadata } from 'next';
import Link from 'next/link';
import { UserActions } from '@/components/admin/user-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireAdmin } from '@/lib/auth/current-user';
import { listUsers } from '@/lib/services/admin';
import { PLANS } from '@/lib/plans';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Users' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listUsers({ q: params.q, page, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Users</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          {result.total} account{result.total === 1 ? '' : 's'}. Suspend, change plan, adjust credits or grant admin
          access.
        </p>
      </div>

      <form className="flex gap-2" role="search">
        <Input name="q" defaultValue={params.q ?? ''} placeholder="Search by name or email…" type="search" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Analyses</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-fg-muted">{user.email}</p>
                      </div>
                      {user.role === 'ADMIN' && <Badge variant="brand">Admin</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.subscription?.plan === 'FREE' ? 'neutral' : 'brand'}>
                      {PLANS[user.subscription?.plan ?? 'FREE'].name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'strong' : 'avoid'}>{user.status}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{user._count.products}</TableCell>
                  <TableCell className="tabular-nums">{user._count.analyses}</TableCell>
                  <TableCell className="tabular-nums">
                    {user.bonusCredits > 0 ? `+${user.bonusCredits}` : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-fg-muted">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <UserActions
                      user={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        status: user.status,
                        bonusCredits: user.bonusCredits,
                        plan: user.subscription?.plan ?? 'FREE',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {result.users.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-fg-muted">No users match that search.</p>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
            <Link href={`/admin/users?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), page: String(page - 1) })}`}>
              Previous
            </Link>
          </Button>
          <p className="text-sm text-fg-muted">
            Page {page} of {totalPages}
          </p>
          <Button asChild variant="secondary" size="sm" disabled={page >= totalPages}>
            <Link href={`/admin/users?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), page: String(page + 1) })}`}>
              Next
            </Link>
          </Button>
        </nav>
      )}
    </>
  );
}
