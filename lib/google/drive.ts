import { driveClient } from "./auth";
import type { drive_v3 } from "googleapis";

/**
 * Folder induk resmi Fotonic di Google Drive.
 * Hanya folder/file yang berada di dalam direktori ini yang diizinkan diakses.
 */
export const ALLOWED_ROOT_FOLDER_ID = "1f6pznHVQyktvflAPYQO5W-4CTCwqZykL";

export class FolderNotAllowedError extends Error {
  status: number;
  constructor(
    message = "Akses ditolak: Link atau folder Google Drive tidak berada di dalam direktori resmi Fotonic.",
  ) {
    super(message);
    this.name = "FolderNotAllowedError";
    this.status = 403;
  }
}

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
  isExpired?: boolean;
  noEditedFolder?: boolean;
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

// Cache validasi direktori induk resmi & in-flight deduplication
interface CachedAllowedEntry {
  allowed: boolean;
  isFolder: boolean;
  timestamp: number;
}
const allowedDescendantCache = new Map<string, CachedAllowedEntry>();
const inFlightAllowedChecks = new Map<string, Promise<boolean>>();
const ALLOWED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

function setAllowedCacheEntry(id: string, allowed: boolean, isFolder: boolean) {
  if (allowedDescendantCache.size >= 5000) {
    const oldestKey = allowedDescendantCache.keys().next().value;
    if (oldestKey) allowedDescendantCache.delete(oldestKey);
  }
  allowedDescendantCache.set(id, {
    allowed,
    isFolder,
    timestamp: Date.now(),
  });
}

/**
 * Menandai ID item yang sudah dipastikan berasal dari folder tervalidasi
 * agar pemeriksaan thumbnail/subfolder berikutnya instan tanpa hit Drive API ulang.
 */
export function markAllowedDescendant(id: string, isFolder: boolean) {
  if (!id || id === ALLOWED_ROOT_FOLDER_ID) return;
  setAllowedCacheEntry(id, true, isFolder);
}

/**
 * Memverifikasi apakah ID Google Drive (folder atau file) berada di dalam
 * folder induk resmi Fotonic (`ALLOWED_ROOT_FOLDER_ID`).
 */
export async function isDriveItemInsideAllowedRoot(
  rawId: string,
  options?: { allowFile?: boolean },
): Promise<boolean> {
  const allowFile = Boolean(options?.allowFile);
  const targetId = extractFolderId(rawId);

  if (!targetId || !/^[a-zA-Z0-9_-]{10,128}$/.test(targetId)) {
    return false;
  }

  // Folder induk sendiri tidak boleh dibuka langsung sebagai folder klien
  if (targetId === ALLOWED_ROOT_FOLDER_ID) {
    return false;
  }

  const cached = allowedDescendantCache.get(targetId);
  if (cached && Date.now() - cached.timestamp < ALLOWED_CACHE_TTL_MS) {
    if (!cached.allowed) return false;
    return allowFile ? true : cached.isFolder;
  }

  const checkKey = `${allowFile ? "file" : "folder"}:${targetId}`;
  const existingCheck = inFlightAllowedChecks.get(checkKey);
  if (existingCheck) {
    return existingCheck;
  }

  const checkPromise = (async (): Promise<boolean> => {
    const MAX_DEPTH = 12;
    const visited = new Set<string>([targetId]);
    const queue: Array<{ id: string; depth: number }> = [{ id: targetId, depth: 0 }];
    const traversedFolders: string[] = [];
    let targetIsFolder = false;

    try {
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth > MAX_DEPTH) continue;

        let data: drive_v3.Schema$File | undefined;
        try {
          const res = await driveClient.files.get({
            fileId: current.id,
            fields: "id, mimeType, parents, trashed",
            supportsAllDrives: true,
          });
          data = res.data;
        } catch (err: any) {
          const status = err?.code || err?.status || err?.response?.status;
          // Jika target utama 404/403/400, cache penolakan
          if (current.depth === 0) {
            if (status === 400 || status === 403 || status === 404) {
              setAllowedCacheEntry(targetId, false, false);
            }
            return false;
          }
          continue;
        }

        if (!data || data.trashed) {
          if (current.depth === 0) {
            setAllowedCacheEntry(targetId, false, false);
            return false;
          }
          continue;
        }

        const isFolder = data.mimeType === "application/vnd.google-apps.folder";
        if (current.depth === 0) {
          targetIsFolder = isFolder;
          if (!allowFile && !isFolder) {
            setAllowedCacheEntry(targetId, false, false);
            return false;
          }
        } else if (isFolder) {
          traversedFolders.push(current.id);
        }

        const parents = data.parents || [];
        if (parents.includes(ALLOWED_ROOT_FOLDER_ID)) {
          setAllowedCacheEntry(targetId, true, targetIsFolder);
          for (const ancestorId of traversedFolders) {
            setAllowedCacheEntry(ancestorId, true, true);
          }
          return true;
        }

        for (const parentId of parents) {
          const parentCached = allowedDescendantCache.get(parentId);
          if (
            parentCached &&
            Date.now() - parentCached.timestamp < ALLOWED_CACHE_TTL_MS &&
            parentCached.allowed
          ) {
            setAllowedCacheEntry(targetId, true, targetIsFolder);
            for (const ancestorId of traversedFolders) {
              setAllowedCacheEntry(ancestorId, true, true);
            }
            return true;
          }

          if (
            parentId !== ALLOWED_ROOT_FOLDER_ID &&
            !visited.has(parentId) &&
            current.depth + 1 <= MAX_DEPTH
          ) {
            visited.add(parentId);
            queue.push({ id: parentId, depth: current.depth + 1 });
          }
        }
      }

      setAllowedCacheEntry(targetId, false, targetIsFolder);
      return false;
    } finally {
      inFlightAllowedChecks.delete(checkKey);
    }
  })();

  inFlightAllowedChecks.set(checkKey, checkPromise);
  return checkPromise;
}

/**
 * Memastikan folder ID berada di dalam direktori resmi Fotonic (`ALLOWED_ROOT_FOLDER_ID`).
 * Melempar `FolderNotAllowedError` (HTTP 403) jika di luar direktori yang diizinkan.
 */
export async function assertFolderAllowed(rawFolderId: string): Promise<string> {
  const folderId = extractFolderId(rawFolderId);

  if (!folderId || !/^[a-zA-Z0-9_-]{10,128}$/.test(folderId)) {
    throw new FolderNotAllowedError(
      "Link atau ID folder Google Drive tidak valid.",
    );
  }

  if (folderId === ALLOWED_ROOT_FOLDER_ID) {
    throw new FolderNotAllowedError(
      "Akses ditolak: Harap gunakan tautan folder klien yang berada di dalam direktori resmi Fotonic, bukan folder induknya.",
    );
  }

  const allowed = await isDriveItemInsideAllowedRoot(folderId, { allowFile: false });
  if (!allowed) {
    throw new FolderNotAllowedError();
  }

  return folderId;
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
  const folderId = await assertFolderAllowed(rawFolderId);
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

// Cache ID subfolder "Cover" dan "Edited" per parent folderId
const coverFolderCache = new Map<string, string | null>();
const editedFolderCache = new Map<string, string | null>();

// In-memory cache daftar foto per folder & deduplikasi request paralel
interface CachedFolderPhotos {
  photos: DrivePhotosResult;
  timestamp: number;
}
const folderPhotosCache = new Map<string, CachedFolderPhotos>();
const inFlightPhotosPromises = new Map<string, Promise<DrivePhotosResult>>();

/**
 * Memvalidasi kondisi apakah sesi foto klien berstatus expired (kedaluwarsa).
 *
 * Syarat Kondisi Expired:
 * 1. Di dalam folder tersebut TIDAK DITEMUKAN file foto aktif (mimeType gambar langsung di root).
 * 2. Terdapat sub-folder bernama persis "Expired" (case-insensitive) yang menandai sesi diarsipkan,
 *    atau HANYA ADA satu sub-folder bernama "Expired".
 */
export function check_is_expired(
  items: Array<{ name?: string | null; mimeType?: string | null }>
): boolean {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return false;
  }

  const isFolder = (item: { mimeType?: string | null }) =>
    item.mimeType === "application/vnd.google-apps.folder";

  const isImage = (item: { mimeType?: string | null }) =>
    Boolean(item.mimeType && item.mimeType.toLowerCase().startsWith("image/"));

  // Cari apakah ada sub-folder dengan nama "Expired" (case-insensitive)
  const hasExpiredFolder = items.some(
    (item) => isFolder(item) && item.name?.trim().toLowerCase() === "expired"
  );

  if (!hasExpiredFolder) {
    return false;
  }

  // Cek apakah ada file foto aktif langsung di root folder
  const activePhotos = items.filter((item) => isImage(item));

  // Jika tidak ditemukan file foto aktif di level ini
  if (activePhotos.length === 0) {
    return true;
  }

  return false;
}

export async function getPhotosFromFolder(
  rawFolderId: string,
): Promise<DrivePhotosResult> {
  const folderId = await assertFolderAllowed(rawFolderId);

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
      // 1. Ambil seluruh item langsung di dalam folder (membaca mimeType apakah folder atau gambar)
      const directItemsRes = await driveClient.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, thumbnailLink, imageMediaMetadata(width, height, rotation))",
        pageSize: 1000,
        orderBy: "name",
      });

      const allItems = directItemsRes.data.files || [];

      // 2. Evaluasi Kondisi Expired Sesi Klien
      const isExpired = check_is_expired(allItems);
      if (isExpired) {
        const expiredResult: DrivePhotosResult = [];
        expiredResult.isExpired = true;
        expiredResult.hasSubfolders = false;
        expiredResult.sections = [];

        folderPhotosCache.set(folderId, {
          photos: expiredResult,
          timestamp: Date.now(),
        });

        return expiredResult;
      }

      // 3. Pisahkan sub-folder dan file foto root aktif
      const allSubfolders = allItems.filter(
        (f) => f.mimeType === "application/vnd.google-apps.folder"
      );
      for (const sf of allSubfolders) {
        if (sf.id) markAllowedDescendant(sf.id, true);
      }

      const rootFiles = allItems.filter(
        (f) => f.mimeType && f.mimeType.toLowerCase().startsWith("image/")
      );

      // Simpan informasi folder Cover & Edited ke cache
      const coverFolder = allSubfolders.find(
        (f) => f.name && f.name.trim().toLowerCase() === "cover"
      );
      coverFolderCache.set(folderId, coverFolder?.id || null);

      const editedFolder = allSubfolders.find(
        (f) => f.name && f.name.trim().toLowerCase() === "edited"
      );
      editedFolderCache.set(folderId, editedFolder?.id || null);

      // Filter dan abaikan folder "Cover", "Edited", dan "Expired" (case-insensitive) untuk ditampilkan di galeri utama
      const gallerySubfolders = allSubfolders.filter((f) => {
        if (!f.name) return false;
        const lower = f.name.trim().toLowerCase();
        return lower !== "cover" && lower !== "edited" && lower !== "expired";
      });

      const helperParseFile = (
        file: drive_v3.Schema$File,
        fId?: string,
        fName?: string
      ): DrivePhoto | null => {
        if (!file.id || !file.name || !file.mimeType) return null;
        markAllowedDescendant(file.id, false);
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
      if (error instanceof FolderNotAllowedError) throw error;
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
  const parentFolderId = await assertFolderAllowed(rawParentFolderId);
  try {
    let coverId = coverFolderCache.get(parentFolderId);

    // Jika belum ada di cache, cek melalui getPhotosFromFolder (yang juga sekaligus mengisi cache galeri)
    if (coverId === undefined) {
      await getPhotosFromFolder(parentFolderId);
      coverId = coverFolderCache.get(parentFolderId) ?? null;
    }

    const targetFolderId = coverId ? coverId : parentFolderId;
    const photos = await getPhotosFromFolder(targetFolderId);
    if (photos.length > 0) return photos[0];

    const editedId = editedFolderCache.get(parentFolderId);
    if (editedId) {
      const editedPhotos = await getPhotosFromFolder(editedId);
      if (editedPhotos.length > 0) return editedPhotos[0];
    }
    return null;
  } catch (error) {
    if (error instanceof FolderNotAllowedError) throw error;
    console.error("Gagal mendeteksi foto banner:", error);
    return null;
  }
}

/**
 * Mengambil foto-foto khusus dari subfolder "Edited" di dalam folder utama klien
 */
export async function getEditedPhotosFromFolder(
  rawParentFolderId: string,
): Promise<DrivePhotosResult> {
  const parentFolderId = await assertFolderAllowed(rawParentFolderId);

  try {
    let editedId = editedFolderCache.get(parentFolderId);

    if (editedId === undefined) {
      const subRes = await driveClient.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        pageSize: 100,
      });
      const folders = subRes.data.files || [];
      const editedFolder = folders.find(
        (f) => f.name && f.name.trim().toLowerCase() === "edited"
      );
      editedId = editedFolder?.id || null;
      editedFolderCache.set(parentFolderId, editedId);
    }

    if (!editedId) {
      const emptyResult: DrivePhotosResult = [];
      emptyResult.noEditedFolder = true;
      emptyResult.hasSubfolders = false;
      emptyResult.sections = [];
      return emptyResult;
    }

    markAllowedDescendant(editedId, true);
    return await getPhotosFromFolder(editedId);
  } catch (error) {
    if (error instanceof FolderNotAllowedError) throw error;
    console.error("Gagal mengambil daftar foto dari subfolder Edited:", error);
    throw new Error("Gagal membaca folder Edited di Google Drive.");
  }
}
