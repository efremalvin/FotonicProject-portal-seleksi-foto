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
  folderId?: string;
  folderName?: string;
}

export interface FolderSection {
  id: string;
  title: string;
  count: number;
}

export type DrivePhotosResult = DrivePhoto[] & {
  hasSubfolders?: boolean;
  sections?: FolderSection[];
};

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

// Cache metadata folder & in-flight deduplication
interface CachedFolderDetails {
  info: FolderParsedInfo;
  timestamp: number;
}
const folderDetailsCache = new Map<string, CachedFolderDetails>();
const inFlightFolderDetails = new Map<string, Promise<FolderParsedInfo>>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 menit

/**
 * Mengambil metadata folder Google Drive dan mem-parsing informasi klien
 */
export async function getFolderDetails(rawFolderId: string): Promise<FolderParsedInfo> {
  const folderId = extractFolderId(rawFolderId);
  const now = Date.now();
  const cached = folderDetailsCache.get(folderId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.info;
  }

  const existingPromise = inFlightFolderDetails.get(folderId);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    try {
      const res = await driveClient.files.get({
        fileId: folderId,
        fields: "id, name",
      });
      const folderName = res.data.name || "Foto Client";
      const parsed = parseFolderInfo(folderId, folderName);
      folderDetailsCache.set(folderId, { info: parsed, timestamp: Date.now() });
      return parsed;
    } catch (error) {
      console.error("Gagal mengambil metadata folder:", error);
      return {
        id: folderId,
        folderName: "Foto Client",
        clientName: "Klien Fotonic",
        photoDate: null,
        maxPhotos: 15,
      };
    } finally {
      inFlightFolderDetails.delete(folderId);
    }
  })();

  inFlightFolderDetails.set(folderId, promise);
  return promise;
}

// Cache URL thumbnail Google Drive untuk akses cepat tanpa hit API ulang
export const driveThumbnailMap = new Map<string, string>();

// Cache ID subfolder "Cover" per parent folderId agar getBannerPhoto instan
const coverFolderCache = new Map<string, string | null>();

// In-memory cache daftar foto per folder & deduplikasi request paralel
interface CachedFolderPhotos {
  photos: DrivePhotosResult;
  timestamp: number;
}
const folderPhotosCache = new Map<string, CachedFolderPhotos>();
const inFlightPhotosPromises = new Map<string, Promise<DrivePhotosResult>>();

export async function getPhotosFromFolder(
  rawFolderId: string,
): Promise<DrivePhotosResult> {
  const folderId = extractFolderId(rawFolderId);

  // 1. Cek In-Memory Cache
  const cached = folderPhotosCache.get(folderId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.photos;
  }

  // 2. Deduplikasi jika request untuk folder yang sama sedang berjalan paralel
  const inFlight = inFlightPhotosPromises.get(folderId);
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async (): Promise<DrivePhotosResult> => {
    try {
      // Jalankan query subfolder & foto root secara PARALEL (menghemat 1 round-trip penuh ke Google Drive API)
      const [subfolderRes, rootImagesRes] = await Promise.all([
        driveClient.files.list({
          q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: "files(id, name)",
          pageSize: 100,
          orderBy: "name",
        }),
        driveClient.files.list({
          q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: "files(id, name, mimeType, thumbnailLink, imageMediaMetadata(width, height, rotation))",
          pageSize: 500,
          orderBy: "name",
        }),
      ]);

      const allSubfolders = subfolderRes.data.files || [];
      const rootFiles = rootImagesRes.data.files || [];

      // Simpan informasi folder Cover ke cache agar /api/banner tidak perlu query ulang
      const coverFolder = allSubfolders.find(
        (f) => f.name && f.name.trim().toLowerCase() === "cover"
      );
      coverFolderCache.set(folderId, coverFolder?.id || null);

      // Filter dan abaikan folder "Cover" (case-insensitive) untuk ditampilkan di galeri
      const gallerySubfolders = allSubfolders.filter(
        (f) => f.name && f.name.trim().toLowerCase() !== "cover"
      );

      const helperParseFile = (
        file: drive_v3.Schema$File,
        fId?: string,
        fName?: string
      ): DrivePhoto | null => {
        if (!file.id || !file.name || !file.mimeType) return null;
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

        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink: file.thumbnailLink || undefined,
          width,
          height,
          isLandscape,
          folderId: fId,
          folderName: fName,
        };
      };

      let validPhotos: DrivePhotosResult;

      if (gallerySubfolders.length === 0) {
        // ========================================================
        // KONDISI A: TIDAK ADA SUBFOLDER (Langsung gunakan hasil rootFiles yang sudah diambil paralel)
        // ========================================================
        const photos: DrivePhoto[] = [];
        for (const file of rootFiles) {
          const parsed = helperParseFile(file);
          if (parsed) photos.push(parsed);
        }

        validPhotos = photos as DrivePhotosResult;
        validPhotos.hasSubfolders = false;
        validPhotos.sections = [];
      } else {
        // ========================================================
        // KONDISI B: ADA SUBFOLDER (Tampilkan masing-masing folder menjadi section)
        // ========================================================
        const sections: FolderSection[] = [];
        const allPhotos: DrivePhoto[] = [];

        // Query foto di dalam masing-masing subfolder secara paralel
        const subResults = await Promise.all(
          gallerySubfolders.map(async (sf) => {
            if (!sf.id || !sf.name) return { folder: sf, photos: [] };
            const query = `'${sf.id}' in parents and mimeType contains 'image/' and trashed = false`;
            const res = await driveClient.files.list({
              q: query,
              fields: "files(id, name, mimeType, thumbnailLink, imageMediaMetadata(width, height, rotation))",
              pageSize: 500,
              orderBy: "name",
            });
            const files = res.data.files || [];
            const photos: DrivePhoto[] = [];
            for (const file of files) {
              const parsed = helperParseFile(file, sf.id, sf.name);
              if (parsed) photos.push(parsed);
            }
            return { folder: sf, photos };
          })
        );

        for (const res of subResults) {
          if (res.photos.length > 0) {
            sections.push({
              id: res.folder.id!,
              title: res.folder.name!,
              count: res.photos.length,
            });
            allPhotos.push(...res.photos);
          }
        }

        // Gunakan foto root yang sudah diambil paralel di awal
        if (rootFiles.length > 0) {
          const rootPhotos: DrivePhoto[] = [];
          for (const file of rootFiles) {
            const parsed = helperParseFile(file, folderId, "Foto Utama");
            if (parsed) rootPhotos.push(parsed);
          }
          if (rootPhotos.length > 0) {
            sections.unshift({
              id: folderId,
              title: "Foto Utama",
              count: rootPhotos.length,
            });
            allPhotos.unshift(...rootPhotos);
          }
        }

        validPhotos = allPhotos as DrivePhotosResult;
        validPhotos.hasSubfolders = true;
        validPhotos.sections = sections;
      }

      folderPhotosCache.set(folderId, {
        photos: validPhotos,
        timestamp: Date.now(),
      });

      return validPhotos;
    } catch (error) {
      console.error("Gagal mengambil daftar foto dari Drive:", error);
      throw new Error("Gagal membaca folder Google Drive.");
    } finally {
      inFlightPhotosPromises.delete(folderId);
    }
  })();

  inFlightPhotosPromises.set(folderId, fetchPromise);
  return fetchPromise;
}

export async function getBannerPhoto(
  rawParentFolderId: string,
): Promise<DrivePhoto | null> {
  const parentFolderId = extractFolderId(rawParentFolderId);
  try {
    let coverId = coverFolderCache.get(parentFolderId);

    // Jika belum ada di cache, cek melalui getPhotosFromFolder (yang juga sekaligus mengisi cache galeri)
    if (coverId === undefined) {
      await getPhotosFromFolder(parentFolderId);
      coverId = coverFolderCache.get(parentFolderId) ?? null;
    }

    const targetFolderId = coverId ? coverId : parentFolderId;
    const photos = await getPhotosFromFolder(targetFolderId);
    return photos.length > 0 ? photos[0] : null;
  } catch (error) {
    console.error("Gagal mendeteksi foto banner:", error);
    return null;
  }
}
