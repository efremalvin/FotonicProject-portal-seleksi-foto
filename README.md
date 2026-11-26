# Fotonic — Portal Web Seleksi & Review Foto Klien

Portal web resmi **Fotonic Photo & Video Project** untuk memudahkan klien memilih foto terbaik hasil pemotretan dan meninjau hasil editan secara *online* dari HP maupun desktop. Aplikasi ini terintegrasi langsung dengan **Google Drive** dan **Google Sheets**, serta di-deploy menggunakan **Vercel** (Next.js App Router).

---

## Gambaran Umum Aplikasi

Website ini memiliki dua portal utama dalam satu proyek:

1. **Portal Seleksi Foto (`/`)**
   - Klien membuka tautan unik folder Google Drive mereka (`/?folder_id=...`).
   - Klien dapat melihat seluruh foto dalam tata letak *Smart Masonry* (tanpa *crop*), memfilter kategori subfolder, melihat pratinjau layar penuh (*zoom & pan*), serta menandai foto pilihan sesuai kuota.
   - Klien dapat menambahkan catatan khusus per foto, **Simpan Sementara (`DRAF`)**, lalu melakukan **Konfirmasi & Kirim (`TERKUNCI`)** yang otomatis tercatat ke Google Sheets (`Sheet1`) dan siap dikirim ke WhatsApp Admin Fotonic.

2. **Portal Review Hasil Editan (`/edited`)**
   - Menampilkan foto-foto dari subfolder `Edited` di dalam folder Google Drive klien (`/edited?folder_id=...`).
   - Dilengkapi pratinjau **resolusi maksimal asli** secara bertahap tanpa lag.
   - Jika di dalam folder `Edited` terdapat subfolder `Before` dan `After`, mode layar penuh otomatis menampilkan **slider perbandingan `Before (RAW)` vs `After (Edited)`**.
   - Klien dapat memberikan komentar revisi per foto maupun catatan umum yang tercatat ke tab `Edited` di Google Sheets.

3. **Keamanan & Manajemen Akses (`Expired`)**
   - **Pembatasan Direktori Resmi**: Hanya folder/file Google Drive yang berada di dalam direktori induk resmi Fotonic yang diizinkan diakses.
   - **Sistem Kedaluwarsa Terpisah**: Status aktif/kedaluwarsa untuk menu **Seleksi** (`/`) dan **Edited** (`/edited`) dikelola melalui tab **`Expired`** di Google Spreadsheet (berdasarkan `Status Expired` maupun `Tanggal Expired`), atau subfolder `Expired` di Drive. Jika masa akses berakhir, klien melihat layar informasi kedaluwarsa lengkap dengan tombol hubungi admin via WhatsApp.

---

## Teknologi & Struktur Singkat

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Integrasi Backend**: Google Drive API v3 & Google Sheets API v4 (melalui Google Service Account di Server-Side Route Handlers)
- **Hosting / Deployment**: Vercel

```text
app/
├── page.tsx                 # Halaman utama Portal Seleksi Foto (/)
├── edited/page.tsx          # Halaman Portal Review Hasil Editan (/edited)
└── api/                     # Backend endpoints (photos, session, submit, thumbnail, banner)
components/
├── gallery/                 # Komponen galeri, progress bar, dan halaman tinjau
├── modals/                  # Lightbox fullview (Before/After slider), modal catatan, & konfirmasi
├── layout/                  # Hero banner, loading screen, expired lock screen, & footer
└── ui/                      # Ikon SVG inline
lib/
└── google/                  # Autentikasi Service Account, query Drive, & manajemen Google Sheets
```

---

## Panduan Singkat Deployment (Vercel)

1. Hubungkan repositori GitHub ini ke **Vercel**.
2. Gunakan preset **Next.js** (`npm run build`).
3. Atur **Environment Variables** di Vercel Dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SPREADSHEET_ID`
   - `NEXT_PUBLIC_SITE_URL` *(opsional, URL domain produksi)*
4. Pastikan folder induk Google Drive dibagikan (*Viewer*) dan Google Spreadsheet dibagikan (*Editor*) ke email Service Account.

---

## Alur Branch Git

- Branch **`main`**: Versi rilis produksi saat ini.
- Branch **`newversion`**: Branch default untuk pengembangan dan *push* pembaruan kode berikutnya (juga menjadi target default pada `update_repo.bat`).

---

© **Fotonic Photo & Video Project** — *"Capture your moment and tell your story"*
