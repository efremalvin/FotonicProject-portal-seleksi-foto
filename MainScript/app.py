import streamlit as st
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
import gspread

# --- 1. KONFIGURASI HALAMAN ---
st.set_page_config(page_title="Fotonic - Seleksi Foto", layout="wide")

st.title("Fotonic - Photo & Video Project")
st.subheader("Galeri Seleksi Foto Klien")

# --- 2. MENGAMBIL PARAMETER DARI URL ---
# URL yang dikirim ke klien nantinya akan berbentuk seperti ini:
# https://fotonic.streamlit.app/?klien=Budi&folder_id=1AbCdE...&max=15

klien = st.query_params.get("klien", "Klien Fotonic")
folder_id = st.query_params.get("folder_id", None)
# Ambil batasan kuota dari URL, defaultnya 15 jika tidak diisi
max_foto = int(st.query_params.get("max", 15)) 

if not folder_id:
    st.error("⚠️ Tautan tidak lengkap. Pastikan URL memiliki folder_id yang valid.")
    st.stop()

# --- 3. OTENTIKASI KE GOOGLE DRIVE & SHEETS ---
@st.cache_resource
def init_google_apis():
    # Kredensial rahasia (JSON) yang nanti ditaruh di menu Secrets Streamlit
    creds_dict = st.secrets["gcp_service_account"]
    creds = service_account.Credentials.from_service_account_info(
        creds_dict,
        scopes=[
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets"
        ]
    )
    drive_service = build("drive", "v3", credentials=creds)
    gc = gspread.authorize(creds)
    return drive_service, gc

try:
    drive_service, gc = init_google_apis()
    # Pastikan Anda sudah membuat Google Sheets bernama persis seperti di bawah ini:
    sheet = gc.open("Rekap_Seleksi_Foto").sheet1
except Exception as e:
    st.error(f"Gagal terhubung ke server Google: {e}")
    st.stop()

# --- 4. MENGAMBIL FOTO DARI DRIVE ---
# Disimpan dalam cache (memori sementara) selama 5 menit agar web loadingnya cepat
@st.cache_data(ttl=300) 
def get_photos(f_id):
    query = f"'{f_id}' in parents and mimeType contains 'image/' and trashed = false"
    results = drive_service.files().list(
        q=query, 
        fields="files(id, name)", 
        pageSize=500, # Batas maksimal 500 foto per galeri klien
        orderBy="name"
    ).execute()
    return results.get("files", [])

photos = get_photos(folder_id)

if not photos:
    st.warning("Folder foto kosong atau ID Folder salah/tidak bisa diakses publik.")
    st.stop()

# --- 5. LOGIKA SELEKSI FOTO ---
if "terpilih" not in st.session_state:
    st.session_state.terpilih = set()

total_terpilih = len(st.session_state.terpilih)

st.info(f"Halo **{klien}**! Silakan tandai foto pilihan Anda. (Terpilih: {total_terpilih} / {max_foto})")

# Menampilkan batang progres visual
st.progress(total_terpilih / max_foto if total_terpilih <= max_foto else 1.0)

# --- 6. MENAMPILKAN GALERI KE LAYAR ---
kolom = st.columns(3) # Bagi layar jadi 3 kolom

for idx, photo in enumerate(photos):
    with kolom[idx % 3]:
        # Trik untuk mendapatkan link gambar langsung dari Google Drive ID
        img_url = f"https://lh3.googleusercontent.com/d/{photo['id']}"
        file_name = photo["name"]
        
        st.image(img_url, use_container_width=True)
        
        # Mengecek apakah foto sedang dicentang
        is_checked = file_name in st.session_state.terpilih
        # Matikan tombol centang jika sudah batas maksimal DAN foto belum dicentang
        is_disabled = (total_terpilih >= max_foto) and not is_checked
        
        cek = st.checkbox(
            file_name, 
            value=is_checked, 
            key=photo['id'], 
            disabled=is_disabled
        )
        
        # Logika sinkronisasi jika klien klik/un-klik foto
        if cek and file_name not in st.session_state.terpilih:
            st.session_state.terpilih.add(file_name)
            st.rerun() # Refresh layar
        elif not cek and file_name in st.session_state.terpilih:
            st.session_state.terpilih.remove(file_name)
            st.rerun()

st.divider()

# --- 7. TOMBOL SUBMIT ---
if st.button("Kunci & Kirim Pilihan", type="primary", use_container_width=True):
    if total_terpilih < max_foto:
        st.warning(f"Pilihan Anda belum lengkap. Masih kurang {max_foto - total_terpilih} foto lagi sebelum bisa dikirim.")
    else:
        waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        daftar_file_str = ",\n".join(sorted(list(st.session_state.terpilih)))
        
        try:
            # Mencatat hasilnya langsung sebagai baris baru di Google Sheets Anda
            sheet.append_row([waktu, klien, "Selesai", total_terpilih, daftar_file_str])
            
            st.success(f"Mantap! {max_foto} foto pilihan atas nama {klien} telah berhasil dikirim ke server Fotonic.")
            st.balloons() # Efek animasi balon sebagai apresiasi untuk klien
            
            # Menampilkan teks agar klien bisa menyimpannya juga
            st.markdown("### Rekap Pilihan Anda:")
            st.code(daftar_file_str, language="text")
        except Exception as e:
            st.error(f"Terjadi kesalahan saat menyimpan data ke Sheets: {e}")