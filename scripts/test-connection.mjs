import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const folderId = process.env.TEST_DRIVE_FOLDER_ID;

if (!email || !rawKey || !spreadsheetId || !folderId) {
  console.error("Konfigurasi di .env.local belum lengkap.");
  process.exit(1);
}

const privateKey = rawKey.replace(/\\n/g, "\n");

const auth = new google.auth.JWT({
  email,
  key: privateKey,
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

async function testConnection() {
  console.log("Memulai pengujian koneksi Google APIs...");

  // 1. Uji Google Drive
  try {
    const drive = google.drive({ version: "v3", auth });
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, mimeType)",
      pageSize: 5,
    });

    const files = response.data.files || [];
    console.log(`[Google Drive] Berhasil membaca folder. Ditemukan ${files.length} foto contoh.`);
    files.forEach((f, i) => console.log(`   ${i + 1}. ${f.name} (ID: ${f.id})`));
  } catch (err) {
    console.error("[Google Drive] Gagal membaca folder:", err.message);
  }

  // 2. Uji Google Sheets (Menggunakan Sheet1 bawaan)
  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Membaca baris terakhir dari Sheet1
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A1:E5",
    });
    console.log("[Google Sheets] Berhasil membaca 'Sheet1'. Baris yang ada:");
    console.log(readRes.data.values);

    // Menulis baris uji coba sesuai format 5 kolom asli
    const now = new Date();
    const formattedDate = now.toISOString().replace("T", " ").substring(0, 19);
    const testRow = [
      formattedDate,
      "Uji Coba Sistem",
      "Selesai",
      1,
      "DSC_0747.JPG",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [testRow] },
    });
    console.log("[Google Sheets] Berhasil menambahkan 1 baris uji coba ke 'Sheet1'!");
  } catch (err) {
    console.error("[Google Sheets] Gagal mengakses spreadsheet:", err.message);
  }
}

testConnection();