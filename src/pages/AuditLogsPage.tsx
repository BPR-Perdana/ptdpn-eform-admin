import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { listAuditLogs } from '@/lib/api/adminApi';
import { formatDateTime } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ─── Kategori action untuk filter ────────────────────────────────────────────

const ACTION_GROUPS = [
  { label: 'Semua Aksi', value: 'ALL' },
  { label: 'Login / Logout', value: 'LOGIN_SUCCESS' },
  { label: 'Login Gagal', value: 'LOGIN_FAILED' },
  { label: 'Pengajuan Dibuka', value: 'APP_OPENED' },
  { label: 'Direkomendasikan', value: 'APP_RECOMMENDED' },
  { label: 'Disetujui', value: 'APP_APPROVED' },
  { label: 'Ditolak', value: 'APP_REJECTED' },
  { label: 'Pengguna Dibuat', value: 'USER_CREATED' },
  { label: 'Pengguna Dinonaktifkan', value: 'USER_DEACTIVATED' },
  { label: 'Konfigurasi Diubah', value: 'CONFIG_UPDATED' },
] as const;

// ─── Color per actor type ─────────────────────────────────────────────────────

const ACTOR_COLOR: Record<string, string> = {
  internal_user: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-600',
};

// ─── Color per action prefix ──────────────────────────────────────────────────

function getActionColor(action: string): string {
  if (action.startsWith('LOGIN_FAILED') || action.includes('REJECTED') || action.includes('DEACTIVATED'))
    return 'text-red-600 bg-red-50';
  if (action.startsWith('LOGIN_SUCCESS') || action.includes('APPROVED') || action.includes('COMPLETED'))
    return 'text-green-700 bg-green-50';
  if (action.includes('CREATED') || action.includes('OPENED'))
    return 'text-blue-700 bg-blue-50';
  if (action.includes('RECOMMENDED'))
    return 'text-purple-700 bg-purple-50';
  return 'text-gray-700 bg-gray-50';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorSearch, setActorSearch] = useState('');
  const [debouncedActor, setDebouncedActor] = useState('');

  // Debounce actor search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedActor(actorSearch); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [actorSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, debouncedActor],
    queryFn: () => listAuditLogs({
      page,
      per_page: 25,
      action: actionFilter !== 'ALL' ? actionFilter : undefined,
      actor_id: debouncedActor || undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <AdminLayout title="Audit Log">

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filter action */}
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_GROUPS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search by actor */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan Actor ID..."
                className="pl-9 text-xs"
                value={actorSearch}
                onChange={(e) => setActorSearch(e.target.value)}
              />
            </div>

            {/* Reset */}
            {(actionFilter !== 'ALL' || actorSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setActionFilter('ALL'); setActorSearch(''); setPage(1); }}
              >
                Reset
              </Button>
            )}

            {/* Total count */}
            <span className="text-xs text-muted-foreground ml-auto">
              {!isLoading && `${total.toLocaleString()} log`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className={`overflow-x-auto transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Aktor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Aksi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Deskripsi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Entity</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-3.5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Tidak ada log ditemukan
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">

                      {/* Waktu */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>

                      {/* Aktor */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACTOR_COLOR[log.actor_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {log.actor_type}
                          </span>
                          {log.actor_username && (
                            <p className="text-xs text-gray-600 font-mono">
                              {log.actor_username}
                              {log.actor_role && (
                                <span className="text-gray-400 ml-1">· {log.actor_role}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono font-medium px-2 py-1 rounded ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Deskripsi */}
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                        {log.description ?? '—'}
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">
                        {log.entity_type && log.entity_id ? (
                          <span>
                            {log.entity_type}
                            <br />
                            <span className="text-gray-500">
                              {log.entity_id.slice(0, 8)}…
                            </span>
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────── */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {total.toLocaleString()} log
                {totalPages > 1 && ` · Halaman ${page} dari ${totalPages}`}
              </p>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1 || isFetching}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages || isFetching}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </AdminLayout>
  );
}