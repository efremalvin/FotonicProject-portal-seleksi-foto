import { sheetsClient } from "./auth";

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const SELECTION_SHEET_NAME = "Sheet1";
const EDITED_SHEET_NAME = "Edited";
const EXPIRED_SHEET_NAME = "Expired";
let isEditedSheetVerified = false;
let isExpiredSheetVerified = false;

export type PageExpiredMode = "selection" | "edited";

export interface SheetExpiredResult {
  isExpired: boolean;
  expiredDate?: string | null;
  pageType?: string;
}

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

function extractDriveIdSimple(input?: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return trimmed.split("?")[0].split("&")[0].trim();
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
 * Mengevaluasi isi sel status/tanggal kedaluwarsa di tab "Expired".
 * Mendukung:
 * - Kata kunci manual: "EXPIRED", "YA", "YES", "TRUE", "TUTUP", "CLOSED"
 * - Kata kunci aktif: "-", "", "AKTIF", "NO", "FALSE", "BUKA", "OPEN"
 * - Tanggal batas waktu (WIB): "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", atau dengan jam "YYYY-MM-DD HH:mm"
 */
export function evaluateExpiredCellValue(rawValue?: string | null): {
  isExpired: boolean;
  expiredDate?: string | null;
} {
  const value = (rawValue || "").trim();
  if (!value || value === "-") {
    return { isExpired: false };
  }

  const upper = value.toUpperCase();
  if (
    upper === "EXPIRED" ||
    upper === "YA" ||
    upper === "YES" ||
    upper === "TRUE" ||
    upper === "TUTUP" ||
    upper === "CLOSED" ||
    upper === "1"
  ) {
    return { isExpired: true };
  }

  if (
    upper === "AKTIF" ||
    upper === "ACTIVE" ||
    upper === "NO" ||
    upper === "TIDAK" ||
    upper === "FALSE" ||
    upper === "BUKA" ||
    upper === "OPEN" ||
    upper === "0"
  ) {
    return { isExpired: false };
  }

  // Format YYYY-MM-DD atau YYYY/MM/DD (opsional jam HH:mm)
  const isoMatch = value.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const hour = isoMatch[4] !== undefined ? Number(isoMatch[4]) : 23;
    const minute = isoMatch[5] !== undefined ? Number(isoMatch[5]) : 59;
    const second = isoMatch[4] !== undefined ? 0 : 59;

    const utcMs = Date.UTC(year, month - 1, day, hour - 7, minute, second);
    if (!Number.isNaN(utcMs)) {
      const formatted = `${String(year).padStart(4, "0")}-${String(month).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}${
        isoMatch[4] !== undefined
          ? ` ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`
          : ""
      }`;
      return {
        isExpired: Date.now() > utcMs,
        expiredDate: formatted,
      };
    }
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY (opsional jam HH:mm)
  const dmyMatch = value.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const hour = dmyMatch[4] !== undefined ? Number(dmyMatch[4]) : 23;
    const minute = dmyMatch[5] !== undefined ? Number(dmyMatch[5]) : 59;
    const second = dmyMatch[4] !== undefined ? 0 : 59;

    const utcMs = Date.UTC(year, month - 1, day, hour - 7, minute, second);
    if (!Number.isNaN(utcMs)) {
      const formatted = `${String(day).padStart(2, "0")}/${String(month).padStart(
        2,
        "0"
      )}/${year}${
        dmyMatch[4] !== undefined
          ? ` ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`
          : ""
      }`;
      return {
        isExpired: Date.now() > utcMs,
        expiredDate: formatted,
      };
    }
  }

  return { isExpired: false };
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
      range: `${SELECTION_SHEET_NAME}!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    if (submission.folderId) {
      await ensureExpiredRowRegistered(submission.clientName, submission.folderId, "Seleksi");
    }
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
      range: `${SELECTION_SHEET_NAME}!A:I`,
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

    if (submission.folderId) {
      await ensureExpiredRowRegistered(submission.clientName, submission.folderId, "Edited");
    }
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

/**
 * Memastikan tab khusus "Expired" tersedia di Google Spreadsheet beserta seluruh kolom verifikasinya:
 * A: Nama Klien | B: Folder ID | C: Tipe Page | D: Status Expired | E: Tanggal Expired | F: Catatan
 */
async function ensureExpiredSheetExists(): Promise<void> {
  if (!spreadsheetId || isExpiredSheetVerified) return;

  try {
    const meta = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    const sheets = meta.data.sheets || [];
    const exists = sheets.some(
      (s) => s.properties?.title?.trim().toLowerCase() === EXPIRED_SHEET_NAME.toLowerCase()
    );

    if (!exists) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: EXPIRED_SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      const headerRow = [
        "Nama Klien",
        "Folder ID",
        "Tipe Page",
        "Status Expired",
        "Tanggal Expired",
        "Catatan",
      ];

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `${EXPIRED_SHEET_NAME}!A1:F1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headerRow],
        },
      });
    }

    isExpiredSheetVerified = true;
  } catch (error) {
    console.warn("Gagal memeriksa/membuat tab Expired di Google Sheets:", error);
  }
}

/**
 * Mendaftarkan baris klien ke tab "Expired" secara otomatis (hanya jika pasangan Folder ID + Tipe Page belum ada)
 * agar admin tidak perlu menyalin Folder ID secara manual.
 */
async function ensureExpiredRowRegistered(
  clientName: string,
  folderId: string,
  pageLabel: "Seleksi" | "Edited",
): Promise<void> {
  if (!spreadsheetId || !folderId) return;

  try {
    await ensureExpiredSheetExists();

    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${EXPIRED_SHEET_NAME}!A:F`,
    });

    const rows = res.data.values || [];
    const normalizedTargetId = extractDriveIdSimple(folderId);
    const targetMode: PageExpiredMode = pageLabel === "Edited" ? "edited" : "selection";

    const alreadyExists = rows.slice(1).some((row) => {
      const rowFolderId = extractDriveIdSimple(row?.[1] ? String(row[1]) : "");
      if (!rowFolderId || rowFolderId !== normalizedTargetId) return false;

      const rawPage = row?.[2] ? String(row[2]).trim().toLowerCase() : "";
      if (!rawPage || rawPage === "-" || rawPage === "semua" || rawPage === "all") return true;
      if (targetMode === "edited" && rawPage.includes("edit")) return true;
      if (targetMode === "selection" && (rawPage.includes("seleksi") || rawPage.includes("select"))) {
        return true;
      }
      return false;
    });

    if (!alreadyExists) {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: `${EXPIRED_SHEET_NAME}!A:F`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[clientName || "Klien Fotonic", normalizedTargetId, pageLabel, "AKTIF", "-", "-"]],
        },
      });
    }
  } catch (error) {
    console.warn("Gagal mendaftarkan baris ke tab Expired:", error);
  }
}

function doesRowMatchPageMode(rawPageType: string, pageMode: PageExpiredMode): boolean {
  const lower = rawPageType.trim().toLowerCase();
  if (!lower || lower === "-" || lower === "semua" || lower === "all") {
    return true;
  }
  const isEditedRow = lower.includes("edit");
  const isSelectionRow =
    lower.includes("seleksi") || lower.includes("select") || lower.includes("utama");

  if (pageMode === "edited") {
    return isEditedRow || !isSelectionRow;
  }
  return isSelectionRow || !isEditedRow;
}

/**
 * Memverifikasi status Expired & tanggal batas waktu dari tab khusus "Expired"
 * berdasarkan `folderId` dan `pageMode` ("selection" untuk /, "edited" untuk /edited).
 */
export async function checkSheetExpiredStatus(
  folderId: string,
  pageMode: PageExpiredMode,
): Promise<SheetExpiredResult> {
  if (!spreadsheetId || !folderId) {
    return { isExpired: false };
  }

  try {
    await ensureExpiredSheetExists();

    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${EXPIRED_SHEET_NAME}!A:F`,
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) {
      return { isExpired: false };
    }

    const headers = rows[0].map((h) => String(h || "").trim().toLowerCase());
    const folderColIdx = headers.findIndex((h) => h.includes("folder"));
    const pageTypeColIdx = headers.findIndex(
      (h) => h.includes("tipe") || h.includes("page") || h.includes("menu")
    );
    const statusColIdx = headers.findIndex(
      (h) => h.includes("status") || h === "expired"
    );
    const dateColIdx = headers.findIndex(
      (h) => h.includes("tanggal") || h.includes("date") || h.includes("batas")
    );

    const colFolder = folderColIdx >= 0 ? folderColIdx : 1;
    const colPageType = pageTypeColIdx >= 0 ? pageTypeColIdx : 2;
    const colStatus = statusColIdx >= 0 ? statusColIdx : 3;
    const colDate = dateColIdx >= 0 ? dateColIdx : 4;

    const normalizedTargetId = extractDriveIdSimple(folderId);

    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rowFolderId = extractDriveIdSimple(row[colFolder] ? String(row[colFolder]) : "");
      if (!rowFolderId || rowFolderId !== normalizedTargetId) continue;

      const rawPageType = row[colPageType] ? String(row[colPageType]).trim() : "";
      if (!doesRowMatchPageMode(rawPageType, pageMode)) continue;

      const rawStatus = row[colStatus] ? String(row[colStatus]).trim() : "";
      const rawDate = row[colDate] ? String(row[colDate]).trim() : "";

      const statusEval = evaluateExpiredCellValue(rawStatus);
      const dateEval = evaluateExpiredCellValue(rawDate);

      if (statusEval.isExpired) {
        return {
          isExpired: true,
          expiredDate: dateEval.expiredDate || statusEval.expiredDate || null,
          pageType: rawPageType || EXPIRED_SHEET_NAME,
        };
      }

      if (rawDate && rawDate !== "-") {
        return {
          isExpired: dateEval.isExpired,
          expiredDate: dateEval.expiredDate || rawDate,
          pageType: rawPageType || EXPIRED_SHEET_NAME,
        };
      }

      return {
        isExpired: false,
        expiredDate: null,
        pageType: rawPageType || EXPIRED_SHEET_NAME,
      };
    }

    return { isExpired: false };
  } catch (error) {
    console.warn(`Gagal memverifikasi status Expired di tab "${EXPIRED_SHEET_NAME}":`, error);
    return { isExpired: false };
  }
}
