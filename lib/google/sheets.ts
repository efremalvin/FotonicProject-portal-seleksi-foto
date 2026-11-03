import { sheetsClient } from "./auth";

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

export interface SelectionSubmission {
  clientName: string;
  selectedFileNames: string[];
  notes?: string;
  folderId?: string;
  status?: "DRAF" | "TERKUNCI";
  sessionDate?: string | null;
  quota?: number | string | null;
}

export interface SelectionRecord {
  waktu: string;
  clientName: string;
  status: "DRAF" | "TERKUNCI";
  count: number;
  selectedFileNames: string[];
  notes: string;
  folderId: string;
  sessionDate?: string;
  quota?: number;
}

/**
 * Menghasilkan string waktu dalam Waktu Indonesia Barat (WIB, UTC+7)
 * Contoh format: "YYYY-MM-DD HH:mm:ss WIB"
 */
function getWIBTimeString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }

  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} WIB`;
}

/**
 * Mencatat riwayat seleksi (baik Simpan Sementara/DRAF maupun Kunci Pilihan/TERKUNCI) ke Google Sheets
 */
export async function appendSelectionToSheet(
  submission: SelectionSubmission,
): Promise<void> {
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_ID belum dikonfigurasi.");
  }

  const waktu = getWIBTimeString();

  const daftarFileStr = submission.selectedFileNames.sort().join(",\n");
  const status = submission.status || "TERKUNCI";

  // Kolom A - I: Waktu, Nama Klien, Status, Jumlah Foto, Daftar File, Catatan, Folder ID, Tanggal Sesi, Kuota Foto
  const row = [
    waktu,
    submission.clientName,
    status,
    submission.selectedFileNames.length,
    daftarFileStr,
    submission.notes || "-",
    submission.folderId || "-",
    submission.sessionDate || "-",
    submission.quota !== undefined && submission.quota !== null ? submission.quota : "-",
  ];

  try {
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  } catch (error) {
    console.error("Gagal mencatat seleksi ke Google Sheets:", error);
    throw new Error("Gagal menyimpan hasil seleksi ke spreadsheet.");
  }
}

/**
 * Mengambil rekaman seleksi paling terakhir untuk folder_id tertentu dari Google Sheets
 */
export async function getLatestSelectionFromSheet(
  folderId: string,
): Promise<SelectionRecord | null> {
  if (!spreadsheetId || !folderId) {
    return null;
  }

  try {
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) {
      return null;
    }

    // Cari dari baris paling akhir (terbaru) ke atas
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rowFolderId = row[6] ? String(row[6]).trim() : "";
      const rowStatusRaw = row[2] ? String(row[2]).trim().toUpperCase() : "";

      // Cocokkan berdasarkan folderId
      if (rowFolderId && rowFolderId === folderId) {
        const rawStatus = rowStatusRaw === "DRAF" ? "DRAF" : "TERKUNCI";
        const fileNamesRaw = row[4] ? String(row[4]) : "";
        const files = fileNamesRaw
          .split(/[\r\n,]+/)
          .map((f) => f.trim())
          .filter(Boolean);

        return {
          waktu: row[0] || "",
          clientName: row[1] || "",
          status: rawStatus,
          count: Number(row[3]) || files.length,
          selectedFileNames: files,
          notes: row[5] && row[5] !== "-" ? String(row[5]) : "",
          folderId: rowFolderId,
          sessionDate: row[7] && row[7] !== "-" ? String(row[7]) : undefined,
          quota: row[8] && row[8] !== "-" ? Number(row[8]) || undefined : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Gagal membaca riwayat seleksi dari Google Sheets:", error);
    return null;
  }
}
