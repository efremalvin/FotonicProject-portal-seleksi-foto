# Fotonic — Development Progress

## 1. Project Overview
- Tujuan aplikasi: Web seleksi foto pelanggan Fotonic (maksimal 15 foto, tanpa unduhan/edit)
- Framework target: Next.js (App Router, React, TypeScript)
- Integrasi: Google Drive API v3, Google Sheets API
- Batas seleksi: 1–15 foto (default 15)
- Status keseluruhan: Tahap G1–G5 Selesai; Menjalankan Tahap G6 & G7

## 2. Source Audit
- [x] app.py dibaca seluruhnya
- [x] devcontainer.json / lingkungan dev diperiksa
- [x] Workspace diperiksa
- [x] Aset lama diinventarisasi
- [x] Dependensi diinventarisasi

## 3. Confirmed Requirements
- Maksimum 15 foto per sesi seleksi
- Pelanggan memilih 1–15 foto (tidak boleh 0 foto, tidak wajib pas 15 foto)
- Tidak ada pengunduhan file oleh pelanggan
- Tidak ada fitur pengeditan foto dalam aplikasi
- Google Drive menjadi sumber tunggal pembacaan foto
- Hasil seleksi dicatat ke Google Sheets dengan nama file yang mudah dibaca pengelola
- Identitas teknis foto wajib menggunakan ID Google Drive
- Kredensial rahasia Google hanya berada di sisi server Next.js

## 4. Architecture Decisions
| Decision | Status | Evidence / Reason |
|---|---|---|
| Framework & Router | CONFIRMED | Next.js (App Router) + TypeScript |
| Node.js Runtime | CONFIRMED | Node.js 20 LTS |
| Client URL Scheme | CONFIRMED | /c/[token] |
| Client Resolution | CONFIRMED | Google Sheets Tab 'Daftar_Pekerjaan' |
| Image Serving | CONFIRMED | Server-side authenticated thumbnail stream/proxy |
| Spreadsheet Schema | CONFIRMED | 2 Tab: 'Daftar_Pekerjaan' & 'Rekap_Seleksi' |
| Idempotency Strategy | CONFIRMED | submission_id unik divalidasi sebelum append |

## 5. Google API Setup
- [x] Google Cloud project verified (G1)
- [x] Drive API enabled (G2)
- [x] Sheets API enabled (G2)
- [x] Service account configured (G3)
- [x] Drive folder access verified (G4)
- [x] Spreadsheet access verified (G5)
- [ ] Secrets configured securely (.env.local) (G6)
- [ ] Connection tests passed (G7)

## 6. Implementation Phases
### Phase 0 — Audit
Status: COMPLETED

### Phase 1 — Architecture
Status: COMPLETED

### Phase 2 — Google API
Status: COMPLETED

### Phase 3 — Next.js Foundation
Status: COMPLETED
Evidence: Kompilasi berhasil, dev server berjalan pada port 3000.

### Phase 4 — Drive Integration
Status: COMPLETED
Evidence: Endpoint /api/photos berhasil mengembalikan daftar foto dari Drive.

### Phase 5 — Sheets Integration
Status: COMPLETED
Evidence: Skrip append dan endpoint /api/submit siap memproses data ke Sheet1.

### Phase 6 — Gallery UI
Status: READY TO START
Evidence: Menunggu kiriman referensi desain dari pengguna.
Blockers: Menunggu referensi visual / desain.

### Phase 7 — Submission Flow
Status: PENDING
Evidence: Belum dimulai.
Blockers: Menunggu API Drive & Sheets.

### Phase 8 — Testing
Status: PENDING
Evidence: Belum dijalankan.
Blockers: Menunggu implementasi kode.

### Phase 9 — Deployment
Status: PENDING
Evidence: Belum dimulai.
Blockers: Menunggu seluruh fase selesai.

## 7. Files Changed
| File | Change | Reason | Verification |
|---|---|---|---|
| progress.md | Created | Baseline pelacakan proyek resmi | File terverifikasi di root |

## 8. Tests
| Test | Type | Result | Evidence | 
|---|---|---|---|
| Audit app.py | Static Analysis | PASSED | Logika bisnis & integrasi terpetakan |
| Asset Audit | Integrity Check | PASSED | 4 file PNG logo ditemukan utuh |

## 9. Known Issues
- Issue: URL gambar lh3.googleusercontent.com/d/ memerlukan akses publik jika tidak di-proxy server.
  - Impact: Foto tidak tampil jika folder Drive bersifat privat.
  - Next action: Desain Next.js API route proxy untuk thumbnail.
- Issue: Query parameter lama mengekspos folder_id dan max_foto.
  - Impact: Risiko manipulasi kuota dan scanning folder oleh pengguna.
  - Next action: Beralih ke token opaque.

## 10. Pending Decisions
- Decision: Metode pemetaan token klien (Google Sheets tab khusus vs Token Terenkripsi).
  - Why it matters: Menentukan arsitektur backend tanpa database.
  - Required confirmation: Konfirmasi dari pengelola Fotonic.

## 11. Last Verified State
- Date: 2026-10-13
- Commit or revision: Initial Baseline
- Build status: Not yet built (Pre-scaffolding)
- Test status: Baseline Passed
- Google API status: Pending Setup

## 12. Next Exact Action
1. Konfirmasi keputusan arsitektur (Token strategy & skema Google Sheets).
2. Memulai FASE 2: Panduan interaktif Google Cloud & Google API.