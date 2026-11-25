# Fotonic — Portal Web Seleksi & Review Hasil Edit Foto Klien

Portal web interaktif resmi **Fotonic Photo & Video Project** yang dibangun dengan **Next.js 14 (App Router)**, **TypeScript**, dan **React 18**, terintegrasi langsung dengan **Google Drive API v3** dan **Google Sheets API v4** serta dirancang untuk deployment di **Vercel**.

Aplikasi ini menyediakan dua portal utama dalam satu proyek:
1. **Portal Seleksi Foto (`/`)** — Klien memilih foto terbaik hasil pemotretan sesuai kuota, menambahkan catatan khusus per foto, menyimpan draf sementara, hingga mengunci pilihan final ke Google Sheets & WhatsApp.
2. **Portal Review Hasil Editan (`/edited`)** — Klien meninjau hasil foto yang telah diedit (dari subfolder `Edited`), melihat pratinjau **resolusi maksimal asli** tanpa lag, memberikan komentar revisi per foto, dan mengonfirmasi hasil editan ke tab `Edited` di Google Sheets.

---

## Daftar Isi
1. [Arsitektur & Alur Kerja Sistem](#arsitektur--alur-kerja-sistem)
2. [Fitur Utama](#fitur-utama)
3. [Struktur Direktori Proyek](#struktur-direktori-proyek)
4. [Detail Komponen UI](#detail-komponen-ui)
5. [Detail Endpoint API & Pustaka Backend](#detail-endpoint-api--pustaka-backend)
6. [Keamanan Akses Folder Google Drive](#keamanan-akses-folder-google-drive)
7. [Aturan Struktur & Penamaan Folder Google Drive](#aturan-struktur--penamaan-folder-google-drive)
8. [Skema Pencatatan Google Sheets](#skema-pencatatan-google-sheets)
9. [Konfigurasi Environment & Pengembangan Lokal](#konfigurasi-environment--pengembangan-lokal)
10. [Panduan Deployment ke Vercel](#panduan-deployment-ke-vercel)
11. [Alur Git & Branch Default (`newversion`)](#alur-git--branch-default-newversion)
12. [Panduan Format URL Klien](#panduan-format-url-klien)

---

## Arsitektur & Alur Kerja Sistem

Seluruh komunikasi dengan **Google Drive API v3** dan **Google Sheets API v4** berjalan sepenuhnya di sisi server melalui **Next.js Route Handlers** menggunakan kredensial **Google Service Account (JWT)** sehingga kunci privat tidak pernah terekspos ke browser klien.

```mermaid
flowchart TD
    A[Admin Fotonic Unggah Foto ke Subfolder Klien di Direktori Resmi Drive] --> B{Jenis Link Klien}
    B -->|Seleksi Awal| C["/ ?folder_id=..."]
    B -->|Review Editan| D["/edited?folder_id=..."]
    C --> E[Validasi Folder di Dalam Direktori Resmi Fotonic]
    D --> E
    E -->|Di Luar Direktori Resmi| X[HTTP 403 Akses Ditolak]
    E -->|Valid| F[Fetch Paralel: /api/photos + /api/session + /api/banner]
    F --> G{Cek Status Sesi}
    G -->|Folder Expired| H[Expired Lock Screen]
    G -->|Aktif| I[Galeri Smart Masonry + Fullview Lightbox]
    I --> J{Aksi Klien}
    J -->|Simpan Sementara| K["POST /api/submit (isDraft=true) -> Status DRAF"]
    J -->|Tinjau & Konfirmasi| L[Halaman Preview & Catatan Editor]
    L --> M["POST /api/submit (isDraft=false) -> Status TERKUNCI"]
    M --> N[Popup Sukses + Rekap Otomatis WhatsApp Admin]
```

---

## Fitur Utama

1. **Identitas Visual Dark Luxury & Champagne Gold**
   - Tema gelap obsidian (`#09090b`, `#16161a`) dengan aksen emas (`#d6a85a`, `#f0cf8e`), *Loading Screen* animasi shutter Fotonic, dan *OpenGraph preview* otomatis (logo putih berlatar hitam + judul dinamis nama klien saat link dibagikan ke WhatsApp).
2. **Galeri Smart Masonry & Optimasi Anti-Lag Mobile (60fps)**
   - Algoritma *Smart Height-Balancing* mempertahankan rasio asli foto (2 kolom mobile, 3 kolom tablet, 4 kolom desktop) tanpa *crop*.
   - Isolasi re-render dengan `React.memo`, pencarian pilihan $O(1)$ menggunakan `Set`, `contain: layout style paint`, serta *direct DOM transform* pada zoom/pan di lightbox.
3. **Portal Review Hasil Editan (`/edited`) dengan Progressive Max-Resolution**
   - Membaca khusus subfolder `Edited` di dalam folder klien.
   - Menggunakan pipeline gambar 3-tahap tanpa lag:
     - Grid awal (`=w600`) agar scroll mobile tetap 60fps.
     - Upgrade otomatis ke 2K HD (`=s1600`) via `IntersectionObserver` + `img.decode()` saat kartu berhenti di layar.
     - Pratinjau penuh (`PhotoModal`) otomatis ditingkatkan di *background thread* ke **Resolusi Maksimal Asli (`&max=1` / `=s0`)** dengan zoom hingga 5x.
4. **Navigasi Subfolder & Slide View Desktop**
   - Jika folder klien memiliki subfolder kategori, muncul navigasi subfolder sticky di sisi kiri (desktop) atau tombol menu di sebelah progress bar (mobile) lengkap dengan *ScrollSpy*.
   - Pada desktop tersedia panel *Slide View* di kanan galeri (bisa di-*hide/unhide*) untuk memantau foto terpilih atau daftar komentar.
5. **Simpan Sementara (`DRAF`), Kunci Pilihan (`TERKUNCI`), & Sesi `Expired`**
   - Progres klien tersimpan ke Google Sheets dan otomatis dipulihkan saat link dibuka kembali.
   - Jika folder klien hanya menyisakan subfolder bernama `Expired` tanpa foto aktif di root, portal otomatis menampilkan halaman kunci *Expired*.
6. **Dukungan Tombol Back Fisik HP (`popstate`)**
   - Menekan tombol kembali di HP menutup modal catatan, fullview, atau kembali dari halaman tinjau ke galeri tanpa keluar dari web.

---

## Struktur Direktori Proyek

```text
Web-Seleksi-Seleksi-Foto-Client/
├── app/                              # Next.js 14 App Router
│   ├── api/                          # Server-Side Route Handlers
│   │   ├── banner/route.ts           # Streaming & caching foto Hero Banner (=w1080)
│   │   ├── photos/route.ts           # Daftar foto, subfolder, status expired, & metadata klien
│   │   ├── session/route.ts          # Pemulihan sesi DRAF / TERKUNCI dari Google Sheets
│   │   ├── submit/route.ts           # Validasi & penyimpanan data ke Sheet1 / tab Edited
│   │   └── thumbnail/route.ts        # Proxy multi-resolusi (=w600, &full=1 -> =s1600, &max=1 -> =s0)
│   ├── edited/
│   │   └── page.tsx                  # Server Component halaman /edited + dynamic metadata
│   ├── global.css                    # Design tokens Dark & Gold, layout Masonry, animasi
│   ├── layout.tsx                    # Root HTML layout, metadata SEO/OG, font Montserrat & Material Symbols
│   └── page.tsx                      # Server Component halaman / + dynamic metadata
├── components/
│   ├── gallery/                      # Komponen inti galeri & halaman tinjau
│   │   ├── EditedClientPage.tsx      # Orkestrasi penuh portal review hasil editan (/edited)
│   │   ├── GalleryClient.tsx         # Orkestrasi penuh portal seleksi foto (/)
│   │   ├── MasonryGallery.tsx        # Grid Masonry penyeimbang tinggi kolom
│   │   ├── PhotoCard.tsx             # Kartu foto seleksi (memoized)
│   │   ├── PreviewView.tsx           # Halaman tinjau foto terpilih & catatan editor
│   │   └── ProgressBar.tsx           # Sticky progress bar kuota & menu subfolder mobile
│   ├── layout/                       # Komponen tata letak & status halaman
│   │   ├── ExpiredLockScreen.tsx     # Layar kunci saat sesi foto berstatus Expired
│   │   ├── Footer.tsx                # Footer brand Fotonic (kontak WA & IG)
│   │   ├── HeroBanner.tsx            # Banner klien (auto-focal wajah mobile & header desktop)
│   │   └── LoadingScreen.tsx         # Layar loading awal dengan animasi shutter
│   ├── modals/                       # Dialog & lightbox interaktif
│   │   ├── DraftSavedModal.tsx       # Modal notifikasi simpan sementara & lanjutkan draf
│   │   ├── LockedSessionModal.tsx    # Modal informasi sesi terkunci + opsi buka kunci
│   │   ├── PhotoModal.tsx            # Lightbox fullview 60fps + progressive max-res
│   │   ├── PhotoNoteModal.tsx        # Modal input catatan/komentar khusus per foto
│   │   ├── SuccessModal.tsx          # Popup sukses akhir + tombol konfirmasi WhatsApp
│   │   └── WelcomeModal.tsx          # Modal sapaan awal & ketentuan seleksi
│   └── ui/
│       └── Icons.tsx                 # Kumpulan komponen ikon SVG inline Fotonic
├── lib/
│   ├── google/
│   │   ├── auth.ts                   # Autentikasi JWT Google Service Account
│   │   ├── drive.ts                  # Validasi direktori resmi, query paralel Drive, & cache
│   │   └── sheets.ts                 # Baca/tulis rekapan seleksi (Sheet1) & review editan (Edited)
│   ├── notesHelper.ts                # Formatter & parser catatan per foto + catatan umum
│   └── scrollLock.ts                 # Pengunci scroll body berbasis reference-counting
├── public/
│   ├── favicon.ico                   # Favicon aplikasi
│   ├── og-logo.png                   # Gambar preview OpenGraph (600x600 hitam + logo putih)
│   └── images/
│       ├── aperture-white.png        # Ikon shutter untuk animasi loading & modal
│       └── whitelogo1.png            # Logo utama putih Fotonic
├── scripts/
│   ├── show-network.js               # Pembersih cache .next usang & penampil IP LAN
│   └── test-connection.mjs           # Skrip diagnostik koneksi Google Drive & Sheets
├── docs/                             # Dokumentasi desain & catatan pengembangan internal
├── .env.example                      # Template variabel environment (aman tanpa kunci asli)
├── next.config.mjs                   # Konfigurasi Next.js
├── package.json                      # Dependensi & skrip NPM
├── run.bat                           # Launcher interaktif Windows untuk Next.js
├── tsconfig.json                     # Konfigurasi TypeScript
└── update_repo.bat                   # Utilitas sinkronisasi Git (default branch: newversion)
```

---

## Detail Komponen UI

| Grup | Komponen | Tanggung Jawab Utama |
|---|---|---|
| **Gallery** | `GalleryClient.tsx` | State utama portal seleksi (`/`), navigasi section, slide view desktop, draf, kunci pilihan, & `popstate`. |
| **Gallery** | `EditedClientPage.tsx` | State utama portal review editan (`/edited`), *progressive card upgrade*, komentar per foto, & konfirmasi. |
| **Gallery** | `MasonryGallery.tsx` | Membagi foto ke 2/3/4 kolom secara proporsional berdasarkan aspek rasio foto. |
| **Gallery** | `PhotoCard.tsx` | Kartu foto seleksi dengan garis tepi emas saat terpilih, tombol centang, dan tombol fullview. |
| **Gallery** | `PreviewView.tsx` | Halaman tinjau pilihan akhir, tombol catatan per foto, catatan umum editor, dan tombol konfirmasi. |
| **Gallery** | `ProgressBar.tsx` | Bar progres sticky kuota foto + tombol menu kategori subfolder di mode mobile. |
| **Modals** | `PhotoModal.tsx` | Lightbox layar penuh dengan *pinch-to-zoom*, *double-tap zoom*, swipe, catatan, dan *progressive max-res*. |
| **Modals** | `PhotoNoteModal.tsx` | Modal tulis/edit/hapus catatan khusus untuk satu foto tertentu. |
| **Modals** | `WelcomeModal.tsx` | Sapaan klien baru, tanggal sesi, dan ketentuan batas kuota foto. |
| **Modals** | `DraftSavedModal.tsx` | Notifikasi saat draf disimpan sementara atau dipulihkan dari kunjungan sebelumnya. |
| **Modals** | `LockedSessionModal.tsx` | Menampilkan ringkasan sesi terkunci beserta opsi lihat atau buka kunci untuk edit kembali. |
| **Modals** | `SuccessModal.tsx` | Popup rekap bernomor setelah submit, salin ke clipboard, dan tombol langsung ke WhatsApp Admin. |
| **Layout** | `HeroBanner.tsx` | Foto sampul mobile dengan deteksi fokus wajah (*FaceDetector* / *YCbCr*) & header bersih desktop. |
| **Layout** | `LoadingScreen.tsx` | Animasi shutter berputar saat data dimuat, otomatis melepas *scroll lock* saat selesai. |
| **Layout** | `ExpiredLockScreen.tsx` | Tampilan pemberitahuan bahwa masa akses folder klien telah berakhir. |
| **Layout** | `Footer.tsx` | Informasi brand Fotonic Project, lokasi, serta pintasan WhatsApp & Instagram. |
| **UI** | `Icons.tsx` | Komponen SVG vektor inline ringan tanpa permintaan HTTP tambahan. |

---

## Detail Endpoint API & Pustaka Backend

| Endpoint | Metode | Parameter / Body | Fungsi Utama |
|---|---|---|---|
| `/api/photos` | `GET` | `folder_id`, `mode=edited` (opsional) | Memvalidasi direktori resmi (`403` jika di luar), mengambil metadata klien, foto, subfolder, & status `isExpired`. |
| `/api/session` | `GET` | `folder_id`, `mode=edited` (opsional) | Membaca riwayat sesi terakhir (`DRAF` / `TERKUNCI`) dari `Sheet1` atau tab `Edited`. |
| `/api/submit` | `POST` | `folderId`, `clientName`, `selectedFileIds`, `notes`, `photoNotes`, `isDraft`, `mode` | Memvalidasi folder & file terhadap Drive, lalu menyimpan baris baru ke `Sheet1` atau tab `Edited`. |
| `/api/thumbnail` | `GET` | `id`, `full=1` (opsional), `max=1` (opsional) | Streaming gambar tervalidasi dalam 3 tingkat resolusi (`=w600`, `=s1600`, `=s0`) dengan cache memori & browser. |
| `/api/banner` | `GET` | `folder_id` | Mengambil foto sampul dari subfolder `Cover` (fallback ke foto pertama) ukuran optimal (`=w1080`). |

---

## Keamanan Akses Folder Google Drive

Aplikasi menerapkan pembatasan ketat di [lib/google/drive.ts](lib/google/drive.ts) agar **hanya folder dan file yang berada di dalam direktori induk resmi Fotonic** (`ALLOWED_ROOT_FOLDER_ID = 1f6pznHVQyktvflAPYQO5W-4CTCwqZykL`) yang dapat diakses:
- Seluruh endpoint API (`/api/photos`, `/api/session`, `/api/submit`, `/api/banner`, `/api/thumbnail`) menelusuri rantai `parents` item di Google Drive hingga memverifikasi bahwa item tersebut berada di dalam direktori resmi dan tidak berstatus `trashed`.
- Folder induknya sendiri juga ditolak jika dimasukkan langsung sebagai `folder_id` agar daftar seluruh klien lain tidak terekspos.
- Permintaan di luar direktori resmi otomatis mengembalikan **HTTP 403**.

---

## Aturan Struktur & Penamaan Folder Google Drive

### 1. Format Nama Folder Utama Klien
```text
[Nama Klien], [Tanggal Foto], [Kuota Pemilihan Foto]
```
Contoh yang didukung:
- `Arya Pratama, 31 Oktober 2026, 15 Foto`
- `Budi & Siti - 28/10/2026 - 20`
- `Cindy Laura | 15 November 2026 | 10 Foto`

### 2. Subfolder Khusus yang Dikenali Otomatis
- **`Cover`**: Disembunyikan dari galeri seleksi dan dipakai khusus sebagai gambar *Hero Banner* di tampilan mobile.
- **`Edited`**: Disembunyikan dari galeri seleksi utama (`/`) dan hanya ditampilkan di portal review hasil editan (`/edited`).
- **`Expired`**: Jika di root folder klien tidak ada foto aktif dan terdapat subfolder `Expired`, sesi otomatis terkunci ke layar *Expired*.
- **Subfolder Lainnya**: Otomatis ditampilkan sebagai kategori/*section* terpisah di galeri lengkap dengan menu navigasi.

---

## Skema Pencatatan Google Sheets

### 1. Tab `Sheet1` (Seleksi Foto Awal — `/`)
| Kolom | Nama Field | Keterangan |
|---|---|---|
| **A** | Waktu | Timestamp penyimpanan (`YYYY-MM-DD HH:mm:ss`) |
| **B** | Nama Klien | Nama klien hasil parsing folder atau parameter URL |
| **C** | Tanggal Sesi | Tanggal pemotretan klien |
| **D** | Status | `DRAF` (Simpan Sementara) atau `TERKUNCI` (Kirim Final) |
| **E** | Kuota / Jumlah | Jumlah foto terpilih vs kuota |
| **F** | Daftar File | Daftar nama file terpilih terurut abjad |
| **G** | Catatan | Gabungan catatan khusus per foto & catatan umum editor |
| **H** | Folder ID | ID Folder Google Drive klien |

### 2. Tab `Edited` (Review Hasil Editan — `/edited`)
Tab `Edited` dibuat otomatis jika belum ada, menyimpan kolom **A–H**: `Waktu`, `Nama Klien`, `Tanggal Sesi`, `Status` (`DRAF` / `TERKUNCI`), `Jumlah Foto Editan`, `Komentar Per Foto`, `Catatan Umum`, dan `Folder ID`.

---

## Konfigurasi Environment & Pengembangan Lokal

1. Pastikan **Node.js 18+** sudah terpasang.
2. Salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Isi variabel berikut di `.env.local`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=nama-service-account@project-id.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SPREADSHEET_ID=id_google_spreadsheet_anda
   TEST_DRIVE_FOLDER_ID=id_folder_klien_di_dalam_direktori_resmi
   NEXT_PUBLIC_SITE_URL=https://domain-vercel-anda.vercel.app
   ```
4. Pastikan direktori induk Google Drive Fotonic dibagikan (*Share*) ke email Service Account sebagai **Viewer**, dan Google Spreadsheet dibagikan sebagai **Editor**.
5. Jalankan aplikasi secara lokal:
   ```bash
   npm install
   npm run dev
   ```
   Atau klik dua kali **`run.bat`** pada Windows.

---

## Panduan Deployment ke Vercel

Aplikasi ini dirancang dan dioptimalkan khusus untuk **Vercel** (Next.js Serverless Runtime), **bukan Streamlit**.

### Langkah-langkah Deployment:
1. **Import Repositori di Vercel**:
   - Masuk ke [Vercel Dashboard](https://vercel.com/dashboard) → klik **Add New…** → **Project**.
   - Pilih repositori GitHub **`FotonicProject-seleksi-foto`**.
2. **Konfigurasi Framework & Build**:
   - **Framework Preset**: `Next.js` (terdeteksi otomatis).
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`
3. **Atur Production Branch ke `newversion`**:
   - Buka **Settings → Git → Production Branch**.
   - Ubah menjadi **`newversion`** lalu simpan. Setiap push ke branch `newversion` akan otomatis memicu deployment produksi di Vercel.
4. **Tambahkan Environment Variables**:
   - Buka **Settings → Environment Variables** dan tambahkan:
     | Name | Value | Environment |
     |---|---|---|
     | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email Service Account GCP Anda | Production, Preview, Development |
     | `GOOGLE_PRIVATE_KEY` | Kunci privat lengkap (pertahankan `\n` di antara baris atau tempel langsung isi key) | Production, Preview, Development |
     | `GOOGLE_SPREADSHEET_ID` | ID Google Spreadsheet rekapan | Production, Preview, Development |
     | `NEXT_PUBLIC_SITE_URL` | URL domain produksi Vercel Anda (misal `https://fotonic-project-seleksi-foto-client.vercel.app`) | Production |
5. **Deploy & Verifikasi**:
   - Klik **Deploy** (atau **Redeploy** setelah menambah Environment Variables).
   - Uji akses halaman utama (`/?folder_id=<ID_FOLDER_KLIEN>`) dan halaman hasil editan (`/edited?folder_id=<ID_FOLDER_KLIEN>`).

> **Tips Penting `GOOGLE_PRIVATE_KEY` di Vercel**:
> Kode `lib/google/auth.ts` sudah otomatis mengonversi `\n` literal menjadi baris baru (`rawKey.replace(/\\n/g, "\n")`). Pastikan tanda kutip ganda berlebih tidak tercopy ganda dan header `-----BEGIN PRIVATE KEY-----` hingga `-----END PRIVATE KEY-----` utuh.

---

## Alur Git & Branch Default (`newversion`)

Branch default untuk push dan deployment produksi adalah **`newversion`**.

- **Menggunakan `update_repo.bat` (Windows)**:
  - Klik dua kali `update_repo.bat` → pilih menu **`[1]`** untuk otomatis `git add -A`, commit, dan push ke **`origin/newversion`**.
- **Menggunakan Terminal Manual**:
  ```bash
  git checkout newversion
  git add -A
  git commit -m "pesan perubahan"
  git push origin newversion
  ```

---

## Panduan Format URL Klien

1. **Portal Seleksi Foto Utama**:
   ```text
   https://domain-vercel-anda.vercel.app/?folder_id=ID_FOLDER_KLIEN
   ```
2. **Portal Review Hasil Editan**:
   ```text
   https://domain-vercel-anda.vercel.app/edited?folder_id=ID_FOLDER_KLIEN
   ```
3. **Parameter Kustom Opsional**:
   ```text
   https://domain-vercel-anda.vercel.app/?folder_id=ID_FOLDER_KLIEN&klien=Nama+Klien&date=31+Oktober+2026&max=15
   ```

---

## Lisensi & Hak Cipta
© **Fotonic Photo & Video Project** — Bandar Lampung & Sekitarnya.  
*"Capture your moment and tell your story"*
