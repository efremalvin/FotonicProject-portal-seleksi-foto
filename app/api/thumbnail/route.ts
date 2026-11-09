import { NextRequest, NextResponse } from "next/server";
import { driveClient } from "@/lib/google/auth";
import { driveThumbnailMap } from "@/lib/google/drive";

// In-memory buffer cache untuk thumbnail galeri, fullview HD, & resolusi maksimal asli
interface CachedThumbnail {
  buffer: ArrayBuffer;
  contentType: string;
  timestamp: number;
}
const thumbnailBufferCache = new Map<string, CachedThumbnail>();
const fullviewBufferCache = new Map<string, CachedThumbnail>();
const maxviewBufferCache = new Map<string, CachedThumbnail>();
const inFlightThumbRequests = new Map<string, Promise<CachedThumbnail | null>>();
const THUMB_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 jam

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  const isMax = searchParams.get("max") === "1" || searchParams.get("max") === "true";
  const isFull =
    !isMax && (searchParams.get("full") === "1" || searchParams.get("full") === "true");

  if (!fileId) {
    return NextResponse.json({ error: "File ID wajib disertakan" }, { status: 400 });
  }

  const cacheKey = isMax ? `max:${fileId}` : isFull ? `full:${fileId}` : `thumb:${fileId}`;
  const targetCache = isMax
    ? maxviewBufferCache
    : isFull
    ? fullviewBufferCache
    : thumbnailBufferCache;

  // 1. Cek In-Memory Cache terlebih dahulu (Instan 1ms!)
  const cached = targetCache.get(fileId);
  if (cached && Date.now() - cached.timestamp < THUMB_CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control":
          isMax || isFull
            ? "public, max-age=604800, stale-while-revalidate=86400"
            : "public, max-age=31536000, immutable",
      },
    });
  }

  // 2. Deduplikasi request gambar yang sama jika dipanggil bersamaan
  let pendingPromise = inFlightThumbRequests.get(cacheKey);
  if (!pendingPromise) {
    pendingPromise = (async (): Promise<CachedThumbnail | null> => {
      try {
        // Ambil URL thumbnail resmi (Cek map memori dulu tanpa hit API Drive)
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
          // - Mode max (=s0): Resolusi maksimal asli 100% dari Google CDN (tanpa kompresi downscale)
          // - Mode fullview (=s1600): Resolusi 2K HD cepat untuk transisi instan
          // - Mode galeri (=w600): Tajam di layar Retina HP/Desktop namun sangat ringan (~40KB) untuk scroll 60fps
          const targetUrl = isMax
            ? thumbUrl.replace(/=s\d+$/, "=s0")
            : isFull
            ? thumbUrl.replace(/=s\d+$/, "=s1600")
            : thumbUrl.replace(/=s\d+$/, "=w600");

          let response = await fetch(targetUrl);
          // Fallback jika =s0 ditolak oleh CDN tertentu, gunakan =s4096 (4K Ultra HD)
          if (!response.ok && isMax) {
            response = await fetch(thumbUrl.replace(/=s\d+$/, "=s4096"));
          }

          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const contentType = response.headers.get("content-type") || mimeType;
            const entry: CachedThumbnail = {
              buffer,
              contentType,
              timestamp: Date.now(),
            };

            const maxItems = isMax ? 25 : isFull ? 80 : 500;
            if (targetCache.size >= maxItems) {
              const oldestKey = targetCache.keys().next().value;
              if (oldestKey) targetCache.delete(oldestKey);
            }
            targetCache.set(fileId, entry);
            return entry;
          }
        }

        // Fallback streaming media langsung dari Google Drive (resolusi asli penuh)
        const res = await driveClient.files.get(
          { fileId, alt: "media" },
          { responseType: "arraybuffer" }
        );

        const entry: CachedThumbnail = {
          buffer: res.data as ArrayBuffer,
          contentType: mimeType,
          timestamp: Date.now(),
        };
        return entry;
      } catch (err) {
        console.error("Error streaming photo:", err);
        return null;
      } finally {
        inFlightThumbRequests.delete(cacheKey);
      }
    })();

    inFlightThumbRequests.set(cacheKey, pendingPromise);
  }

  const result = await pendingPromise;
  if (!result) {
    return NextResponse.json({ error: "Gagal memuat gambar" }, { status: 500 });
  }

  return new NextResponse(result.buffer, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control":
        isMax || isFull
          ? "public, max-age=604800, stale-while-revalidate=86400"
          : "public, max-age=31536000, immutable",
    },
  });
}
