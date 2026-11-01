import { NextRequest, NextResponse } from "next/server";
import { driveClient } from "@/lib/google/auth";
import { getBannerPhoto } from "@/lib/google/drive";

// Cache in-memory banner buffer (12 jam)
interface CachedBanner {
  buffer: ArrayBuffer;
  contentType: string;
  timestamp: number;
}
let bannerCache: CachedBanner | null = null;
let bannerCacheFolderId = "";
const BANNER_TTL = 12 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id") || process.env.BANNER_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json(
      { error: "Parameter folder_id belum ditentukan." },
      { status: 400 }
    );
  }

  // Cek cache
  if (
    bannerCache &&
    bannerCacheFolderId === folderId &&
    Date.now() - bannerCache.timestamp < BANNER_TTL
  ) {
    return new NextResponse(bannerCache.buffer, {
      headers: {
        "Content-Type": bannerCache.contentType,
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

    // Prioritaskan mengambil dari Google CDN thumbnailLink (=w1280) -> Ringan (~120KB) vs Asli (25MB!)
    if (bannerFile.thumbnailLink) {
      const bannerUrl = bannerFile.thumbnailLink.replace(/=s\d+$/, "=w1280");
      const res = await fetch(bannerUrl);
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || bannerFile.mimeType || "image/jpeg";

      bannerCache = {
        buffer,
        contentType,
        timestamp: Date.now(),
      };
      bannerCacheFolderId = folderId;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      });
    }

    // Fallback streaming media langsung jika thumbnailLink belum tersedia
    const res = await driveClient.files.get(
      { fileId: bannerFile.id, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = res.data as ArrayBuffer;
    const contentType = (res.headers["content-type"] as string) || "image/jpeg";

    bannerCache = {
      buffer,
      contentType,
      timestamp: Date.now(),
    };
    bannerCacheFolderId = folderId;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    console.error("Gagal memuat gambar banner:", error);
    return NextResponse.json(
      { error: "Gagal mengambil gambar banner dari Google Drive." },
      { status: 500 }
    );
  }
}
