# Dokumen Serah Terima Sistem
## `ptdpn-eform-admin` — Admin Dashboard Frontend

**PT BPR Daya Perdana Nusantara**
**Divisi IT — Sistem eForm Onboarding Digital**

---

| | |
|---|---|
| **Tanggal Serah Terima** | 27 Agustus 2026 |
| **Diserahkan oleh** | Tim Pengembang |
| **Diterima oleh** | Abdi — IT Section Head |
| **Repository** | https://github.com/cappyHoding/ptdpn-eform-admin |
| **Branch Utama** | `master` |

---

## 1. Ringkasan Sistem

`ptdpn-eform-admin` adalah dashboard internal untuk staff BPR Perdana dalam mengelola dan memproses aplikasi eForm Onboarding yang masuk dari nasabah. Sistem ini diakses oleh tiga role: **Admin**, **Supervisor (Checker)**, dan **Operator (Maker)**.

> **Keamanan:** Aplikasi ini wajib dihosting di server/URL terpisah dari aplikasi customer dan diproteksi dengan IP whitelisting, hanya dapat diakses dari jaringan internal BPR Perdana.

---

## 2. Stack Teknologi

| Komponen | Teknologi | Versi |
|---|---|---|
| Framework | React | 19.x |
| Bahasa | TypeScript | 5.9.x |
| Build Tool | Vite | 8.x |
| UI Components | shadcn/ui (Radix UI) | - |
| Styling | Tailwind CSS v4 | - |
| State Server | TanStack Query | v5 |
| HTTP Client | Axios | 1.x |
| Routing | React Router DOM | v6 |
| Form Handling | React Hook Form + Zod | - |
| Notifikasi | Sonner (toast) | - |
| Containerisasi | Docker | - |

---

## 3. Struktur Direktori

```
ptdpn-eform-admin/
├── src/
│   ├── App.tsx                       # Root app + routing dengan auth guard
│   ├── main.tsx                      # Entry point
│   ├── pages/                        # Halaman admin
│   │   ├── LoginPage.tsx             # Halaman login internal
│   │   ├── DashboardPage.tsx         # Dashboard statistik
│   │   ├── ApplicationListPage.tsx   # List semua aplikasi masuk
│   │   ├── ApplicationDetailPage.tsx # Detail aplikasi + KYC + kontrak
│   │   ├── UsersPage.tsx             # Manajemen user internal (admin only)
│   │   ├── AuditLogsPage.tsx         # Log audit (admin, supervisor)
│   │   ├── ConfigPage.tsx            # Konfigurasi sistem (admin only)
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── ProtectedRoute.tsx        # Auth guard + role guard
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx           # Auth state global (JWT token)
│   ├── lib/
│   │   └── api/
│   │       └── adminApi.ts           # Semua fungsi API call admin
│   ├── hooks/                        # Custom React hooks
│   └── assets/                       # Gambar, ikon
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── Dockerfile
├── .env.example
└── package.json
```

---

## 4. Halaman & Fitur yang Telah Diimplementasikan

### 4.1 Login (`/login`)

- Form login dengan email + password
- Autentikasi via JWT (backend mengeluarkan access + refresh token)
- Token disimpan di memory (AuthContext), refresh token di httpOnly cookie
- Auto-redirect ke `/dashboard` setelah login sukses

### 4.2 Dashboard (`/dashboard`)

- Statistik ringkasan: total aplikasi, pending review, disetujui hari ini, dll
- Data real-time dari backend (`GET /api/v1/admin/dashboard/stats`)

### 4.3 List Aplikasi (`/applications`)

- Tabel semua aplikasi masuk dengan filter dan pencarian
- Filter berdasarkan: status, jenis produk, tanggal
- Pagination
- Klik baris → ke halaman detail

### 4.4 Detail Aplikasi (`/applications/:id`)

Halaman terlengkap di dashboard, mencakup:

| Section | Keterangan |
|---|---|
| Info Umum | Status, jenis produk, tanggal masuk, nama nasabah |
| Data Pribadi | Hasil OCR KTP + data yang diisi nasabah |
| Foto KTP & Selfie | Preview gambar via API authenticated |
| Hasil eKYC | Status fraud check, liveness score dari VIDA |
| Data Produk | Info rekening / agunan sesuai produk |
| Kontrak | Status e-Sign, link kontrak PDF |
| Timeline | Riwayat perubahan status aplikasi |
| Catatan | Catatan operator/supervisor |
| Aksi | Tombol aksi sesuai role dan status |

**Aksi yang Tersedia:**

| Aksi | Role | Kondisi |
|---|---|---|
| Buka (mulai review) | operator, admin | Status: SUBMITTED |
| Rekomendasikan | operator, admin | Status: UNDER_REVIEW |
| Setujui | supervisor, admin | Status: RECOMMENDED |
| Tolak | supervisor, admin | Status: UNDER_REVIEW / RECOMMENDED |
| Tambah Catatan | operator, admin | Kapan saja |

### 4.5 Manajemen User (`/users`) — Admin Only

- List semua user internal
- Buat user baru (nama, email, password, role)
- Edit data user
- Nonaktifkan / aktifkan kembali user

**Role yang tersedia:** `admin`, `supervisor`, `operator`

### 4.6 Audit Logs (`/audit-logs`) — Admin, Supervisor

- Log semua aksi yang dilakukan admin/supervisor/operator
- Filter berdasarkan: user, tipe aksi, tanggal
- Untuk keperluan compliance dan investigasi

### 4.7 Konfigurasi Sistem (`/config`) — Admin Only

- Pengaturan dinamis sistem yang dapat diubah tanpa restart server
- Contoh: session TTL nasabah, batas upload file, dll
- Perubahan langsung efektif via `PATCH /api/v1/admin/config/:key`

---

## 5. Sistem Autentikasi & Otorisasi

### Alur Login

```
1. User input email + password di /login
2. POST /api/v1/admin/auth/login → { access_token, refresh_token }
3. Access token disimpan di AuthContext (memory)
4. Semua request API berikutnya menggunakan header: Authorization: Bearer <token>
5. Token expired → auto-refresh via POST /api/v1/admin/auth/refresh
6. Refresh gagal → redirect ke /login
```

### Role & Akses

| Role | Akses |
|---|---|
| `admin` | Semua fitur termasuk manajemen user dan konfigurasi |
| `supervisor` | Aplikasi, audit logs, approve/reject |
| `operator` | Aplikasi, open/recommend, tambah catatan |

### Protected Routes

Semua route dilindungi oleh `<ProtectedRoute>`. Route tertentu tambahan dilindungi `<ProtectedRoute allowedRoles={['admin']}>`.

---

## 6. Konfigurasi Environment

```bash
cp .env.example .env
```

| Variabel | Keterangan |
|---|---|
| `VITE_API_BASE_URL` | URL backend API (ptdpn-eform-service) |

---

## 7. Cara Menjalankan

### Development

```bash
npm install
npm run dev
# Berjalan di http://localhost:5173 (atau port lain)
```

### Production Build

```bash
npm run build
# Output di folder dist/
```

### Docker

```bash
docker build -t ptdpn-eform-admin .
docker run -p 80:80 ptdpn-eform-admin
```

---

## 8. Routing

| Path | Halaman | Role |
|---|---|---|
| `/login` | LoginPage | Public |
| `/dashboard` | DashboardPage | Semua |
| `/applications` | ApplicationListPage | Semua |
| `/applications/:id` | ApplicationDetailPage | Semua |
| `/audit-logs` | AuditLogsPage | admin, supervisor |
| `/users` | UsersPage | admin |
| `/config` | ConfigPage | admin |

---

## 9. Pola Kode yang Harus Diikuti

### Semua API call di `src/lib/api/adminApi.ts`

```typescript
// BENAR
export async function approveApplication(id: string, note?: string): Promise<void> {
  await adminClient.patch(`/admin/applications/${id}/approve`, { note });
}

// SALAH: API call langsung di component
const res = await axios.patch(`/admin/applications/${id}/approve`);
```

### Status Badge Konsisten

```typescript
const STATUS_LABEL: Record<AppStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  UNDER_REVIEW: 'Dalam Review',
  RECOMMENDED: 'Direkomendasikan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  FRAUD_REJECTED: 'Gagal Verifikasi KYC',
  CONTRACT_SENT: 'Kontrak Dikirim',
  COMPLETED: 'Selesai',
};
```

---

## 10. Keamanan

| Aspek | Implementasi |
|---|---|
| Auth | JWT Bearer token di setiap request |
| Role Guard | ProtectedRoute dengan `allowedRoles` |
| Network | Wajib IP whitelist — hanya dari jaringan internal |
| Hosting | URL terpisah dari aplikasi customer |
| Tidak ada secret | Semua validasi di backend |
| Foto KTP/Selfie | Diakses via API authenticated, bukan URL publik |

> **PENTING:** Jangan pernah expose URL admin ini ke publik. Selalu gunakan IP whitelist di level nginx/firewall.

---

## 11. Item Pending / Perlu Perhatian

| Item | Status | Keterangan |
|---|---|---|
| Domain & IP Whitelist Production | TODO | Perlu konfigurasi nginx + firewall |
| `VITE_API_BASE_URL` Production | TODO | Arahkan ke URL backend production |
| Dark Mode | TODO | Infrastruktur sudah ada (next-themes), tinggal styling |
| Export Data (Excel/PDF) | TODO | Fitur export list aplikasi belum ada |
| Notifikasi Real-time | TODO | Perlu WebSocket atau polling untuk notifikasi baru |

---

## 12. Referensi

| | |
|---|---|
| **Repository** | https://github.com/cappyHoding/ptdpn-eform-admin |
| **Backend API** | https://github.com/cappyHoding/ptdpn-eform-service |
| **Customer Frontend** | https://github.com/cappyHoding/bprperdana-eform |

---

*Dokumen ini dibuat pada 27 Agustus 2026 sebagai bagian dari proses serah terima sistem eForm Onboarding Digital PT BPR Daya Perdana Nusantara.*
