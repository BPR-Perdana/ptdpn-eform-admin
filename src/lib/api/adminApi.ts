/**
 * adminApi.ts
 * Semua API call untuk admin dashboard.
 */

import { adminClient } from './client';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppStatus =
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'IN_REVIEW'
    | 'RECOMMENDED'
    | 'FRAUD_REJECTED'   // ← baru
    | 'APPROVED'
    | 'REJECTED'
    | 'SIGNING'
    | 'COMPLETED'
    | 'EXPIRED';

export type ProductType = 'SAVING' | 'DEPOSIT' | 'LOAN';

// ── Fraud status codes dari VIDA ──────────────────────────────────────────────
// '001' = in progress
// '002' = submitted for manual review (menunggu)
// '003' = approved, certificate issued → kyc_event_id tersedia
// '004' = rejected by manual review
// '006' = certificate not issued
// '007' = certificate issued
export type FraudStatus = '001' | '002' | '003' | '004' | '006' | '007';

// ── OCR Result ────────────────────────────────────────────────────────────────
export interface OCRResult {
    id: string;
    application_id: string;
    nik: string | null;
    full_name: string | null;
    birth_place: string | null;
    birth_date: string | null;
    gender: string | null;
    address: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    kabupaten_kota: string | null;
    provinsi: string | null;
    religion: string | null;
    marital_status: string | null;
    occupation: string | null;
    nationality: string | null;
    confidence_score: number | null;
    ktp_image_path: string | null;
}

// ── Liveness Result ───────────────────────────────────────────────────────────
export interface LivenessResult {
    id: string;
    application_id: string;
    vida_request_id: string;
    liveness_status: string        // 'PASSED' | 'FAILED'
    liveness_score: number | null;
    face_match_status: string | null;  // 'MATCHED' | 'NOT_MATCHED'
    face_match_score: number | null;
    // ── Fraud verification (Sprint B) ─────────────────────────────────────────
    fraud_status: FraudStatus;     // status dari VIDA fraud polling
    kyc_event_id: string | null;   // tersedia saat fraud_status = '003' atau '007'
    selfie_image_path: string | null;
}

// ── Disbursement Data ─────────────────────────────────────────────────────────
export interface DisbursementData {
    id: string;
    bank_name: string;
    bank_code: string;
    account_number: string;
    account_holder: string;
}

// ── Product Details ───────────────────────────────────────────────────────────
export interface SavingDetail {
    product_name: string;
    initial_deposit: number;
    source_of_funds: string;
    saving_purpose: string;
}

export interface DepositDetail {
    product_name: string;
    placement_amount: number;
    tenor_months: number;
    interest_rate: string | null;
    rollover_type: string;
    source_of_funds: string;
    investment_purpose: string | null;
}

export interface LoanDetail {
    product_name: string;
    requested_amount: number;
    tenor_months: number;
    loan_purpose: string;
    payment_source: string;
    source_of_funds: string;
}

// ── Contract Document ─────────────────────────────────────────────────────────
export interface ContractDocument {
    id: string;
    document_type: 'SAVING' | 'DEPOSIT' | 'LOAN';
    sign_status: 'PENDING' | 'SIGNING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
    sign_link: string | null;
    sign_link_sent_at: string | null;
    sign_deadline: string | null;
    signed_at: string | null;
    emeterai_applied_at: string | null;
    generated_at: string;
}

// ── Customer (di dalam ApplicationDetail) ─────────────────────────────────────
export interface CustomerDetail {
    id: string;
    full_name: string | null;
    nik: string | null;
    phone_number: string | null;
    phone_number_wa: string | null;
    email: string | null;
    phone_verified: boolean;
    phone_verified_at: string | null;
    education: string | null;
    occupation: string | null;
    monthly_income: number | null;
    mothers_maiden_name: string | null;
    work_address: string | null;
    work_duration: string | null;
}

// ── Application List Item ─────────────────────────────────────────────────────
export interface ApplicationListItem {
    id: string;
    product_type: ProductType;
    status: AppStatus;
    current_step: number;
    submitted_at: string | null;
    created_at: string;
    customer: {
        id: string;
        full_name: string | null;
        nik: string | null;
        phone_number: string | null;
        email: string | null;
    };
}

// ── Application Detail (full) ─────────────────────────────────────────────────
export interface ApplicationDetail extends ApplicationListItem {
    customer: CustomerDetail;
    ocr_result: OCRResult | null;
    liveness_result: LivenessResult | null;
    disbursement_data: DisbursementData | null;
    collateral_items: any[];
    deposit_detail: DepositDetail | null;
    saving_detail: SavingDetail | null;
    loan_detail: LoanDetail | null;
    contract_document: ContractDocument | null;  // note: singular, bukan array
    payment_proof_path: string | null;
    payment_proof_at:   string | null;
    updated_at: string;
}

export interface SystemConfig {
    config_key: string;
    config_value: string;
    description: string | null;
    is_public: boolean;
    updated_by: string | null;
    updated_at: string;
}

export interface AuditLog {
    id: number;
    actor_type: 'customer' | 'internal_user' | 'system';
    actor_id: string | null;
    actor_username: string | null;
    actor_role: string | null;
    action: string;
    description: string | null;
    entity_type: string | null;
    entity_id: string | null;
    ip_address: string | null;
    created_at: string;
}

export interface ApplicationNote {
    id: string;
    author: string;
    content: string;
    created_at: string;
}

export type DashboardStats = Record<string, number>;

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'supervisor' | 'operator';
    is_active: boolean;
    created_at: string;
}

export const ROLE_ID_MAP: Record<AdminUser['role'], number> = {
    admin: 1,
    supervisor: 2,
    operator: 3,
};

export interface ListApplicationsParams {
    page?: number;
    per_page?: number;
    status?: AppStatus;
    product_type?: ProductType;
    search?: string;
    date_from?: string;
    date_to?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface ReviewAction {
    id: string;
    application_id: string;
    actor_id: string;
    actor_username: string;
    actor_role: 'admin' | 'supervisor' | 'operator';
    action: 'OPENED' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'NOTE_ADDED' | 'REOPENED';
    notes: string | null;
    created_at: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
    const res = await adminClient.get<ApiResponse<{ stats: DashboardStats }>>('/admin/dashboard/stats');
    return res.data.data.stats;
}

// ─── Applications ─────────────────────────────────────────────────────────────

export async function listApplications(
    params?: ListApplicationsParams
): Promise<PaginatedResponse<ApplicationListItem>> {
    const res = await adminClient.get<ApiResponse<{
        applications: ApplicationListItem[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
    }>>('/admin/applications', { params });

    const raw = res.data.data;
    return {
        data: raw.applications,
        total: raw.total,
        page: raw.page,
        per_page: raw.per_page,
        total_pages: raw.total_pages,
    };
}

export function getKTPImageUrl(appId: string): string {
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
    const token = localStorage.getItem('admin_token') ?? '';
    return `${base}/admin/applications/${appId}/images/ktp?token=${token}`;
}

export function getSelfieImageUrl(appId: string): string {
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
    const token = localStorage.getItem('admin_token') ?? '';
    return `${base}/admin/applications/${appId}/images/selfie?token=${token}`;
}

export async function getApplicationDetail(id: string): Promise<ApplicationDetail> {
    const res = await adminClient.get<ApiResponse<ApplicationDetail>>(
        `/admin/applications/${id}`
    );
    return res.data.data;
}

export async function openApplication(id: string): Promise<void> {
    await adminClient.patch(`/admin/applications/${id}/open`);
}

export async function recommendApplication(id: string, notes?: string): Promise<void> {
    await adminClient.patch(`/admin/applications/${id}/recommend`, { notes });
}

export async function approveApplication(id: string, notes?: string): Promise<void> {
    await adminClient.patch(`/admin/applications/${id}/approve`, { notes });
}

export async function rejectApplication(id: string, notes: string): Promise<void> {
    await adminClient.patch(`/admin/applications/${id}/reject`, { notes });
}

export async function addNote(id: string, notes: string): Promise<void> {
    await adminClient.post(`/admin/applications/${id}/notes`, { notes });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<PaginatedResponse<AdminUser>> {
    const res = await adminClient.get<ApiResponse<{
        users: AdminUser[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
    }>>('/admin/users');

    const raw = res.data.data;
    return {
        data: raw.users,
        total: raw.total,
        page: raw.page,
        per_page: raw.per_page,
        total_pages: raw.total_pages,
    };
}

export async function createUser(payload: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    role: AdminUser['role'];
}): Promise<AdminUser> {
    const res = await adminClient.post<ApiResponse<AdminUser>>('/admin/users', {
        username: payload.username,
        full_name: payload.full_name,
        email: payload.email,
        password: payload.password,
        role_id: ROLE_ID_MAP[payload.role],
    });
    return res.data.data;
}

export async function deactivateUser(id: string): Promise<void> {
    await adminClient.patch(`/admin/users/${id}/deactivate`);
}

export async function reactivateUser(id: string): Promise<void> {
    await adminClient.patch(`/admin/users/${id}/reactivate`);
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function listAuditLogs(params?: {
    page?: number;
    per_page?: number;
    action?: string;
    actor_id?: string;
}): Promise<PaginatedResponse<AuditLog>> {
    const res = await adminClient.get<ApiResponse<{
        logs: AuditLog[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
    }>>('/admin/audit-logs', { params });

    const raw = res.data.data;
    return {
        data: raw.logs,
        total: raw.total,
        page: raw.page,
        per_page: raw.per_page,
        total_pages: raw.total_pages,
    };
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function listConfig(): Promise<SystemConfig[]> {
    const res = await adminClient.get<ApiResponse<{ configs: SystemConfig[] }>>('/admin/config');
    return res.data.data.configs;
}

export async function updateConfig(key: string, value: string): Promise<void> {
    await adminClient.patch(`/admin/config/${key}`, { value });
}

export async function getApplicationTimeline(id: string): Promise<ReviewAction[]> {
    const res = await adminClient.get<ApiResponse<{ timeline: ReviewAction[] }>>(
        `/admin/applications/${id}/timeline`
    );
    return res.data.data.timeline;
}