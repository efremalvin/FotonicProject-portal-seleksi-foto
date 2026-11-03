# 👑 FOTONIC DESIGN SYSTEM & THEME RULES
> **Panduan Resmi Karakter, Warna, Tipografi, dan Standar Komponen UI**  
> *Proyek: Fotonic Photo & Video Project — Web Seleksi Foto Klien*  
> *Versi: 1.0.0*

---

## 1. 🏛️ Identitas, Filosofi & Karakter Brand

* **Brand Persona & Archetype**: *Dark Luxury, Cinematic, Prestisius, Intim, & Modern Minimalis*.
* **Tujuan Visual**: Menempatkan mahakarya foto klien sebagai bintang utama (*focal point*), dengan latar belakang gelap pekat yang imersif dan aksen emas sampanye (*champagne gold*) yang memancarkan kesan mewah dan profesional.
* **Prinsip Utama Fotografi**:
  1. **Strict No-Crop Policy**: Rasio aspek asli foto (portrait `2:3` atau landscape `3:2`) **wajib dipertahankan**. Dilarang memotong/memangkas wajah atau komposisi estetis foto fotografer.
  2. **Asset Protection**: Nonaktifkan fungsi drag gambar (`-webkit-user-drag: none`), klik kanan seleksi teks pada gambar, dan tidak menyediakan tombol download langsung sebelum fase editing final selesai.
  3. **High Contrast Readability**: Elemen navigasi melayang (*sticky progress bar*) dan teks counter wajib berlatar hitam pekat (`rgba(9, 9, 11, 0.96)`) dengan teks putih/emas agar selalu kontras di atas foto apa pun.

---

## 2. 🎨 Palet Warna & Variabel Resmi (Color Tokens)

Semua implementasi styling wajib merujuk pada token CSS standar di bawah ini:

```css
:root {
  /* --- 1. DARK / INK FOUNDATION --- */
  --color-ink: #09090b;             /* Hitam pekat Obsidian (Background utama & overlay modal) */
  --color-ink-soft: #111114;        /* Hitam arang halus (Placeholder container foto) */
  --color-ink-card: #16161a;        /* Permukaan kartu, modal, pop-up, dan dialog */
  --color-ink-card-hover: #1f1f26;  /* Status hover interaktif pada card */
  --color-ink-elevated: #1e1e24;    /* Floating bar, preview dock, dan elevated menu */

  /* --- 2. BRAND ACCENT: CHAMPAGNE GOLD --- */
  --color-gold: #d6a85a;            /* Gold klasik primer (Border aktif, icon, button) */
  --color-gold-light: #f0cf8e;      /* Shimmer gold terang (Gradasi sorotan, badge aktif) */
  --color-gold-dark: #b9853a;       /* Burnished gold gelap (Gradasi bayangan tombol) */
  --color-gold-border: rgba(214, 168, 90, 0.28); /* Garis batas halus aksen emas */
  --color-gold-glow: rgba(214, 168, 90, 0.18);   /* Ambient glow & drop shadow */

  /* --- 3. TYPOGRAPHY & NEUTRALS --- */
  --color-text-main: #ededed;       /* Teks putih terang (Heading, nama klien, judul foto) */
  --color-text-muted: #a1a1aa;      /* Abu-abu netral (Subheading, deskripsi, kuota) */
  --color-text-subtle: #71717a;     /* Abu-abu redup (Footnote, copyright footer) */

  /* --- 4. FUNCTIONAL & THIRD-PARTY SEMANTICS --- */
  --color-wa: #25d366;              /* Hijau resmi WhatsApp */
  --color-success: #22c55e;         /* Status berhasil/terkirim */
}
```

---

## 3. ✍️ Sistem Tipografi (Typography Hierarchy)

* **Font Primer**: `'Montserrat', ui-sans-serif, system-ui, sans-serif`
  * Bobot yang dipakai: `400` (Regular), `500` (Medium), `600` (Semi-bold), `700` (Bold), `800` (Extra Bold).
* **Font Aksen Dekoratif / Script**: `'Tangerine', cursive` (opsional untuk kartu ucapan/wedding vibe).
* **Sistem Ikon**: `'Material Symbols Outlined'` dan inline SVG teroptimasi.

### Skala Hierarki Tipografi:
| Tingkatan | Ukuran Font | Weight | Warna | Aturan Khusus |
| :--- | :--- | :--- | :--- | :--- |
| **Section Tagline** | `0.72rem - 0.75rem` | `700` | `#d6a85a` | Uppercase, `letter-spacing: 0.24em - 0.26em`, diapit garis horizontal `24px` |
| **Hero Title (Nama Klien)** | `1.75rem - 2.5rem` | `800` | `#ffffff` | Tight spacing (`-0.5px`), `line-height: 1.2`, text-shadow halus |
| **Modal / Card Heading** | `1.25rem - 1.5rem` | `700` | `#ededed` | Bersih, proporsional, margin terukur |
| **Sub-labels / Badges** | `0.75rem - 0.85rem` | `600` | `#f0cf8e` | Bentuk kapsul (*pill*), latar gelap berbingkai emas |
| **Nama File Foto** | `0.72rem` | `600` | `#ededed` | Single-line ellipsis, di atas gradasi bayangan hitam `rgba(0,0,0,0.85)` |
| **Body / Catatan** | `0.85rem - 0.95rem` | `400 / 500`| `#a1a1aa` | Line-height `1.5 - 1.6`, nyaman dibaca di layar gelap |

---

## 4. 📐 Bentuk, Sudut (Radius), & Elevasi Visual

* **Border Radius System**:
  * **Pill / Kapsul (`9999px`)**: Tombol utama (`.btn-gold`), badge tanggal, tombol konfirmasi, dan floating progress bar.
  * **Modal & Dialog (`28px`)**: Panel modal selamat datang (*Welcome Modal*), dialog konfirmasi, dan modal sukses.
  * **Kartu Galeri (`10px`)**: Membingkai foto dengan sudut lembut tanpa mengurangi area visual foto.
  * **Badge & Circular Action (`50%`)**: Tombol silang (*close*), tombol menu kategori folder, dan centang seleksi.

* **Efek Latar (Atmospheric Ambient Glow)**:
  * Menggunakan lapisan gradien radial emas lembut yang diisolasi di layer GPU `body::before` untuk mencegah lag saat scrolling di mobile:
    ```css
    radial-gradient(circle 480px at 15% 15%, rgba(214, 168, 90, 0.045), transparent 70%),
    radial-gradient(circle 480px at 85% 75%, rgba(214, 168, 90, 0.038), transparent 70%)
    ```

* **Glassmorphism & Backdrop**:
  * Background: `rgba(9, 9, 11, 0.92)` hingga `rgba(9, 9, 11, 0.96)`.
  * Efek Blur: `backdrop-filter: blur(6px)` hingga `blur(14px)`.

---

## 5. 🧩 Aturan Komponen UI (UI Component Rules)

### A. Tombol Brand Utama (`.btn-gold`)
```css
.btn-gold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 9999px;
  padding: 14px 26px;
  font-size: 0.95rem;
  font-weight: 800;
  color: #09090b; /* Kontras tinggi di atas emas */
  background: linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%);
  box-shadow: 0 4px 18px rgba(214, 168, 90, 0.28);
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
}
.btn-gold:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: 0 6px 24px rgba(214, 168, 90, 0.45);
  transform: translateY(-1px);
}
.btn-gold:active:not(:disabled) {
  transform: scale(0.98);
}
```

### B. Kartu Foto Galeri (Photo Card)
* **Kondisi Normal**:
  * Border luar: `1px solid rgba(255, 255, 255, 0.08)`.
  * Rasio aspek dikunci dinamis (`width / height` atau rasio portrait/landscape) agar terjadi **Zero Layout Shift**.
* **Kondisi Terpilih (Selected State)**:
  * Stroke frame: `border: 3px solid #d6a85a` mengelilingi kartu.
  * Bayangan luar: `box-shadow: 0 2px 10px rgba(214, 168, 90, 0.45)`.
  * Indikator centang: Lingkaran emas `#d6a85a` dengan centang hitam tebal.
* **Kondisi Kuota Penuh (Disabled State)**:
  * Kartu yang tidak dipilih diberi efek `opacity: 0.5` dan `cursor: not-allowed`.

### C. Floating Progress Bar (Sticky Counter)
* Posisi: `position: sticky; top: 12px; z-index: 9999;`.
* Background: Pekat `rgba(9, 9, 11, 0.96)` dipadu `backdrop-filter: blur(6px)`.
* Border: `1px solid rgba(214, 168, 90, 0.35)`.
* Indikator Fill: Bar gradien emas yang terisi persentase kuota (`#f0cf8e` ke `#d6a85a`).
* Tombol Aksi "Tinjau Pilihan": Muncul otomatis saat minimal ada 1 foto terpilih.

### D. Hero Section (Responsiveness Rule)
* **Mobile View**: Menampilkan foto cover klien dengan *deep dark gradient vignette* atas dan bawah, dilengkapi auto-focal point centering wajah/subjek.
* **Desktop View**: Minimalis, ringkas, bersih tanpa banner foto raksasa yang menutupi layar (`.hero-desktop-clean`), agar galeri foto langsung tampak di layar utama (*above the fold*).

### E. Tinjauan & Modal Preview
* Tombol kembar sejajar di desktop (*Kembali ke Galeri* & *Konfirmasi & Kirim*) dibuat simetris dengan tinggi seragam `52px` dan radius `9999px`.
* Mengunci scroll background secara aman (`scrollLock.ts`) saat modal aktif untuk mencegah double-scrolling di perangkat mobile.

---

## 6. 📋 Aturan Perilaku & Interaksi (Behavioral Rules)

1. **Gunakan Selalu Token Warna Resmi**: Jangan pernah menggunakan warna heksadesimal acak (misal: `#222` atau `#eedd82`). Wajib menggunakan `--color-ink`, `--color-ink-card`, `--color-gold`, dsb.
2. **Proporsi Emas yang Elegan**: Jangan gunakan warna emas secara berlebihan pada blok besar. Emas berfungsi sebagai aksen pemanis visual (*borders, buttons, badges, highlights*).
3. **Pill-Shaped untuk Seluruh Action Button**: Semua tombol aksi utama (*Call-to-Action*) menggunakan sudut bulat penuh `border-radius: 9999px`.
4. **Scroll Lock pada Modal**: Setiap kali modal pop-up terbuka, fungsi scroll lock wajib diaktifkan pada elemen `body` untuk menjaga kenyamanan pengalaman pengguna pada perangkat seluler.
5. **No Layout Shift (CLS = 0)**: Semua gambar thumbnail galeri wajib memiliki nilai aspek rasio yang ditetapkan sebelum gambar selesai dimuat oleh browser.
