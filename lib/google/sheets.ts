import { sheetsClient } from "./auth";

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const EDITED_SHEET_NAME = "Edited";
let isEditedSheetVerified = false;

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

export interface EditedReviewSubmission {
  clientName: string;
  totalEditedPhotos: number;
  photoCommentsFormatted: string;
  overallNotes?: string;
  folderId: string;
  status?: "DRAF" | "TERKUNCI";
  sessionDate?: string | null;
}

export interface EditedReviewRecord {
  waktu: string;
  clientName: string;
  status: "DRAF" | "TERKUNCI";
  count: number;
  photoCommentsRaw: string;
  overallNotes: string;
  folderId: string;
  sessionDate?: string;
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
 * Mencatat riwayat seleksi (baik Simpan Sementara/DRAF maupun Kunci Pilihan/TERKUNCI) ke Google Sheets (Sheet1)
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
 * Mengambil rekaman seleksi paling terakhir untuk folder_id tertentu dari Google Sheets (Sheet1)
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

/**
 * Memastikan tab / sheet "Edited" sudah ada di dalam Google Spreadsheet.
 * Jika belum ada, otomatis membuat tab "Edited" beserta baris Header-nya.
 */
async function ensureEditedSheetExists(): Promise<void> {
  if (!spreadsheetId || isEditedSheetVerified) return;

  try {
    const meta = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    const sheets = meta.data.sheets || [];
    const exists = sheets.some(
      (s) => s.properties?.title?.trim().toLowerCase() === EDITED_SHEET_NAME.toLowerCase()
    );

    if (!exists) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: EDITED_SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      const headerRow = [
        "Waktu",
        "Nama Klien",
        "Status",
        "Jumlah Foto Edited",
        "Komentar Per Foto",
        "Catatan Umum",
        "Folder ID",
        "Tanggal Sesi",
      ];

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `${EDITED_SHEET_NAME}!A1:H1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headerRow],
        },
      });
    }

    isEditedSheetVerified = true;
  } catch (error) {
    console.warn("Gagal memeriksa/membuat tab Edited di Google Sheets:", error);
  }
}

/**
 * Mencatat hasil review & komentar foto editan ke tab "Edited" di Google Sheets
 */
export async function appendEditedReviewToSheet(
  submission: EditedReviewSubmission,
): Promise<void> {
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_ID belum dikonfigurasi.");
  }

  await ensureEditedSheetExists();

  const waktu = getWIBTimeString();
  const status = submission.status || "TERKUNCI";

  // Kolom A - H: Waktu, Nama Klien, Status, Jumlah Foto Edited, Komentar Per Foto, Catatan Umum, Folder ID, Tanggal Sesi
  const row = [
    waktu,
    submission.clientName,
    status,
    submission.totalEditedPhotos,
    submission.photoCommentsFormatted || "-",
    submission.overallNotes?.trim() ? submission.overallNotes.trim() : "-",
    submission.folderId || "-",
    submission.sessionDate || "-",
  ];

  try {
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: `${EDITED_SHEET_NAME}!A:H`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  } catch (error) {
    console.error("Gagal mencatat review foto editan ke Google Sheets:", error);
    throw new Error("Gagal menyimpan konfirmasi hasil editan ke spreadsheet.");
  }
}

/**
 * Mengambil rekaman review foto editan paling terakhir untuk folder_id tertentu dari tab "Edited"
 */
export async function getLatestEditedReviewFromSheet(
  folderId: string,
): Promise<EditedReviewRecord | null> {
  if (!spreadsheetId || !folderId) {
    return null;
  }

  try {
    await ensureEditedSheetExists();

    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${EDITED_SHEET_NAME}!A:H`,
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) {
      return null;
    }

    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rowFolderId = row[6] ? String(row[6]).trim() : "";
      const rowStatusRaw = row[2] ? String(row[2]).trim().toUpperCase() : "";

      if (rowFolderId && rowFolderId === folderId) {
        const rawStatus = rowStatusRaw === "DRAF" ? "DRAF" : "TERKUNCI";
        return {
          waktu: row[0] || "",
          clientName: row[1] || "",
          status: rawStatus,
          count: Number(row[3]) || 0,
          photoCommentsRaw: row[4] && row[4] !== "-" ? String(row[4]) : "",
          overallNotes: row[5] && row[5] !== "-" ? String(row[5]) : "",
          folderId: rowFolderId,
          sessionDate: row[7] && row[7] !== "-" ? String(row[7]) : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Gagal membaca riwayat review Edited dari Google Sheets:", error);
    return null;
  }
}
