/**
 * Helper untuk menggabungkan dan memisahkan catatan khusus per foto dengan catatan umum
 */

export interface FormattedNotesResult {
  combinedNotes: string;
}

export function formatCombinedNotes(
  overallNotes: string,
  photoNotes: Record<string, string>,
  photos: Array<{ id: string; name: string }>,
): string {
  const photoMap = new Map(photos.map((p) => [p.id, p.name]));
  const photoEntries = Object.entries(photoNotes)
    .map(([id, note]) => ({
      name: photoMap.get(id) || id,
      note: (note || "").trim(),
    }))
    .filter((item) => item.note.length > 0);

  if (photoEntries.length === 0) {
    return overallNotes.trim();
  }

  let result = "[CATATAN KHUSUS PER FOTO]\n";
  for (const item of photoEntries) {
    result += `• ${item.name}: ${item.note}\n`;
  }

  if (overallNotes.trim()) {
    result += `\n[CATATAN UMUM / KESELURUHAN]\n${overallNotes.trim()}`;
  }

  return result.trim();
}

/**
 * Memisahkan kembali string catatan gabungan dari spreadsheet ke dalam photoNotes dan overallNotes
 */
export function parseCombinedNotes(
  rawCombined: string,
  photos: Array<{ id: string; name: string }>,
): {
  overallNotes: string;
  photoNotes: Record<string, string>;
} {
  const nameToIdMap = new Map(photos.map((p) => [p.name.toLowerCase().trim(), p.id]));
  const photoNotes: Record<string, string> = {};
  let overallNotes = "";

  if (!rawCombined || rawCombined === "-") {
    return { overallNotes: "", photoNotes: {} };
  }

  if (!rawCombined.includes("[CATATAN KHUSUS PER FOTO]")) {
    return { overallNotes: rawCombined.trim(), photoNotes: {} };
  }

  const parts = rawCombined.split("[CATATAN UMUM / KESELURUHAN]");
  const specialSection = parts[0] || "";
  if (parts.length > 1) {
    overallNotes = parts[1].trim();
  }

  // Parse baris-baris "• nama_file: catatan"
  const lines = specialSection.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      const content = trimmed.substring(1).trim();
      const colonIdx = content.indexOf(":");
      if (colonIdx > 0) {
        const fileName = content.substring(0, colonIdx).trim().toLowerCase();
        const noteText = content.substring(colonIdx + 1).trim();
        const matchedId = nameToIdMap.get(fileName);
        if (matchedId) {
          photoNotes[matchedId] = noteText;
        }
      }
    }
  }

  return { overallNotes, photoNotes };
}

/**
 * Memformat komentar khusus per foto untuk kolom "Komentar Per Foto" pada tab Edited
 */
export function formatPhotoCommentsOnly(
  photoNotes: Record<string, string>,
  photos: Array<{ id: string; name: string }>,
): string {
  const photoMap = new Map(photos.map((p) => [p.id, p.name]));
  const photoEntries = Object.entries(photoNotes)
    .map(([id, note]) => ({
      name: photoMap.get(id) || id,
      note: (note || "").trim(),
    }))
    .filter((item) => item.note.length > 0);

  if (photoEntries.length === 0) {
    return "-";
  }

  return photoEntries.map((item) => `• ${item.name}: ${item.note}`).join("\n");
}

/**
 * Mem-parsing string dari kolom "Komentar Per Foto" pada tab Edited kembali menjadi Record<photoId, comment>
 */
export function parsePhotoCommentsOnly(
  rawComments: string,
  photos: Array<{ id: string; name: string }>,
): Record<string, string> {
  const nameToIdMap = new Map(photos.map((p) => [p.name.toLowerCase().trim(), p.id]));
  const photoNotes: Record<string, string> = {};

  if (!rawComments || rawComments === "-") {
    return photoNotes;
  }

  const lines = rawComments.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cleanLine =
      trimmed.startsWith("•") || trimmed.startsWith("-")
        ? trimmed.substring(1).trim()
        : trimmed;
    const colonIdx = cleanLine.indexOf(":");
    if (colonIdx > 0) {
      const fileName = cleanLine.substring(0, colonIdx).trim().toLowerCase();
      const noteText = cleanLine.substring(colonIdx + 1).trim();
      const matchedId = nameToIdMap.get(fileName);
      if (matchedId && noteText) {
        photoNotes[matchedId] = noteText;
      }
    }
  }

  return photoNotes;
}
