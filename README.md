# 📷 Fotonic — Portal Web Seleksi Foto Klien

Portal web interaktif resmi **Fotonic Photo & Video Project** yang dirancang untuk memudahkan klien memilih foto terbaik hasil pemotretan untuk proses *retouching* & *color grading*. Terintegrasi langsung secara *real-time* dengan **Google Drive API v3** dan **Google Sheets API v4**, serta dioptimalkan secara khusus agar tetap ringan dan bebas *lag* (60fps) saat dibuka di perangkat *mobile* berspesifikasi rendah (*low-end devices*).

---

## 📑 Daftar Isi
1. [Ringkasan & Arsitektur Sistem](#-ringkasan--arsitektur-sistem)
2. [Fitur Utama & Spesifikasi Lengkap](#-fitur-utama--spesifikasi-lengkap)
3. [Optimisasi Performa (Anti-Lag Device Lamban)](#-optimisasi-performa-anti-lag-device-lamban)
4. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
5. [Detail Komponen UI & Fungsinya](#-detail-komponen-ui--fungsinya)
6. [Detail Endpoint API & Pustaka Backend](#-detail-endpoint-api--pustaka-backend)
7. [Aturan Struktur & Penamaan Folder Google Drive](#-aturan-struktur--penamaan-folder-google-drive)
8. [Skema Pencatatan Google Sheets (Draf & Terkunci)](#-skema-pencatatan-google-sheets-draf--terkunci)
9. [Instalasi & Konfigurasi Environment](#-instalasi--konfigurasi-environment)
10. [Cara Menjalankan Aplikasi](#-cara-menjalankan-aplikasi)
11. [Panduan Format URL Klien](#-panduan-format-url-klien)

---

## 🔍 Ringkasan & Arsitektur Sistem

Aplikasi ini dibangun menggunakan **Next.js 14 (App Router)** dengan **TypeScript** dan **React 18**. Seluruh kredensial rahasia (*Service Account Google*) disimpan dan dijalankan sepenuhnya di sisi server (*Server-Side Route Handlers*), sehingga folder Google Drive klien tetap aman tanpa perlu mengekspos kunci API ke browser klien.

### Alur Kerja Sistem (End-to-End Flow)
```mermaid
flowchart TD
    A[Admin Fotonic Unggah Foto ke Folder Google Drive] --> B[Bagikan Link Portal Seleksi ke Klien]
    B --> C[Loading Screen Animasi Shutter Fotonic]
    C --> D[Fetch Paralel: /api/photos + /api/session + /api/banner]
    D --> E{Cek Riwayat Sesi di Google Sheets}
    E -->|Belum Ada Sesi| F[Tampilkan Welcome Modal Sapaan Klien]
    E -->|Status: DRAF| G[Tampilkan Modal Lanjutkan Draf & Pulihkan Pilihan]
    E -->|Status: TERKUNCI| H[Tampilkan Modal Sesi Terkunci: Lihat atau Buka Kunci]
    F --> I[Galeri Utama Smart Masonry]
    G --> I
    H --> I
    I --> J{Aksi Klien}
    J -->|Simpan Sementara| K[POST /api/submit isDraft=true -> Status DRAF di Sheets]
    J -->|Lihat Foto Terpilih| L[Halaman Review Pilihan & Catatan Editor]
    L --> M[Konfirmasi & Kirim Pilihan]
    M --> N[POST /api/submit isDraft=false -> Status TERKUNCI di Sheets]
    N --> O[Halaman Sukses + Rekap Otomatis ke WhatsApp Admin]
```

---

## ✨ Fitur Utama & Spesifikasi Lengkap

### 1. Identitas Visual *Dark Luxury & Champagne Gold*
- Menggunakan palet warna gelap obsidian (`#09090b`, `#16161a`) dengan aksen emas mewah (`#d6a85a`, `#f0cf8e`) yang senada dengan portofolio resmi Fotonic.
- Dilengkapi **Loading Screen Animasi Shutter Fotonic** dengan transisi *crossfade* mulus menuju modal pembuka.

### 2. Galeri *Smart Masonry* Tanpa Terpotong (*Strict No-Crop*)
- Mempertahankan rasio asli foto (**Portrait 2:3** maupun **Landscape 3:2**).
- Algoritma *Smart Height-Balancing* secara otomatis menyusun foto ke kolom terpendek (2 kolom di HP, 3 kolom di Tablet, 4 kolom di Desktop) sehingga foto *landscape* dan *portrait* berpadu rapi tanpa celah kosong.
- Ketika foto dipilih, muncul **Stroke Line Emas 3px** tegas di bagian depan bayangan nama file serta efek *tint* emas halus.
- Ketika kuota foto telah terpenuhi (`selected === maxPhotos`), tombol pilih pada foto lain otomatis memudar (*disabled*) dan tombol aksi melayang berubah menjadi hijau elegan dengan transisi halus.

### 3. Deteksi Otomatis Subfolder & Folder `Cover`
- **Tanpa Subfolder**: Jika di dalam folder klien langsung berisi foto-foto, seluruh foto langsung ditampilkan dalam satu galeri utuh tanpa sekat.
- **Dengan Subfolder**: Jika di dalam folder klien terdapat subfolder (misal: *"Sesi Studio"*, *"Sesi Outdoor"*), masing-masing subfolder otomatis dirender menjadi *section* terpisah lengkap dengan judul subfolder dan penghitung jumlah foto.
- **Subfolder `Cover` Khusus Banner**: Subfolder bernama `Cover` (tidak peka huruf besar/kecil) otomatis dikecualikan dari daftar galeri seleksi dan digunakan khusus sebagai sumber gambar *Hero Banner*.

### 4. *Hero Banner* Cerdas dengan Pemindai Titik Fokus Wajah (*YCbCr Skin Scanner*)
- Pada tampilan *mobile*, banner menampilkan foto sampul klien dengan pemindaian krominansi kulit manusia (*YCbCr*) dan *Browser FaceDetector API* untuk memposisikan wajah subjek di area aman (tidak tertutup teks judul maupun terpotong di tepi atas).
- Pada tampilan *desktop*, header tampil bersih, minimalis, dan fokus langsung pada galeri foto.
- Menyertakan badge tanggal sesi foto, kuota maksimal, serta tombol pintasan Instagram resmi **`@fotonicproject`** berikon emas.

### 5. Mode Layar Penuh (*Fullview Lightbox*) Independen
- Menampilkan foto beresolusi tinggi dengan latar belakang hitam pekat (`#000000`).
- Mendukung **Double-Tap / Double-Click Instan** (tanpa perlu tahan/*hold*), **Pinch-to-Zoom** (cubit 2 jari di HP), **Mouse Wheel Zoom**, serta **Drag / Panning** ke segala arah.
- Navigasi antar foto menggunakan *swipe* kiri/kanan atau tombol panah keyboard dengan efek transisi *Drop-to-Black* 200ms.
- Dilengkapi tombol **Catatan Khusus (`📝 Catatan`)** dan tombol **Pilih / Terpilih (`✓ Terpilih`)** langsung di dalam mode layar penuh.

### 6. Catatan Khusus Per Foto & Catatan Umum Editor
- Klien dapat menambahkan instruksi *editing* spesifik pada foto tertentu (misal: *"Bersihkan objek di latar belakang pada DSC_0081.JPG"*), baik dari mode Fullview maupun dari halaman Review.
- Klien juga dapat menambahkan catatan umum keseluruhan sesi di halaman Review sebelum mengirim pilihan.

### 7. Fitur **Simpan Sementara (Draf)** & **Kunci Pilihan**
- **Simpan Sementara (`DRAF`)**: Klien dapat menyimpan progres pemilihan foto kapan saja ke Google Sheets. Saat klien membuka kembali tautan di kemudian hari, sistem otomatis memulihkan foto-foto yang telah dipilih beserta catatannya.
- **Konfirmasi & Kirim (`TERKUNCI`)**: Mengunci pilihan final ke Google Sheets. Jika tautan dibuka kembali setelah dikunci, sistem menampilkan modal **Pilihan Foto Sudah Dikunci** dengan opsi untuk sekadar melihat daftar foto terkunci atau membuka kunci untuk mengedit ulang.

### 8. Dukungan Tombol Kembali Fisik HP (*Mobile Hardware Back Button*)
- Terintegrasi dengan `window.history.pushState` dan `popstate`: menekan tombol *Back* di HP saat membuka Modal Catatan, Mode Fullview, atau Halaman Review akan mengembalikan pengguna ke tampilan sebelumnya secara bertahap tanpa keluar dari website.

---

## ⚡ Optimisasi Performa (Anti-Lag Device Lamban)

Kode ini telah dioptimalkan secara khusus agar berjalan mulus di perangkat Android/iOS spesifikasi rendah:

1. **Isolasi Re-render React (`React.memo` & Pencarian `Set` $O(1)$)**:
   - Kartu foto ([`PhotoCard.tsx`](components/PhotoCard.tsx) & [`PreviewView.tsx`](components/PreviewView.tsx)) dibungkus dengan `React.memo` dan fungsi callback stabil (`useCallback`).
   - Memilih 1 foto dari 500 foto hanya me-render ulang **1 kartu yang diklik**, bukan seluruh 500 kartu.
   - Mengetik catatan di `<textarea>` halaman Review tidak memicu render ulang pada grid foto.
2. **Manajemen Memori GPU & CSS Containment (`contain: layout style paint`)**:
   - Menghindari alokasi ratusan layer tekstur GPU (`translateZ(0)` berlebih) pada item galeri yang dapat menguras habis VRAM HP RAM 2GB–4GB.
   - Menghapus filter shader per-gambar di galeri dan mengunci `aspect-ratio` setiap kartu untuk mencegah *Cumulative Layout Shift (CLS)* saat scroll cepat.
3. **Zoom & Panning 60fps via *Direct DOM Transform***:
   - Pergeseran jari (*touchmove* / *mousemove*) pada [`PhotoModal.tsx`](components/PhotoModal.tsx) memodifikasi `style.transform` (`translate3d`) langsung ke elemen DOM melalui `ref` tanpa memicu siklus render React di setiap piksel gerakan jari.
4. **Query Paralel, Deduplikasi *In-Flight Request*, & Cache Memori Server**:
   - Pembacaan subfolder dan foto utama di Google Drive dijalankan secara paralel (`Promise.all`).
   - Permintaan serentak ke folder atau thumbnail yang sama dideduplikasi di sisi server dan disimpan dalam *in-memory cache* (respon ~1ms untuk akses berikutnya).
   - Thumbnail galeri dikompresi optimal (`=w420`) dan gambar Fullview menggunakan CDN resolusi tinggi (`=s1600`) yang tajam namun hemat memori dekoder gambar di HP.

---

## 📁 Struktur Direktori Proyek

```text
Web-Seleksi-Seleksi-Foto-Client/
├── app/                            # Next.js 14 App Router (Halaman & Backend API)
│   ├── api/                        # Server-Side Route Handlers
│   │   ├── banner/route.ts         # Endpoint streaming & caching foto Hero Banner
│   │   ├── photos/route.ts         # Endpoint daftar foto, subfolder, & metadata klien
│   │   ├── session/route.ts        # Endpoint pengecekan sesi DRAF / TERKUNCI di Sheets
│   │   ├── submit/route.ts         # Endpoint penyimpanan DRAF & penguncian pilihan ke Sheets
│   │   └── thumbnail/route.ts      # Proxy streaming thumbnail (=w420) & fullview (=s1600)
│   ├── global.css                  # Styling utama Dark & Gold, layout Masonry, & animasi
│   ├── layout.tsx                  # Root HTML layout, metadata SEO, & font Montserrat
│   └── page.tsx                    # Orkestrasi state utama, navigasi Back HP, & alur halaman
├── components/                     # Komponen Antarmuka Pengguna (React Client Components)
│   ├── ConfirmModal.tsx            # Komponen modal konfirmasi cadangan
│   ├── DraftSavedModal.tsx         # Modal notifikasi simpan sementara & lanjutkan draf
│   ├── Footer.tsx                  # Footer brand Fotonic identik Web-Porto (WA & IG)
│   ├── HeroBanner.tsx              # Header klien, auto-focal wajah mobile, & link IG
│   ├── Icons.tsx                   # Kumpulan ikon SVG vektor kustom Fotonic
│   ├── LoadingScreen.tsx           # Layar loading awal dengan animasi shutter berputar
│   ├── LockedSessionModal.tsx      # Modal informasi sesi yang telah dikunci sebelumnya
│   ├── MasonryGallery.tsx          # Grid Masonry pintar penyeimbang tinggi kolom
│   ├── PhotoCard.tsx               # Kartu foto galeri (ter-memoisasi, stroke emas di depan)
│   ├── PhotoModal.tsx              # Lightbox fullview dengan zoom/pan 60fps & catatan
│   ├── PhotoNoteModal.tsx          # Modal input catatan khusus per foto
│   ├── PreviewView.tsx             # Halaman tinjauan foto terpilih & catatan umum editor
│   ├── ProgressBar.tsx             # Sticky progress bar & counter kuota foto
│   ├── Successmodal.tsx            # Halaman sukses akhir & integrasi pesan WhatsApp
│   └── WelcomeModal.tsx            # Modal sapaan awal & panduan pemilihan foto
├── lib/                            # Pustaka Logika Bisnis & Integrasi Eksternal
│   ├── google/
│   │   ├── auth.ts                 # Autentikasi JWT Google Service Account
│   │   ├── drive.ts                # Query paralel Google Drive, parser folder, & cache
│   │   └── sheets.ts               # Baca/tulis rekapan seleksi ke Google Sheets
│   ├── notesHelper.ts              # Formatter & parser penggabung catatan foto + catatan umum
│   └── scrollLock.ts               # Pengunci scroll halaman berbasis reference-counting
├── public/                         # Aset Statis Publik
│   ├── icons/                      # File master SVG ikon (Calendar, Location, Paper)
│   ├── images/aperture-white.png   # Ikon bilah shutter untuk animasi loading
│   ├── Fotonic Logo White.ico      # Favicon utama aplikasi
│   ├── whitelogo1.png              # Logo putih Fotonic utama
│   └── whitelogo2.png              # Logo sekunder Fotonic
├── scripts/                        # Skrip Utilitas Node.js
│   ├── show-network.js             # Pembersih cache chunk .next usang & penampil IP LAN
│   └── test-connection.mjs         # Skrip diagnostik koneksi Google Drive & Sheets
├── docs/                           # Dokumentasi Internal Proyek
│   ├── DESIGN_RULES.md             # Panduan sistem desain Dark & Champagne Gold Fotonic
│   ├── PROGRESS.md                 # Catatan riwayat tahapan pengembangan
│   └── GOOGLE_CLOUD_NOTES.txt      # Catatan identitas Service Account GCP
├── legacy-streamlit/               # Arsip Versi Prototype Python Streamlit
│   ├── app.py                      # Aplikasi Streamlit generasi pertama
│   ├── requirements.txt            # Dependensi Python Streamlit
│   └── MainScript/                 # Skrip cadangan Streamlit awal
├── .env.example                    # Template variabel environment
├── next.config.mjs                 # Konfigurasi Next.js & pencegahan korupsi cache dev
├── package.json                    # Daftar dependensi & skrip NPM
├── run.bat                         # Launcher interaktif Windows (Menu 1-7)
├── tsconfig.json                   # Konfigurasi kompilator TypeScript
└── update_repo.bat                 # Utilitas sinkronisasi Git (Push, Pull, Status)
```

---

## 🧩 Detail Komponen UI & Fungsinya

| Komponen | Lokasi File | Deskripsi & Tanggung Jawab |
|---|---|---|
| **GalleryPage** | `app/page.tsx` | Mengelola state utama (`selectedIds`, `currentView`, `photoNotes`), sinkronisasi sesi Google Sheets, serta navigasi tombol *Back* HP (`popstate`). |
| **LoadingScreen** | `components/LoadingScreen.tsx` | Menampilkan animasi bilah *shutter* berputar saat mendeteksi metadata klien dan melarut halus (*crossfade*) begitu data siap. |
| **WelcomeModal** | `components/WelcomeModal.tsx` | Menyapa nama klien, menampilkan tanggal sesi dan batas kuota pemilihan foto kepada pengunjung baru. |
| **HeroBanner** | `components/HeroBanner.tsx` | Menampilkan foto sampul otomatis di *mobile* (dengan deteksi posisi wajah `requestIdleCallback`) atau header minimalis di *desktop* beserta tombol `@fotonicproject`. |
| **ProgressBar** | `components/ProgressBar.tsx` | Bar progres melayang (*sticky*) yang menampilkan progres pemilihan (`X / Maks Foto`) dan berubah warna menjadi hijau saat kuota penuh. |
| **MasonryGallery** | `components/MasonryGallery.tsx` | Membagi foto ke dalam 2/3/4 kolom secara proporsional berdasarkan rasio dimensi foto agar tinggi setiap kolom seimbang. |
| **PhotoCard** | `components/PhotoCard.tsx` | Kartu foto individu dengan rasio terkunci, garis tepi emas di depan bayangan bawah saat dipilih, tombol centang, dan tombol perbesar (`⛶`). |
| **PhotoModal** | `components/PhotoModal.tsx` | Layar penuh (*fullview*) dengan nama file di kiri atas, nomor urut di kanan atas, *zoom/pan* 60fps, tombol kembali di kiri bawah, serta tombol `📝 Catatan` dan `Pilih` di kanan bawah. |
| **PhotoNoteModal** | `components/PhotoNoteModal.tsx` | Dialog pop-up untuk menulis, mengubah, atau menghapus catatan revisi spesifik pada satu foto tertentu. |
| **PreviewView** | `components/PreviewView.tsx` | Halaman tinjauan akhir yang menampilkan daftar foto terpilih, tombol catatan per foto, kolom catatan umum editor, dan tombol konfirmasi. |
| **DraftSavedModal** | `components/DraftSavedModal.tsx` | Memberikan konfirmasi saat pilihan berhasil disimpan sementara (`DRAF`) atau saat melanjutkan draf dari kunjungan sebelumnya. |
| **LockedSessionModal** | `components/LockedSessionModal.tsx` | Muncul jika klien membuka tautan yang sudah berstatus `TERKUNCI`, menampilkan waktu penguncian serta opsi lihat atau buka kunci untuk edit ulang. |
| **SuccessModal** | `components/Successmodal.tsx` | Menampilkan rekapitulasi bernomor setelah pilihan dikunci, tombol salin ke *clipboard*, dan tombol kirim otomatis ke WhatsApp Admin Fotonic. |
| **Footer** | `components/Footer.tsx` | Menampilkan informasi brand Fotonic Project, lokasi layanan, serta tombol kontak WhatsApp dan Instagram. |

---

## 🔌 Detail Endpoint API & Pustaka Backend

| Endpoint / Modul | Metode | Fungsi Utama |
|---|---|---|
| `/api/photos` | `GET` | Mengambil metadata folder klien (nama klien, tanggal, kuota) serta seluruh foto & struktur subfolder secara paralel dari Google Drive. |
| `/api/session` | `GET` | Memeriksa baris terakhir di Google Sheets untuk `folder_id` terkait guna memulihkan sesi `DRAF` atau mendeteksi status `TERKUNCI`. |
| `/api/thumbnail` | `GET` | Mengalirkan (*stream*) gambar thumbnail (`=w420`) atau gambar resolusi tinggi (`&full=1` -> `=s1600`) melalui memori cache server. |
| `/api/banner` | `GET` | Mengambil foto sampul dari subfolder `Cover` (atau foto pertama di folder utama jika `Cover` tidak ada) dengan ukuran optimal (`=w1080`). |
| `/api/submit` | `POST` | Memvalidasi ID foto terhadap isi folder Google Drive, menggabungkan catatan per foto + catatan umum, lalu menyimpan baris baru (`DRAF` / `TERKUNCI`) ke Google Sheets. |

---

## 🏷️ Aturan Struktur & Penamaan Folder Google Drive

### 1. Format Nama Folder Utama Klien
Sistem secara otomatis mengekstrak **Nama Klien**, **Tanggal Sesi**, dan **Kuota Maksimal Foto** dari nama folder Google Drive:

```text
[Nama Klien], [Tanggal Foto], [Kuota Pemilihan Foto]
```

**Contoh Penamaan yang Didukung:**
- `Arya Pratama, 31 Oktober 2026, 15 Foto`
- `Budi & Siti - 28/10/2026 - 20`
- `Cindy Laura | 15 November 2026 | 10 Foto`

### 2. Struktur Isi Folder Google Drive
Anda dapat menaruh foto dengan 2 cara:
1. **Langsung di Dalam Folder Klien (Tanpa Subfolder)**:
   - Seluruh foto langsung tampil dalam satu galeri tanpa pembagian sekat judul.
2. **Menggunakan Subfolder Kategori**:
   - Setiap subfolder (selain `Cover`) akan otomatis menjadi *section* terpisah dengan judul sesuai nama subfolder tersebut.
   - Subfolder bernama **`Cover`** akan otomatis disembunyikan dari daftar pilih foto dan dipakai sebagai gambar *Hero Banner* di tampilan *mobile*.

---

## 📊 Skema Pencatatan Google Sheets (Draf & Terkunci)

Sistem mencatat setiap aktivitas penyimpanan ke **`Sheet1`** pada Google Spreadsheet dari kolom **A** hingga **G**:

| Kolom | Nama Field | Contoh Nilai | Keterangan |
|---|---|---|---|
| **A** | Waktu | `2026-11-03 21:45:10` | Waktu penyimpanan (`YYYY-MM-DD HH:mm:ss`) |
| **B** | Nama Klien | `Arya Pratama` | Nama klien hasil deteksi folder atau parameter URL |
| **C** | Status | `DRAF` atau `TERKUNCI` | `DRAF` (Simpan Sementara) / `TERKUNCI` (Kirim Final) |
| **D** | Jumlah Foto | `15` | Total foto yang dipilih |
| **E** | Daftar File | `DSC_0001.JPG,\nDSC_0005.JPG` | Daftar nama file terurut abjad |
| **F** | Catatan | `[CATATAN KHUSUS PER FOTO]...` | Gabungan catatan per foto & catatan umum |
| **G** | Folder ID | `1-NAhCpCPE6IgEkzqIJalkx4IzIfjVEHk` | ID Folder Google Drive sebagai kunci pencocokan sesi |

---

## ⚙️ Instalasi & Konfigurasi Environment

1. Pastikan **Node.js 18+** sudah terpasang di komputer Anda.
2. Salin file `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Isi variabel berikut di dalam `.env.local`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=nama-service-account@project-id.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SPREADSHEET_ID=id_google_spreadsheet_anda
   TEST_DRIVE_FOLDER_ID=id_folder_drive_untuk_demo
   ```
4. Pastikan folder Google Drive klien sudah dibagikan (*Share*) ke email Service Account sebagai **Viewer**, dan file Google Spreadsheet dibagikan sebagai **Editor**.

---

## 🚀 Cara Menjalankan Aplikasi

### Cara 1: Melalui Launcher Interaktif (`run.bat`)
Klik dua kali file **`run.bat`** pada Windows Explorer, lalu pilih nomor menu:
- **`[1]` Jalankan Next.js (Mode Development)**: Membersihkan chunk usang secara otomatis dan menjalankan server di `http://localhost:3000` (serta menampilkan alamat IP LAN untuk dibuka di HP).
- **`[2]` Build & Jalankan Next.js (Mode Production)**: Melakukan kompilasi produksi (`next build`) dan menjalankan server produksi (`next start`).
- **`[6]` Bersihkan Cache Next.js**: Mereset folder `.next` jika diperlukan.

### Cara 2: Melalui Terminal Manual
```bash
# Instalasi paket dependensi
npm install

# Menjalankan mode development (lokal & jaringan Wi-Fi/LAN)
npm run dev

# Menguji koneksi API Google Drive & Google Sheets
npm run test:connection

# Build & jalankan mode production
npm run build
npm start
```

---

## 🔗 Panduan Format URL Klien

1. **Membuka lewat Halaman Input Manual**:
   Buka `http://localhost:3000` (atau domain produksi Anda). Klien/Admin dapat langsung menempelkan (*paste*) tautan lengkap folder Google Drive atau ID Folder ke kolom yang tersedia.
2. **Membuka lewat Tautan Langsung (Otomatis Deteksi Nama, Tanggal, & Kuota)**:
   ```text
   https://domain-anda.com/?folder_id=1-NAhCpCPE6IgEkzqIJalkx4IzIfjVEHk
   ```
3. **Membuka dengan Parameter Kustom Opsional**:
   ```text
   https://domain-anda.com/?folder_id=ID_FOLDER&klien=Nama+Klien&date=31+Oktober+2026&max=15
   ```

---

## 📄 Lisensi & Hak Cipta
© **Fotonic Photo & Video Project** — Bandar Lampung & Sekitarnya.  
*"Capture your moment and tell your story"*
