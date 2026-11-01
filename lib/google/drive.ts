import { driveClient } from "./auth";
import type { drive_v3 } from "googleapis";

export interface DrivePhoto {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  width?: number;
  height?: number;
  isLandscape?: boolean;
}

export interface FolderParsedInfo {
  id: string;
  folderName: string;
  clientName: string;
  photoDate: string | null;
  maxPhotos: number;
}

/**
 * Mengekstrak Folder ID murni dari ID biasa atau link lengkap Google Drive
 * Contoh input yang didukung:
 * - "1f6pznHVQyktvflAPYQO5W-4CTCwqZykL"
 * - "https://drive.google.com/drive/folders/1f6pznHVQyktvflAPYQO5W-4CTCwqZykL"
 * - "https://drive.google.com/drive/u/0/folders/1f6pznHVQyktvflAPYQO5W-4CTCwqZykL?usp=sharing"
 */
export function extractFolderId(input?: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return trimmed.split("?")[0].split("&")[0].trim();
}

/**
 * Parsing nama folder Google Drive sesuai format:
 * > nama client, tanggal foto, kuota pemilihan foto
 * Mendukung pemisah: koma (,), tanda hubung ( - ), pipa (|), atau garis bawah (_)
 * Contoh nama folder:
 * - "Arya Pratama, 31 Oktober 2026, 15 Foto"
 * - "Budi & Siti - 28/10/2026 - 15"
 * - "Cindy Laura, 15 November 2026, 10"
 */
export function parseFolderInfo(rawFolderId: string, folderName: string): FolderParsedInfo {
  const folderId = extractFolderId(rawFolderId);
  let parts: string[] = [];

  // Utamakan pemisah koma (,) sesuai format permintaan: nama client, tanggal foto, kuota pemilihan foto
  if (folderName.includes(",")) {
    parts = folderName.split(",").map((p) => p.trim()).filter(Boolean);
  } else if (folderName.includes(" - ")) {
    parts = folderName.split(" - ").map((p) => p.trim()).filter(Boolean);
  } else if (folderName.includes("|")) {
    parts = folderName.split("|").map((p) => p.trim()).filter(Boolean);
  } else if (folderName.includes("_") && /\d+/.test(folderName)) {
    // Hanya split _ jika ada angka tanggal/kuota di nama folder
    parts = folderName.split("_").map((p) => p.trim()).filter(Boolean);
  } else {
    parts = [folderName.trim()];
  }

  let clientName = "Klien Fotonic";
  let photoDate: string | null = null;
  let maxPhotos = 15;

  const isDateLike = (str: string) => {
    return (
      /\d{1,4}/.test(str) ||
      /(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)/i.test(str)
    );
  };

  if (parts.length >= 3) {
    // Format: nama client, tanggal foto, kuota pemilihan foto
    clientName = parts[0] || "Klien Fotonic";
    photoDate = isDateLike(parts[1]) ? parts[1] : null;

    // Kuota pemilihan foto (ekstrak digit angka)
    const match = parts[2].match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed > 0 && parsed <= 50) {
        maxPhotos = parsed;
      }
    }
  } else if (parts.length === 2) {
    clientName = parts[0] || "Klien Fotonic";
    const quotaMatch = parts[1].match(/^\s*(\d+)\s*(foto)?$/i);
    if (quotaMatch) {
      maxPhotos = parseInt(quotaMatch[1], 10);
    } else if (isDateLike(parts[1])) {
      photoDate = parts[1];
    }
  } else if (parts.length === 1 && parts[0]) {
    const raw = parts[0].replace(/_/g, " ").trim();
    if (raw && !raw.toLowerCase().includes("foto client")) {
      clientName = raw;
    }
  }

  return {
    id: folderId,
    folderName,
    clientName,
    photoDate,
    maxPhotos,
  };
}

/**
 * Mengambil metadata folder Google Drive dan mem-parsing informasi klien
 */
export async function getFolderDetails(rawFolderId: string): Promise<FolderParsedInfo> {
  const folderId = extractFolderId(rawFolderId);
  try {
    const res = await driveClient.files.get({
      fileId: folderId,
      fields: "id, name",
    });
    const folderName = res.data.name || "Foto Client";
    return parseFolderInfo(folderId, folderName);
  } catch (error) {
    console.error("Gagal mengambil metadata folder:", error);
    return {
      id: folderId,
      folderName: "Foto Client",
      clientName: "Klien Fotonic",
      photoDate: null,
      maxPhotos: 15,
    };
  }
}

// Cache URL thumbnail Google Drive untuk akses cepat tanpa hit API ulang
export const driveThumbnailMap = new Map<string, string>();

// In-memory cache daftar foto per folder (TTL 2 menit untuk mencegah multi-request berulang saat loading awal)
interface CachedFolderPhotos {
  photos: DrivePhoto[];
  timestamp: number;
}
const folderPhotosCache = new Map<string, CachedFolderPhotos>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function getPhotosFromFolder(
  rawFolderId: string,
): Promise<DrivePhoto[]> {
  const folderId = extractFolderId(rawFolderId);

  // 1. Cek In-Memory Cache
  const cached = folderPhotosCache.get(folderId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.photos;
  }

  try {
    const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
    const response = await driveClient.files.list({
      q: query,
      fields: "files(id, name, mimeType, thumbnailLink, imageMediaMetadata(width, height, rotation))",
      pageSize: 500,
      orderBy: "name",
    });

    const files: drive_v3.Schema$File[] = response.data.files || [];
    const validPhotos: DrivePhoto[] = [];

    for (const file of files) {
      if (file.id && file.name && file.mimeType) {
        const meta = file.imageMediaMetadata;
        let width = meta?.width ?? undefined;
        let height = meta?.height ?? undefined;
        const rotation = meta?.rotation ?? 0;
        if (rotation === 90 || rotation === 270) {
          const temp = width;
          width = height;
          height = temp;
        }
        const isLandscape = width && height ? width > height : undefined;

        if (file.thumbnailLink) {
          driveThumbnailMap.set(file.id, file.thumbnailLink);
        }

        validPhotos.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink: file.thumbnailLink || undefined,
          width,
          height,
          isLandscape,
        });
      }
    }

    folderPhotosCache.set(folderId, {
      photos: validPhotos,
      timestamp: now,
    });

    return validPhotos;
  } catch (error) {
    console.error("Gagal mengambil daftar foto dari Drive:", error);
    throw new Error("Gagal membaca folder Google Drive.");
  }
}

export async function getBannerPhoto(
  rawParentFolderId: string,
): Promise<DrivePhoto | null> {
  const parentFolderId = extractFolderId(rawParentFolderId);
  try {
    const folderQuery = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = 'Cover' and trashed = false`;
    const folderRes = await driveClient.files.list({
      q: folderQuery,
      fields: "files(id, name)",
      pageSize: 1,
    });

    const coverFolder = folderRes.data.files?.[0];
    const targetFolderId = coverFolder?.id ? coverFolder.id : parentFolderId;

    const photos = await getPhotosFromFolder(targetFolderId);
    return photos.length > 0 ? photos[0] : null;
  } catch (error) {
    console.error("Gagal mendeteksi foto banner:", error);
    return null;
  }
}
