# 📷 Fotonic - Web Seleksi Foto Klien

Portal web modern untuk klien **Fotonic Photo & Video Project** dalam memilih foto terbaik hasil sesi pemotretan (maksimal 15 foto atau sesuai kuota yang ditentukan) secara interaktif, aman, dan langsung tersinkronisasi ke Google Drive serta Google Sheets.

---

## 📑 Daftar Isi
1. [Ringkasan & Analisis Web](#-ringkasan--analisis-web)
2. [Fitur Unggulan](#-fitur-unggulan)
3. [Format Penamaan Folder Google Drive (Deteksi Otomatis)](#-format-penamaan-folder-google-drive-deteksi-otomatis)
4. [Arsitektur & Tech Stack](#-arsitektur--tech-stack)
5. [Struktur Direktori](#-struktur-direktori)
6. [Prasyarat Sistem](#-prasyarat-sistem)
7. [Instalasi & Konfigurasi](#-instalasi--konfigurasi)
8. [Cara Menjalankan Web](#-cara-menjalankan-web)
   - [Menggunakan File Batch (`run.bat`)](#1-cara-mudah-menggunakan-file-batch-runbat)
   - [Manual via Terminal](#2-manual-via-terminal)
   - [Versi Legacy Streamlit](#3-versi-legacy-streamlit)
9. [Panduan Tautan Klien & Query Parameter](#-panduan-tautan-klien--query-parameter)
10. [Sinkronisasi & Update ke GitHub (`update_repo.bat`)](#-sinkronisasi--update-ke-github-update_repobat)
11. [Konfigurasi Google Cloud Platform](#-konfigurasi-google-cloud-platform)

---

## 🔍 Ringkasan & Analisis Web

Aplikasi ini dibangun untuk menggantikan proses seleksi foto konvensional yang manual dan rawan kesalahan. 

### 1. Masalah yang Diselesaikan
- **Distribusi File Aman**: Klien hanya dapat melihat pratinjau foto resolusi optimal tanpa tombol unduh (*no-download policy*) untuk melindungi hak cipta sebelum foto final diserahkan.
- **Tampilan Foto Asli Tanpa Crop**: Foto portrait tetap tampil vertikal penuh dan landscape tetap tampil horizontal penuh tanpa terpotong (*no crop*), menggunakan tata letak galeri Masonry responsif.
- **Deteksi Otomatis Nama Klien, Tanggal, & Kuota**: Sistem membaca nama folder Google Drive secara otomatis untuk mengisi nama klien, tanggal sesi foto, dan batas kuota tanpa harus mengetik ulang parameter URL secara manual.
- **Pencegahan Human Error**: Sistem membatasi jumlah foto yang dipilih secara real-time. Klien tidak dapat mengirimkan form jika belum memilih foto atau melebihi kuota.
- **Otomatisasi Alur Kerja Studio**: Hasil seleksi klien beserta catatan khusus langsung tercatat secara otomatis ke Google Sheets studio Fotonic dan diverifikasi langsung ke folder Google Drive terkait.

### 2. Alur Pengguna (User Flow)
```mermaid
flowchart TD
    A[Admin Fotonic buat folder di GDrive] --> B[Klien membuka web via link]
    B --> C[Web parse nama folder: Nama, Tanggal, Kuota]
    C --> D[Welcome Modal muncul: Info kuota & tanggal sesi]
    D --> E[Klien memilih foto pada grid galeri tanpa crop]
    E --> F{Cek Kuota Terpilih}
    F -->|Melebihi Kuota| G[Centang foto lain terkunci otomatis]
    F -->|Sesuai Kuota| H[Buka Tab 'Preview' untuk review]
    H --> I[Klien mereview pilihan & menulis catatan khusus]
    I --> J[Klik 'Konfirmasi & Kirim Pilihan']
    J --> K[Next.js API Route memvalidasi file ID ke Drive]
    K --> L[Simpan data ke Google Sheets]
    L --> M[Tampilkan Success Modal & Notifikasi WhatsApp]
```

---

## ✨ Fitur Unggulan

- 🎨 **Tema Gelap & Aksen Gold Mewah**: Mengadopsi palet warna gelap elegan (`#09090b` Ink, `#16161a` Card) dengan aksen Gold (`#d6a85a`, `#f0cf8e`) senada dengan identitas visual portofolio Fotonic.
- 📐 **Tampilan Foto Pas Tanpa Crop**: Tata letak Masonry responsif yang mempertahankan proporsi alami setiap foto (portrait tetap portrait, landscape tetap landscape tanpa terpotong atau terdistorsi).
- 📅 **Penampil Tanggal Sesi Foto**: Tanggal pemotretan ditampilkan di bawah nama klien dengan tipografi badge emas yang proporsional dan elegan.
- ⚡ **Streaming Thumbnail Aman**: Gambar di-stream melalui backend Next.js (`/api/thumbnail`) menggunakan resolusi terkompresi hemat bandwidth (~w600, < 100 KB) dengan caching HTTP, sehingga folder Google Drive tetap aman tanpa harus dibuka untuk umum.
- 📊 **Dynamic Sticky Counter (Pekat & Kontras Tinggi)**: Bar kemajuan yang melayang dengan latar belakang hitam pekat (`rgba(9,9,11,0.95)`), bingkai aksen gold, dan angka counter kontras tinggi (`X / max Foto`) yang sangat mudah terbaca.
- 🔄 **Tombol Aksi Tinjauan Konsisten**: Desain tombol "← Ubah Pilihan di Galeri" dan "Konfirmasi & Kirim Pilihan ✓" dibuat simetris dengan gaya pil (*pill-shaped*), tinggi seimbang, dan visual harmonis.
- 🔍 **Lightbox Modal (Zoom Foto)**: Klien dapat memperbesar foto untuk memeriksa detail ekspresi dan fokus sebelum memilih.
- 📝 **Tinjauan Seleksi & Catatan**: Halaman pratinjau khusus yang memfilter hanya foto-foto terpilih, memungkinkan klien membatalkan pilihan tertentu dan menyisipkan catatan revisi/editing.
- 🛡️ **Validasi Ganda (Client & Server)**: Memastikan integritas data dan mencegah manipulasi kuota atau injeksi file ID liar.

---

## 🏷️ Format Penamaan Folder Google Drive (Deteksi Otomatis)

Sistem dapat membaca metadata nama folder Google Drive secara otomatis untuk menentukan:
1. **Nama Klien**
2. **Tanggal Foto**
3. **Kuota Pemilihan Foto**

### Format Standar:
```text
[Nama Client], [Tanggal Foto], [Kuota Pemilihan Foto]
```

### Contoh Format yang Didukung:
- `Arya Pratama, 31 Oktober 2026, 15 Foto`
- `Budi & Siti - 28/10/2026 - 15`
- `Cindy Laura, 15 November 2026, 10`
- `Keluarga Wijaya - 2026-11-01 - 20 Foto`

> [!TIP]
> Karakter pemisah yang didukung: koma (`,`), tanda hubung (` - `), garis bawah (`_`), atau pipa (`|`).
> Jika URL menyertakan parameter `?klien=...`, `?date=...`, atau `?max=...`, nilai di URL akan menjadi prioritas pengganti.

---

## 🛠️ Arsitektur & Tech Stack

Aplikasi ini memiliki 2 fondasi:
1. **Next.js (App Router) — Versi Utama & Rekomendasi**:
   - **Framework**: [Next.js 14](https://nextjs.org/) (React 18, TypeScript)
   - **Styling**: Dark & Gold Modular CSS (`app/global.css`) dengan aksen palet Fotonic Porto
   - **Backend API**: Next.js Route Handlers (`/api/photos`, `/api/thumbnail`, `/api/banner`, `/api/submit`)
   - **Cloud SDK**: `googleapis` (Drive API v3, Sheets API v4)

2. **Streamlit (Python) — Versi Prototype / Cadangan**:
   - Berkas `app.py` dan `MainScript/app.py`
   - Menggunakan pustaka Python: `streamlit`, `gspread`, `google-api-python-client`, `google-auth`

---

## 📁 Struktur Direktori

```text
Web-Seleksi-Seleksi-Foto-Client/
├── app/                        # Next.js App Router
│   ├── api/                    # Endpoint Backend Internal
│   │   ├── banner/route.ts     # Mengambil foto cover banner
│   │   ├── photos/route.ts     # Mengambil daftar foto & metadata folder
│   │   ├── submit/route.ts     # Validasi & pencatatan ke Google Sheets
│   │   └── thumbnail/route.ts  # Proxy streaming thumbnail aman
│   ├── global.css              # Dark & Gold styling, masonry & scrollbar
│   ├── layout.tsx              # Root layout & konfigurasi font
│   └── page.tsx                # Halaman utama galeri seleksi
├── components/                 # Komponen Antarmuka Klien
│   ├── ConfirmModal.tsx        # Modal konfirmasi sebelum submit
│   ├── HeroBanner.tsx          # Banner cover, nama klien & tanggal sesi
│   ├── PhotoCard.tsx           # Kartu foto galeri pas tanpa crop
│   ├── PhotoModal.tsx          # Lightbox pratinjau resolusi tinggi
│   ├── PreviewView.tsx         # Tampilan tinjauan foto terpilih + tombol konsisten
│   ├── ProgressBar.tsx         # Sticky counter pekat & kontras tinggi
│   ├── Successmodal.tsx        # Modal sukses & konfirmasi WhatsApp
│   └── WelcomeModal.tsx        # Modal panduan awal klien
├── lib/                        # Pustaka & Integrasi Google
│   └── google/
│       ├── auth.ts             # Inisialisasi Service Account JWT
│       ├── drive.ts            # Logika pembacaan Google Drive & parser folder
│       └── sheets.ts           # Logika penulisan Google Sheets
├── public/                     # Aset statis & logo
│   ├── blacklogo1.png
│   ├── blacklogo2.png
│   ├── whitelogo1.png
│   └── whitelogo2.png
├── MainScript/                 # Berkas cadangan Streamlit asli
├── .env.example                # Contoh format variabel lingkungan (placeholder aman)
├── .env.local                  # Konfigurasi rahasia lokal (diabaikan git)
├── app.py                      # Skrip Streamlit Python
├── package.json                # Dependensi Node.js & skrip npm
├── requirements.txt            # Dependensi Python
├── run.bat                     # Otomasi Windows untuk menjalankan aplikasi
└── update_repo.bat             # Otomasi Windows untuk Git commit & push
```

---

## 💻 Prasyarat Sistem

- **Node.js**: Versi `18.x` atau lebih baru (disarankan Node.js `20 LTS` atau `24`)
- **NPM**: Bawaan dari instalasi Node.js
- **Git**: Untuk manajemen repositori
- *(Opsional)* **Python 3.10+**: Hanya jika ingin menjalankan versi Streamlit

---

## ⚙️ Instalasi & Konfigurasi

### 1. Salin Konfigurasi Environment
Buat berkas `.env.local` di root folder proyek:

```bash
cp .env.example .env.local
```

### 2. Isi Variabel di `.env.local`
Buka file `.env.local` dan masukkan kredensial Service Account Google Anda:

```env
# Google Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[MASUKKAN_PRIVATE_KEY_SERVICE_ACCOUNT_DI_SINI]\n-----END PRIVATE KEY-----\n"

# Google Resources
GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id_here
TEST_DRIVE_FOLDER_ID=your_google_drive_folder_id_here
```

---

## 🚀 Cara Menjalankan Web

### 1. Cara Mudah: Menggunakan File Batch (`run.bat`)
Cukup **klik dua kali (double click)** pada berkas:
```text
run.bat
```
Skrip ini akan otomatis memeriksa dependensi, mengecek file `.env.local`, dan menampilkan menu:
1. **Mode Development (Next.js)**: Menjalankan server pada `http://localhost:3000`.
2. **Mode Production (Next.js)**: Build teroptimasi dan menjalankan server produksi.
3. **Mode Streamlit (Python)**: Menjalankan `app.py` pada `http://localhost:8501`.
4. **Buka URL Demo Klien**: Membuka browser langsung ke galeri uji coba.

---

### 2. Manual via Terminal

#### Mode Development
```bash
# 1. Install dependensi
npm install

# 2. Jalankan server pengembang
npm run dev
```
Akses di browser: `http://localhost:3000`

#### Mode Production
```bash
npm run build
npm start
```

---

### 3. Versi Legacy Streamlit
```bash
pip install -r requirements.txt
streamlit run app.py
```

---

## 🔗 Panduan Tautan Klien & Query Parameter

> [!IMPORTANT]
> **Catatan Pengujian Lokal vs Website Online:**
> - `http://domain-anda.com` adalah **contoh domain** ketika aplikasi sudah di-deploy ke server online / hosting (seperti Vercel, Railway, dsb).
> - Jika sedang dicoba di komputer lokal Anda, pastikan server sudah berjalan (`npm run dev`), lalu buka alamat:
>   - **Cara 1 (Paling Mudah)**: Buka langsung `http://localhost:3000` di browser. Web akan menampilkan layar pembuka di mana Anda cukup mem-paste link Google Drive klien atau Folder ID, lalu klik **"Buka Galeri Foto"**.
>   - **Cara 2 (Tautan Langsung)**: Buka `http://localhost:3000/?folder_id=[ID_ATAU_LINK_FOLDER_GDRIVE]`.
> - Sistem kini **otomatis mendukung link lengkap Google Drive** (contoh: `https://drive.google.com/drive/folders/...`) maupun ID folder saja.

### 1. Format Tautan Klien (Otomatis Parse Nama, Tanggal, & Kuota)
Cukup bagikan link dengan parameter `folder_id`:

```text
# Di Komputer Lokal:
http://localhost:3000/?folder_id=[ID_ATAU_LINK_FOLDER_GDRIVE]

# Di Website Online (Setelah Deploy):
https://domain-anda.com/?folder_id=[ID_ATAU_LINK_FOLDER_GDRIVE]
```

### 2. Format dengan Parameter Manual Opsional
Jika Anda ingin menentukan nilai khusus yang mengabaikan nama folder, tambahkan query parameter opsional:
```text
http://localhost:3000/?folder_id=[ID_FOLDER]&klien=[NAMA_KLIEN]&date=[TANGGAL]&max=[KUOTA]
```

### Tabel Parameter:
| Parameter | Wajib | Keterangan | Contoh |
|---|---|---|---|
| `folder_id` | **Wajib** | ID Folder atau Link Lengkap Google Drive tempat foto | `CONTOH_ID_FOLDER_GOOGLE_DRIVE` atau `https://drive.google.com/drive/folders/CONTOH_ID` |
| `klien` | Opsional | Nama klien (otomatis dibaca dari nama folder jika dikosongkan) | `Arya%20Pratama` |
| `date` / `tanggal` | Opsional | Tanggal pemotretan (otomatis dibaca dari nama folder jika dikosongkan) | `31%20Oktober%202026` |
| `max` | Opsional | Kuota maksimal foto (otomatis dibaca dari nama folder jika dikosongkan, default `15`) | `15` |

**Contoh URL Pengujian Lokal:**
```text
http://localhost:3000/?folder_id=CONTOH_ID_FOLDER_GOOGLE_DRIVE
```

---

## 🔄 Sinkronisasi & Update ke GitHub (`update_repo.bat`)

Untuk mengupdate repository GitHub secara praktis:

1. **Klik dua kali** pada berkas:
   ```text
   update_repo.bat
   ```
2. Pilih menu:
   - **`[1] Quick Push`**: Menjalankan `git add -A`, meminta pesan commit, lalu melakukan `git push origin main`.
   - **`[2] Pull Terbaru`**: Menarik pembaruan dari repository GitHub (`git pull origin main`).
   - **`[3] Cek Status Repository`**: Melihat status file yang diubah dan riwayat commit.
   - **`[4] Batalkan Perubahan Lokal`**: Reset working tree ke kondisi commit terakhir.

---

## ☁️ Konfigurasi Google Cloud Platform

1. Pastikan **Google Drive API** dan **Google Sheets API** sudah aktif pada proyek GCP Anda.
2. Buat **Service Account** dan unduh file kunci JSON-nya.
3. Masukkan `client_email` dan `private_key` ke `.env.local`.
4. **PENTING**:
   - Bagikan (*Share*) folder foto Google Drive ke email Service Account (akses minimal: **Viewer**).
   - Bagikan (*Share*) Google Spreadsheet rekapan ke email Service Account (akses: **Editor**).
5. Format baris Google Sheets yang dicatat sistem:
   - **Kolom A**: Waktu submit (`YYYY-MM-DD HH:mm:ss`)
   - **Kolom B**: Nama Klien
   - **Kolom C**: Status (`Selesai`)
   - **Kolom D**: Total Foto Terpilih
   - **Kolom E**: Daftar Nama File (dipisahkan koma dan baris baru)
   - **Kolom F**: Catatan Klien (opsional)

---

## 📄 Lisensi
Hak cipta milik **Fotonic Project**. Dikembangkan khusus untuk mempermudah operasional seleksi foto klien studio.
