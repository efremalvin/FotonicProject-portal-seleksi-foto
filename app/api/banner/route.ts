import { NextRequest, NextResponse } from "next/server";
import { driveClient } from "@/lib/google/auth";
import {
  getBannerPhoto,
  extractFolderId,
  assertFolderAllowed,
  FolderNotAllowedError,
} from "@/lib/google/drive";

// Cache in-memory banner buffer per folderId (12 jam)
interface CachedBanner {
  buffer: ArrayBuffer;
  contentType: string;
  timestamp: number;
}
const bannerCacheMap = new Map<string, CachedBanner>();
const BANNER_TTL = 12 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawFolderId = searchParams.get("folder_id") || process.env.BANNER_FOLDER_ID;
  const folderId = extractFolderId(rawFolderId);

  if (!folderId) {
    return NextResponse.json(
      { error: "Parameter folder_id belum ditentukan." },
      { status: 400 }
    );
  }

  try {
    await assertFolderAllowed(folderId);
  } catch (error: any) {
    if (error instanceof FolderNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Gagal memvalidasi folder Google Drive." },
      { status: 500 }
    );
  }

  // Cek cache per folderId
  const cached = bannerCacheMap.get(folderId);
  if (cached && Date.now() - cached.timestamp < BANNER_TTL) {
    return new NextResponse(cached.buffer, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  }

  try {
    const bannerFile = await getBannerPhoto(folderId);

    if (!bannerFile) {
      return NextResponse.json(
        { error: "Foto banner tidak ditemukan di folder Cover maupun folder utama." },
        { status: 404 }
      );
    }

    // Prioritaskan mengambil dari Google CDN thumbnailLink (=w1080) -> Ringan (~90KB) vs Asli (25MB!)
    if (bannerFile.thumbnailLink) {
      const bannerUrl = bannerFile.thumbnailLink.replace(/=s\d+$/, "=w1080");
      const res = await fetch(bannerUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || bannerFile.mimeType || "image/jpeg";

        if (bannerCacheMap.size >= 30) {
          const oldestKey = bannerCacheMap.keys().next().value;
          if (oldestKey) bannerCacheMap.delete(oldestKey);
        }
        bannerCacheMap.set(folderId, {
          buffer,
          contentType,
          timestamp: Date.now(),
        });

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
          },
        });
      }
    }

    // Fallback streaming media langsung jika thumbnailLink belum tersedia
    const res = await driveClient.files.get(
      { fileId: bannerFile.id, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = res.data as ArrayBuffer;
    const contentType = (res.headers["content-type"] as string) || "image/jpeg";

    bannerCacheMap.set(folderId, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    if (error instanceof FolderNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Gagal memuat gambar banner:", error);
    return NextResponse.json(
      { error: "Gagal mengambil gambar banner dari Google Drive." },
      { status: 500 }
    );
  }
}
