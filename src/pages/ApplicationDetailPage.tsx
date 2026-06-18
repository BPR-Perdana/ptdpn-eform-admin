import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  getApplicationDetail, getApplicationTimeline,
  openApplication, recommendApplication,
  approveApplication, rejectApplication, addNote,
  AppStatus, ProductType,
  getKTPImageUrl, getSelfieImageUrl,
} from '@/lib/api/adminApi';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime, formatCurrency, formatDateOnly } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle2, XCircle, ThumbsUp, FolderOpen,
  MessageSquarePlus, Loader2, Shield, User, Phone, Mail,
  MapPin, Banknote, Package, Calendar, FileText, AlertTriangle,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppStatus, string> = {
  DRAFT:          'Draft',
  PENDING_REVIEW: 'Menunggu Review',
  IN_REVIEW:      'Dalam Review',
  RECOMMENDED:    'Direkomendasikan',
  FRAUD_REJECTED: 'Gagal Verifikasi KYC',  // ← tambah
  APPROVED:       'Disetujui',
  REJECTED:       'Ditolak',
  SIGNING:        'Menunggu TTD',
  COMPLETED:      'Selesai',
  EXPIRED:        'Kedaluwarsa',
};

const FRAUD_STATUS_LABEL: Record<string, string> = {
    '001': 'Sedang Diproses',
    '002': 'Menunggu Review Manual',
    '003': 'Disetujui',
    '004': 'Ditolak',
    '006': 'Sertifikat Tidak Diterbitkan',
    '007': 'Sertifikat Diterbitkan',
}

const FRAUD_STATUS_COLOR: Record<string, string> = {
    '001': 'text-muted-foreground',
    '002': 'text-warning',
    '003': 'text-success',
    '004': 'text-destructive',
    '006': 'text-destructive',
    '007': 'text-success',
}

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
  SAVING: 'Tabungan', DEPOSIT: 'Deposito', LOAN: 'Pinjaman',
};

const ACTION_COLOR: Record<string, string> = {
  OPENED: 'bg-primary', RECOMMENDED: 'bg-secondary', APPROVED: 'bg-success',
  REJECTED: 'bg-destructive', NOTE_ADDED: 'bg-muted-foreground', REOPENED: 'bg-warning',
};

const ACTION_LABEL: Record<string, string> = {
  OPENED: 'Dibuka', RECOMMENDED: 'Direkomendasikan', APPROVED: 'Disetujui',
  REJECTED: 'Ditolak', NOTE_ADDED: 'Catatan Ditambahkan', REOPENED: 'Dibuka Kembali',
};

type DialogType = 'approve' | 'reject' | 'recommend' | 'note' | null;

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoItem({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-2 text-sm border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right ml-4 break-all">{value ?? '—'}</span>
    </div>
  );
}

function KTPImage({ appId }: { appId: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const src = getKTPImageUrl(appId);

  return (
    <div className="aspect-[3/2] rounded-lg border overflow-hidden bg-muted">
      {status === 'error' ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <FileText className="w-5 h-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground/50">Tidak tersedia</p>
        </div>
      ) : (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img
            src={src}
            alt="Foto KTP"
            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('error')}
          />
        </a>
      )}
    </div>
  );
}

function SelfieImage({ appId }: { appId: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const src = getSelfieImageUrl(appId);

  return (
    <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
      {status === 'error' ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <User className="w-5 h-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground/50">Tidak tersedia</p>
        </div>
      ) : (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img
            src={src}
            alt="Foto Selfie"
            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('error')}
          />
        </a>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isRole } = useAuth();

  const [dialog, setDialog] = useState<DialogType>(null);
  const [notes, setNotes] = useState('');

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplicationDetail(id!),
    enabled: !!id,
    refetchInterval: (query) => {
        const fraudStatus = query.state.data?.liveness_result?.fraud_status
        if (fraudStatus === '001' || fraudStatus === '002') {
            return 30_000 // refresh tiap 30 detik
        }
        return false // stop auto-refresh jika fraud sudah selesai
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['application-timeline', id],
    queryFn: () => getApplicationTimeline(id!),
    enabled: !!id && !!app,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['application', id] });
    qc.invalidateQueries({ queryKey: ['application-timeline', id] });
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const mutOpen = useMutation({ mutationFn: () => openApplication(id!), onSuccess: () => { toast.success('Pengajuan dibuka'); invalidate(); }, onError: (e: any) => toast.error('Gagal', { description: e.message }) });
  const mutRecommend = useMutation({ mutationFn: () => recommendApplication(id!, notes), onSuccess: () => { toast.success('Direkomendasikan'); closeDialog(); invalidate(); }, onError: (e: any) => toast.error('Gagal', { description: e.message }) });
  const mutApprove = useMutation({ mutationFn: () => approveApplication(id!, notes), onSuccess: () => { toast.success('Pengajuan disetujui'); closeDialog(); invalidate(); }, onError: (e: any) => toast.error('Gagal', { description: e.message }) });
  const mutReject = useMutation({ mutationFn: () => rejectApplication(id!, notes), onSuccess: () => { toast.success('Pengajuan ditolak'); closeDialog(); invalidate(); }, onError: (e: any) => toast.error('Gagal', { description: e.message }) });
  const mutNote = useMutation({ mutationFn: () => addNote(id!, notes), onSuccess: () => { toast.success('Catatan ditambahkan'); closeDialog(); invalidate(); }, onError: (e: any) => toast.error('Gagal', { description: e.message }) });

  const openDialog = (type: DialogType) => { setNotes(''); setDialog(type); };
  const closeDialog = () => { setDialog(null); setNotes(''); };
  const isAnyMutating = mutOpen.isPending || mutRecommend.isPending || mutApprove.isPending || mutReject.isPending || mutNote.isPending;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <AdminLayout title="Detail Pengajuan">
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </AdminLayout>
  );

  if (!app) return null;

  const status = app.status as AppStatus;
  const canOpen = status === 'PENDING_REVIEW' && isRole('admin', 'operator');
  const canRecommend = status === 'IN_REVIEW' && isRole('admin', 'operator');
  const fraudApproved = app.liveness_result?.fraud_status === '003'
    || app.liveness_result?.fraud_status === '007';
  const canApprove = status === 'RECOMMENDED' && isRole('admin', 'supervisor') && fraudApproved;
  const canReject = status === 'RECOMMENDED' && isRole('admin', 'supervisor');
  const canAddNote = ['IN_REVIEW', 'RECOMMENDED'].includes(status) && isRole('admin', 'operator', 'supervisor');

  // KYC score (0–100 dari liveness score)
  const kycScore = app.liveness_result?.liveness_score != null
    ? Math.round(app.liveness_result.liveness_score * 100)
    : null;

  return (
    <AdminLayout title="Detail Pengajuan">

      {/* ── Back + heading ────────────────────────────────────────── */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/applications')} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-3xl font-bold text-foreground">
                {app.customer?.full_name ?? (
                  <span className="text-muted-foreground italic font-normal">Nama belum diisi</span>
                )}
              </h1>
              <Badge variant="outline" className={`text-sm ${STATUS_COLOR[status]}`}>
                {STATUS_LABEL[status]}
              </Badge>
              <Badge variant="outline">
                {PRODUCT_LABEL[app.product_type as ProductType]}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{app.id}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canAddNote && (
              <Button variant="outline" size="sm" onClick={() => openDialog('note')} disabled={isAnyMutating}>
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Catatan
              </Button>
            )}
            {canOpen && (
              <Button size="sm" variant="outline" onClick={() => mutOpen.mutate()} disabled={isAnyMutating}>
                {mutOpen.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-2" />}
                Buka Review
              </Button>
            )}
            {canRecommend && (
              <Button size="sm" className="bg-secondary hover:bg-secondary/90" onClick={() => openDialog('recommend')} disabled={isAnyMutating}>
                <ThumbsUp className="w-4 h-4 mr-2" />
                Rekomendasikan
              </Button>
            )}
            {canReject && (
              <Button size="sm" variant="destructive" onClick={() => openDialog('reject')} disabled={isAnyMutating}>
                <XCircle className="w-4 h-4 mr-2" />
                Tolak
              </Button>
            )}
            {canApprove && (
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => openDialog('approve')} disabled={isAnyMutating}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Setujui
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Kiri: Data nasabah ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Identitas nasabah */}
          <Card>
            <CardHeader>
              <CardTitle>Identitas (Data KTP)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem icon={User} label="Nama Lengkap"
                  value={app.ocr_result?.full_name ?? app.customer?.full_name} />
                <InfoItem icon={Shield} label="NIK"
                  value={app.ocr_result?.nik ?? app.customer?.nik} />
                <InfoItem icon={MapPin} label="Tempat Lahir"
                  value={app.ocr_result?.birth_place} />
                <InfoItem icon={Calendar} label="Tanggal Lahir"
                  value={formatDateOnly(app.ocr_result?.birth_date)} />
                <InfoItem icon={User} label="Jenis Kelamin"
                  value={app.ocr_result?.gender} />
                <InfoItem icon={User} label="Agama"
                  value={app.ocr_result?.religion} />
                <InfoItem icon={User} label="Status Perkawinan"
                  value={app.ocr_result?.marital_status} />
                <InfoItem icon={User} label="Kewarganegaraan"
                  value={app.ocr_result?.nationality} />
                <InfoItem icon={MapPin} label="Alamat KTP"
                  value={app.ocr_result?.address ?? app.customer?.current_address} />
                <InfoItem icon={User} label="Pekerjaan (KTP)"
                  value={app.ocr_result?.occupation} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kontak & Data Tambahan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem icon={Mail} label="Email"
                  value={app.customer?.email} />
                <InfoItem icon={Phone} label="No. Telepon"
                  value={app.customer?.phone_number} />
                <InfoItem icon={Phone} label="No. WhatsApp"
                  value={app.customer?.phone_number_wa} />
                <InfoItem icon={User} label="Nama Ibu Kandung"
                  value={app.customer?.mothers_maiden_name} />
                <InfoItem icon={User} label="Pekerjaan"
                  value={app.customer?.occupation} />
                <InfoItem icon={Calendar} label="Lama Bekerja"
                  value={app.customer?.work_duration
                    ? `${app.customer.work_duration} tahun`
                    : null} />
                <InfoItem icon={Banknote} label="Penghasilan/Bulan"
                  value={app.customer?.monthly_income
                    ? formatCurrency(app.customer.monthly_income)
                    : null} />
                <InfoItem icon={User} label="Pendidikan Terakhir"
                  value={app.customer?.education} />
                <InfoItem icon={MapPin} label="Alamat Domisili/Kerja"
                  value={app.customer?.work_address} />
              </div>
            </CardContent>
          </Card>

          {/* Detail produk */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Produk</CardTitle>
            </CardHeader>
            <CardContent>
              {app.saving_detail && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={Package} label="Produk" value={app.saving_detail.product_name} />
                  <InfoItem icon={Banknote} label="Setoran Awal" value={formatCurrency(app.saving_detail.initial_deposit)} />
                  <InfoItem icon={User} label="Sumber Dana" value={app.saving_detail.source_of_funds} />
                  <InfoItem icon={User} label="Tujuan" value={app.saving_detail.saving_purpose} />
                </div>
              )}
              {app.deposit_detail && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={Package} label="Produk" value={app.deposit_detail.product_name} />
                  <InfoItem icon={Banknote} label="Nominal" value={formatCurrency(app.deposit_detail.placement_amount)} />
                  <InfoItem icon={Calendar} label="Tenor" value={`${app.deposit_detail.tenor_months} bulan`} />
                  <InfoItem icon={User} label="Rollover" value={app.deposit_detail.rollover_type} />
                </div>
              )}
              {app.loan_detail && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={Package} label="Produk" value={app.loan_detail.product_name} />
                  <InfoItem icon={Banknote} label="Plafon" value={formatCurrency(app.loan_detail.requested_amount)} />
                  <InfoItem icon={Calendar} label="Tenor" value={`${app.loan_detail.tenor_months} bulan`} />
                  <InfoItem icon={User} label="Tujuan" value={app.loan_detail.loan_purpose} />
                </div>
              )}
              {!app.saving_detail && !app.deposit_detail && !app.loan_detail && (
                <p className="text-sm text-muted-foreground">Belum diisi</p>
              )}
            </CardContent>
          </Card>

          {/* Rekening pencairan */}
          {app.disbursement_data && (
            <Card>
              <CardHeader>
                <CardTitle>Rekening Pencairan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={Banknote} label="Bank" value={app.disbursement_data.bank_name} />
                  <InfoItem icon={Banknote} label="No. Rekening" value={app.disbursement_data.account_number} />
                  <InfoItem icon={User} label="Atas Nama" value={app.disbursement_data.account_holder} />
                  <InfoItem icon={Banknote} label="Kode Bank" value={app.disbursement_data.bank_code} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline Review</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada aktivitas review
                </p>
              ) : (
                <ol className="relative border-l border-border ml-3 space-y-6">
                  {timeline.map((item) => (
                    <li key={item.id} className="ml-6">
                      <span className={`absolute -left-1.5 flex w-3 h-3 rounded-full ${ACTION_COLOR[item.action] ?? 'bg-muted-foreground'}`} />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-semibold">{ACTION_LABEL[item.action] ?? item.action}</p>
                        <time className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</time>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium">{item.actor_username}</span>
                        {' · '}<span className="capitalize">{item.actor_role}</span>
                      </p>
                      {item.notes && (
                        <p className="mt-1.5 text-sm bg-muted rounded-lg px-3 py-2 border border-border">
                          {item.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Kanan: KYC + info tambahan ──────────────────────────── */}
        <div className="space-y-6">

          {/* KYC Verification — mirip referensi dengan progress bar */}
          {/* KYC Verification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Verifikasi eKYC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {app.liveness_result ? (
                <>
                  {/* ── Foto KTP & Selfie ───────────────────────── */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Foto KTP */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Foto KTP</p>
                      <KTPImage appId={app.id} />
                    </div>
                    {/* Foto Selfie */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Foto Selfie</p>
                      <SelfieImage appId={app.id} />
                    </div>
                  </div>

                  <Separator />

                  {/* ── Status liveness & face match ───────────── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Liveness</span>
                      {app.liveness_result.liveness_status === 'PASSED'
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <XCircle className="w-5 h-5 text-destructive" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Face Match</span>
                      {app.liveness_result.face_match_status === 'MATCHED'
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <XCircle className="w-5 h-5 text-destructive" />}
                    </div>
                  </div>

                  <Separator />

                  {/* ── Fraud Verification Status ─────────────────────── */}
                  <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Verifikasi Fraud VIDA</p>
                      {app.liveness_result?.fraud_status ? (
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  {/* Icon berdasarkan status */}
                                  {app.liveness_result.fraud_status === '003' || app.liveness_result.fraud_status === '007' ? (
                                      <CheckCircle2 className="w-4 h-4 text-success" />
                                  ) : app.liveness_result.fraud_status === '004' || app.liveness_result.fraud_status === '006' ? (
                                      <XCircle className="w-4 h-4 text-destructive" />
                                  ) : (
                                      <Loader2 className="w-4 h-4 text-warning animate-spin" />
                                  )}
                                  <span className={`text-sm ${FRAUD_STATUS_COLOR[app.liveness_result.fraud_status] ?? 'text-muted-foreground'}`}>
                                      {FRAUD_STATUS_LABEL[app.liveness_result.fraud_status] ?? app.liveness_result.fraud_status}
                                  </span>
                              </div>
                              {/* Badge status code */}
                              <Badge variant="outline" className="text-xs font-mono">
                                  {app.liveness_result.fraud_status}
                              </Badge>
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground">Belum diproses</p>
                      )}

                      {/* KYC Event ID — hanya tampil jika sudah tersedia */}
                      {app.liveness_result?.kyc_event_id && (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">KYC Event ID</p>
                              <p className="text-xs font-mono break-all text-foreground">
                                  {app.liveness_result.kyc_event_id}
                              </p>
                          </div>
                      )}

                      {/* Warning jika fraud belum selesai dan status RECOMMENDED */}
                      {status === 'RECOMMENDED'
                          && app.liveness_result?.fraud_status !== '003'
                          && app.liveness_result?.fraud_status !== '007' && (
                          <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-md border border-warning/20">
                              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-warning">
                                  Verifikasi fraud belum selesai. Tombol "Setujui" akan aktif setelah VIDA menyelesaikan review.
                              </p>
                          </div>
                      )}
                  </div>

                  {kycScore !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">KYC Score</span>
                        <span className="text-2xl font-bold">{kycScore}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${kycScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
                    <Badge
                      variant="outline"
                      className={
                        app.liveness_result.liveness_status === 'PASSED'
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }
                    >
                      {app.liveness_result.liveness_status === 'PASSED' ? 'Low Risk' : 'High Risk'}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum diverifikasi</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OCR KTP */}
          {app.ocr_result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hasil OCR KTP</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="NIK" value={app.ocr_result.nik} />
                <InfoRow label="Nama" value={app.ocr_result.full_name} />
                <InfoRow label="Tempat Lahir" value={app.ocr_result.birth_place} />
                <InfoRow label="Tanggal Lahir" value={formatDateOnly(app.ocr_result.birth_date)} />
                <InfoRow label="Jenis Kelamin" value={app.ocr_result.gender} />
                <InfoRow label="Agama" value={app.ocr_result.religion} />
                <InfoRow label="Status Kawin" value={app.ocr_result.marital_status} />
                <InfoRow label="Pekerjaan" value={app.ocr_result.occupation} />
                <InfoRow label="Kewarganegaraan" value={app.ocr_result.nationality} />
                <InfoRow label="Alamat" value={app.ocr_result.address} />
                {app.ocr_result.confidence_score != null && (
                  <InfoRow
                    label="OCR Confidence"
                    value={app.ocr_result.confidence_score > 0
                      ? `${(app.ocr_result.confidence_score * 100).toFixed(1)}%`
                      : 'N/A'}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Info pengajuan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Pengajuan</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="ID" value={app.id.slice(0, 8).toUpperCase() + '...'} />
              <InfoRow label="Produk" value={PRODUCT_LABEL[app.product_type as ProductType]} />
              <InfoRow label="Step" value={`${app.current_step}/7`} />
              <InfoRow label="Dibuat" value={formatDateTime(app.created_at)} />
              <InfoRow label="Disubmit" value={app.submitted_at ? formatDateTime(app.submitted_at) : null} />
            </CardContent>
          </Card>

          {(status === 'SIGNING' || status === 'COMPLETED') && (
            <Card className={
              status === 'COMPLETED'
                ? 'border-success/30 bg-success/5'
                : 'border-primary/30 bg-primary/5'
            }>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {status === 'COMPLETED' ? 'Kontrak Ditandatangani' : 'Menunggu Tanda Tangan'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.contract_document ? (
                  <>
                    {/* Status tanda tangan */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status TTD</span>
                      <Badge
                        variant="outline"
                        className={
                          app.contract_document.sign_status === 'COMPLETED'
                            ? 'bg-success/10 text-success border-success/20'
                            : app.contract_document.sign_status === 'EXPIRED' ||
                              app.contract_document.sign_status === 'FAILED'
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                        }
                      >
                        {app.contract_document.sign_status === 'COMPLETED' && '✓ Sudah TTD'}
                        {app.contract_document.sign_status === 'SIGNING' && '⏳ Link Terkirim'}
                        {app.contract_document.sign_status === 'PENDING' && '🔄 Diproses'}
                        {app.contract_document.sign_status === 'EXPIRED' && '✗ Kedaluwarsa'}
                        {app.contract_document.sign_status === 'FAILED' && '✗ Gagal'}
                      </Badge>
                    </div>

                    {/* eMeterai */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">eMeterai</span>
                      <span className={`text-sm font-medium ${app.contract_document.emeterai_applied_at
                        ? 'text-success'
                        : 'text-muted-foreground'
                        }`}>
                        {app.contract_document.emeterai_applied_at ? '✓ Diterapkan' : '— Belum'}
                      </span>
                    </div>

                    <InfoRow
                      label="Kontrak Dibuat"
                      value={formatDateTime(app.contract_document.generated_at)}
                    />

                    {app.contract_document.sign_link_sent_at && (
                      <InfoRow
                        label="Link TTD Dikirim"
                        value={formatDateTime(app.contract_document.sign_link_sent_at)}
                      />
                    )}

                    {app.contract_document.sign_deadline && (
                      <InfoRow
                        label="Batas TTD"
                        value={formatDateTime(app.contract_document.sign_deadline)}
                      />
                    )}

                    {app.contract_document.signed_at && (
                      <InfoRow
                        label="Ditandatangani"
                        value={formatDateTime(app.contract_document.signed_at)}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Kontrak sedang diproses...
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Bukti Transfer ─────────────────────────────────── */}
      {(app.product_type === 'DEPOSIT' || app.product_type === 'SAVING') && (
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                      <Upload className="w-4 h-4" />
                      Bukti Transfer
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  {app.payment_proof_path ? (
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 text-success text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Bukti transfer sudah diupload</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                              {formatDateOnly(app.payment_proof_at)}
                          </p>
                          {/* Link download jika perlu */}
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground italic">
                          Nasabah belum mengupload bukti transfer
                      </p>
                  )}
              </CardContent>
          </Card>
      )}

      {/* ── Dialog ────────────────────────────────────────────────── */}
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === 'approve' && 'Setujui Pengajuan'}
              {dialog === 'reject' && 'Tolak Pengajuan'}
              {dialog === 'recommend' && 'Rekomendasikan ke Supervisor'}
              {dialog === 'note' && 'Tambah Catatan Internal'}
            </DialogTitle>
            <DialogDescription>
              {dialog === 'approve' && 'Pengajuan ini akan disetujui. Tindakan ini tidak dapat dibatalkan.'}
              {dialog === 'reject' && 'Pengajuan ini akan ditolak. Harap isi alasan penolakan.'}
              {dialog === 'recommend' && 'Pengajuan akan diteruskan ke supervisor untuk persetujuan akhir.'}
              {dialog === 'note' && 'Catatan ini hanya terlihat oleh tim internal.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">
              {dialog === 'reject' ? 'Alasan Penolakan *' : 'Catatan (Opsional)'}
            </label>
            <Textarea
              placeholder={dialog === 'reject' ? 'Jelaskan alasan penolakan...' : 'Tambahkan catatan...'}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
            {dialog === 'reject' && !notes.trim() && (
              <p className="text-xs text-destructive">Alasan penolakan wajib diisi.</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isAnyMutating}>
              Batal
            </Button>
            <Button
              variant={dialog === 'reject' ? 'destructive' : 'default'}
              className={dialog === 'approve' ? 'bg-success hover:bg-success/90' : dialog === 'recommend' ? 'bg-secondary hover:bg-secondary/90' : ''}
              disabled={isAnyMutating || (dialog === 'reject' && !notes.trim())}
              onClick={() => {
                if (dialog === 'recommend') mutRecommend.mutate();
                if (dialog === 'approve') mutApprove.mutate();
                if (dialog === 'reject') mutReject.mutate();
                if (dialog === 'note') mutNote.mutate();
              }}
            >
              {isAnyMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {dialog === 'approve' && 'Ya, Setujui'}
              {dialog === 'reject' && 'Ya, Tolak'}
              {dialog === 'recommend' && 'Ya, Rekomendasikan'}
              {dialog === 'note' && 'Simpan Catatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}