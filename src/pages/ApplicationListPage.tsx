import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { listApplications, AppStatus, ProductType } from '@/lib/api/adminApi';
import { formatDate } from '@/lib/utils';
import {
    Search, ChevronLeft, ChevronRight, Eye,
    Wallet, PiggyBank, CreditCard, Inbox,
} from 'lucide-react';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppStatus, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Menunggu Review',
    IN_REVIEW: 'Dalam Review',
    RECOMMENDED: 'Direkomendasikan',
    FRAUD_REJECTED: 'Gagal Verifikasi KYC', // ← tambah
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    SIGNING: 'Penandatanganan',
    COMPLETED: 'Selesai',
    EXPIRED: 'Kedaluwarsa',
};

const STATUS_COLOR: Record<AppStatus, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    PENDING_REVIEW: 'bg-warning/10 text-warning border-warning/20',
    IN_REVIEW: 'bg-primary/10 text-primary border-primary/20',
    RECOMMENDED: 'bg-secondary/10 text-secondary border-secondary/20',
    APPROVED: 'bg-success/10 text-success border-success/20',
    REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
    SIGNING: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    COMPLETED: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    EXPIRED: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    FRAUD_REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const PRODUCT_LABEL: Record<ProductType, string> = {
    SAVING: 'Tabungan',
    DEPOSIT: 'Deposito',
    LOAN: 'Pinjaman',
};

const PRODUCT_ICON: Record<ProductType, React.ReactNode> = {
    SAVING: <PiggyBank className="w-6 h-6 text-primary" />,
    DEPOSIT: <Wallet className="w-6 h-6 text-primary" />,
    LOAN: <CreditCard className="w-6 h-6 text-primary" />,
};

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-72" />
                    </div>
                    <Skeleton className="h-8 w-28" />
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApplicationListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [status, setStatus] = useState<AppStatus | 'ALL'>(
        (searchParams.get('status') as AppStatus) ?? 'ALL'
    );
    const [product, setProduct] = useState<ProductType | 'ALL'>('ALL');

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const handleStatusChange = useCallback((val: string) => {
        setStatus(val as AppStatus | 'ALL');
        setPage(1);
        val !== 'ALL' ? setSearchParams({ status: val }) : setSearchParams({});
    }, [setSearchParams]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['applications', page, debouncedSearch, status, product],
        queryFn: () => listApplications({
            page,
            per_page: 15,
            search: debouncedSearch || undefined,
            status: status !== 'ALL' ? status : undefined,
            product_type: product !== 'ALL' ? product : undefined,
        }),
        placeholderData: keepPreviousData,
    });

    const items = data?.data ?? [];
    const totalPages = data?.total_pages ?? 1;
    const total = data?.total ?? 0;

    return (
        <AdminLayout title="Daftar Pengajuan">

            {/* ── Page heading ─────────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Daftar Pengajuan</h1>
                <p className="text-muted-foreground">
                    Kelola dan review semua pengajuan eForm nasabah
                </p>
            </div>

            {/* ── Filter bar ───────────────────────────────────────────── */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama nasabah atau NIK..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Filter status */}
                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-full md:w-52">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Status</SelectItem>
                                {(Object.keys(STATUS_LABEL) as AppStatus[]).map((k) => (
                                    <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filter produk */}
                        <Select value={product} onValueChange={(v) => { setProduct(v as ProductType | 'ALL'); setPage(1); }}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="Semua Produk" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Produk</SelectItem>
                                {(Object.keys(PRODUCT_LABEL) as ProductType[]).map((k) => (
                                    <SelectItem key={k} value={k}>{PRODUCT_LABEL[k]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Reset */}
                        {(status !== 'ALL' || product !== 'ALL' || search) && (
                            <Button variant="ghost" onClick={() => {
                                setSearch(''); setStatus('ALL'); setProduct('ALL');
                                setPage(1); setSearchParams({});
                            }}>
                                Reset
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Count ────────────────────────────────────────────────── */}
            {!isLoading && (
                <p className="text-sm text-muted-foreground mb-4">
                    {total > 0 ? `${total} pengajuan ditemukan` : ''}
                </p>
            )}

            {/* ── List ─────────────────────────────────────────────────── */}
            <div className={`space-y-4 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)

                ) : items.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="font-medium text-foreground mb-1">
                                Tidak ada pengajuan ditemukan
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Coba ubah filter atau kata kunci pencarian
                            </p>
                        </CardContent>
                    </Card>

                ) : (
                    items.map((app) => (
                        <Card
                            key={app.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/applications/${app.id}`)}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between gap-4">

                                    {/* Icon + Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Product icon */}
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            {PRODUCT_ICON[app.product_type]}
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                <h3 className="font-semibold text-foreground truncate">
                                                    {app.customer.full_name ?? (
                                                        <span className="text-muted-foreground italic font-normal text-sm">
                                                            Nama belum diisi
                                                        </span>
                                                    )}
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs shrink-0 ${STATUS_COLOR[app.status]}`}
                                                >
                                                    {STATUS_LABEL[app.status]}
                                                </Badge>
                                            </div>

                                            {/* Metadata row */}
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                                <span className="font-mono text-xs">
                                                    {app.customer.nik ?? 'NIK belum diisi'}
                                                </span>
                                                <span>•</span>
                                                <span>{PRODUCT_LABEL[app.product_type]}</span>
                                                {app.customer.phone_number && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{app.customer.phone_number}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span>
                                                    {app.submitted_at
                                                        ? formatDate(app.submitted_at)
                                                        : formatDate(app.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/applications/${app.id}`);
                                        }}
                                    >
                                        <Eye className="w-4 h-4" />
                                        Lihat Detail
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* ── Pagination ───────────────────────────────────────────── */}
            {total > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                        Halaman {page} dari {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="sm"
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page <= 1 || isFetching}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                            .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === '...' ? (
                                    <span key={`e-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                                ) : (
                                    <Button
                                        key={p}
                                        variant={p === page ? 'default' : 'outline'}
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={() => setPage(p as number)}
                                        disabled={isFetching}
                                    >
                                        {p}
                                    </Button>
                                )
                            )
                        }

                        <Button
                            variant="outline" size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= totalPages || isFetching}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}