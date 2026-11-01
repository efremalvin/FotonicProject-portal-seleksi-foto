import { NextRequest, NextResponse } from "next/server";
import { driveClient } from "@/lib/google/auth";
import { driveThumbnailMap } from "@/lib/google/drive";

// In-memory buffer cache untuk thumbnail galeri (sangat cepat, 1ms tanpa hit Google Drive berulang)
interface CachedThumbnail {
  buffer: ArrayBuffer;
  contentType: string;
  timestamp: number;
}
const thumbnailBufferCache = new Map<string, CachedThumbnail>();
const THUMB_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 jam

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  const isFull = searchParams.get("full") === "1" || searchParams.get("full") === "true";

  if (!fileId) {
    return NextResponse.json({ error: "File ID wajib disertakan" }, { status: 400 });
  }

  try {
    // Mode Fullview: Resolusi Maksimal Asli Sumber Google Drive (Permintaan 1.d)
    if (isFull) {
      try {
        const fullMedia = await driveClient.files.get(
          { fileId, alt: "media" },
          { responseType: "arraybuffer" }
        );

        return new NextResponse(fullMedia.data as ArrayBuffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
          },
        });
      } catch (mediaErr) {
        console.warn("Direct media download fallback to s0 full resolution:", mediaErr);
      }
    }

    // Mode Galeri: Cek In-Memory Cache terlebih dahulu (Instan 1ms!)
    if (!isFull) {
      const cached = thumbnailBufferCache.get(fileId);
      if (cached && Date.now() - cached.timestamp < THUMB_CACHE_TTL) {
        return new NextResponse(cached.buffer, {
          headers: {
            "Content-Type": cached.contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // 1. Ambil URL thumbnail resmi (Cek map memori dulu tanpa hit API Drive)
    let thumbUrl = driveThumbnailMap.get(fileId);
    let mimeType = "image/jpeg";

    if (!thumbUrl) {
      const meta = await driveClient.files.get({
        fileId,
        fields: "thumbnailLink, mimeType",
      });
      thumbUrl = meta.data.thumbnailLink || undefined;
      mimeType = meta.data.mimeType || "image/jpeg";
      if (thumbUrl) {
        driveThumbnailMap.set(fileId, thumbUrl);
      }
    }

    if (thumbUrl) {
      // Jika mode fullview: buka resolusi maksimal asli (=s0)
      // Jika mode galeri: gunakan lebar 500px (=w500) sangat tajam & ringan di HP
      const targetUrl = isFull
        ? thumbUrl.replace(/=s\d+$/, "=s0")
        : thumbUrl.replace(/=s\d+$/, "=w500");

      const response = await fetch(targetUrl);
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || mimeType;

      // Simpan ke in-memory cache jika untuk galeri
      if (!isFull) {
        // Jaga kapasitas cache maksimal 400 thumbnail
        if (thumbnailBufferCache.size > 400) {
          const oldestKey = thumbnailBufferCache.keys().next().value;
          if (oldestKey) thumbnailBufferCache.delete(oldestKey);
        }
        thumbnailBufferCache.set(fileId, {
          buffer,
          contentType,
          timestamp: Date.now(),
        });
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": isFull
            ? "public, max-age=604800, stale-while-revalidate=86400"
            : "public, max-age=31536000, immutable",
        },
      });
    }

    // Fallback streaming media langsung jika thumbnailLink belum tersedia
    const res = await driveClient.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    return new NextResponse(res.data as ArrayBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=604800",
      },
    });
  } catch (error) {
    console.error("Error streaming photo:", error);
    return NextResponse.json({ error: "Gagal memuat gambar" }, { status: 500 });
  }
}
