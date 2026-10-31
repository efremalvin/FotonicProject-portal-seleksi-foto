"use client";

import React, { useState, useEffect } from "react";

interface HeroBannerProps {
  clientName: string;
  photoDate?: string | null;
  maxPhotos?: number;
  folderId?: string | null;
  bannerPhotoUrl?: string;
}

export default function HeroBanner({
  clientName,
  photoDate,
  maxPhotos,
  folderId,
  bannerPhotoUrl,
}: HeroBannerProps) {
  const bannerSrc =
    bannerPhotoUrl ||
    (folderId ? `/api/banner?folder_id=${encodeURIComponent(folderId)}` : "/api/banner");

  // Titik fokus vertikal dalam persen (default 72% untuk mengangkat wajah subjek ke area tengah yang bebas teks)
  const [focalY, setFocalY] = useState<number>(72);

  // Otomatis Deteksi Wajah & Subjek Klien Menggunakan Model YCbCr Presisi (Menolak Cat Merah Bangunan)
  useEffect(() => {
    if (!bannerSrc) return;

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bannerSrc;

    img.onload = async () => {
      if (!isMounted) return;

      // Metode 1: Browser Native FaceDetector API (Jika diaktifkan di Chromium / Android)
      if (typeof window !== "undefined" && "FaceDetector" in window) {
        try {
          // @ts-ignore
          const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await detector.detect(img);
          if (faces && faces.length > 0 && isMounted) {
            const face = faces[0].boundingBox;
            const faceCenterY = ((face.top + face.height * 0.5) / img.naturalHeight) * 100;
            // Angkat subjek agar wajah tampil di jendela tengah atas hero banner (sekitar 38% viewport)
            const targetY = Math.max(55, Math.min(88, Math.round(faceCenterY * 1.35)));
            setFocalY(targetY);
            return;
          }
        } catch {
          // Lanjut ke metode segmentasi Canvas
        }
      }

      // Metode 2: In-Memory Canvas YCbCr Skin Chrominance Scanner (Akurat & Menolak Warna Atap Bangunan)
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const sampleW = 100;
        const sampleH = Math.max(50, Math.round((sampleW * img.naturalHeight) / img.naturalWidth));
        canvas.width = sampleW;
        canvas.height = sampleH;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);

        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;

        let totalWeight = 0;
        let weightedY = 0;

        // Fokus pemindaian pada zona potret manusia (20% - 80% tinggi foto)
        const scanStartY = Math.floor(sampleH * 0.2);
        const scanEndY = Math.floor(sampleH * 0.82);

        for (let y = scanStartY; y < scanEndY; y++) {
          for (let x = 0; x < sampleW; x++) {
            const idx = (y * sampleW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Model Standar YCbCr: Kulit manusia memiliki rentang Cr [135, 178] dan Cb [88, 135].
            // Cat merah atap/gedung memiliki Cr > 185 sehingga otomatis ditolak!
            const Y = 0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            const isSkin =
              Cr >= 135 &&
              Cr <= 178 &&
              Cb >= 88 &&
              Cb <= 135 &&
              Y > 45 &&
              Y < 235;

            if (isSkin) {
              const distFromCenterX = Math.abs(x - sampleW / 2) / (sampleW / 2);
              const weight = Math.max(0.4, 1 - distFromCenterX);
              totalWeight += weight;
              weightedY += y * weight;
            }
          }
        }

        if (totalWeight > 25 && isMounted) {
          const detectedPercent = (weightedY / totalWeight / sampleH) * 100;
          // Posisikan wajah subjek agar berada di area aman tengah tanpa tertutup teks bawah
          const targetY = Math.max(60, Math.min(88, Math.round(detectedPercent * 1.3)));
          setFocalY(targetY);
        } else if (isMounted) {
          // Default optimal untuk foto wisuda/portrait
          setFocalY(74);
        }
      } catch {
        // Fallback default
        if (isMounted) setFocalY(74);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [bannerSrc]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* ========================================================
          1. TAMPILAN MOBILE: Hero Section Luas dengan Auto-Centering Wajah
          & Gradien Halus di Atas dan Bawah Tanpa Celah (Gap)
          ======================================================== */}
      <div
        className="hero-mobile-section"
        style={{
          position: "relative",
          width: "100%",
          height: "62vh",
          minHeight: "480px",
          maxHeight: "580px",
          borderRadius: "0 0 32px 32px",
          overflow: "hidden",
          marginBottom: "20px",
          borderBottom: "1.5px solid rgba(214, 168, 90, 0.35)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
          backgroundColor: "#09090b",
          isolation: "isolate",
          WebkitMaskImage: "-webkit-radial-gradient(white, black)",
        }}>
        {/* Gambar Banner Klien dengan Auto-Focal Point Centering */}
        <img
          src={bannerSrc}
          alt={clientName}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `center ${focalY}%`,
            transition: "object-position 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 1,
          }}
        />
        {/* Lapisan Gradien Atas: Menyatu Halus dari Hitam Pekat (Tanpa Gap / Celah) */}
        <div
          style={{
            position: "absolute",
            top: "-4px",
            left: "-4px",
            right: "-4px",
            height: "140px",
            background:
              "linear-gradient(to bottom, #09090b 0%, #09090b 18%, rgba(9, 9, 11, 0.92) 48%, rgba(9, 9, 11, 0.4) 75%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Lapisan Gradien Bawah: Deep Dark Vignette (Mencegah Teks Menutupi Wajah & Menyatu Tanpa Celah) */}
        <div
          style={{
            position: "absolute",
            bottom: "-6px",
            left: "-6px",
            right: "-6px",
            height: "260px",
            background:
              "linear-gradient(to top, #09090b 0%, #09090b 16%, rgba(9, 9, 11, 0.96) 45%, rgba(9, 9, 11, 0.6) 75%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Header "Fotonic Client Section" di Paling Atas di Atas Gradien */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            width: "100%",
            padding: "16px 16px 6px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#d6a85a",
          }}>
          <span style={{ width: "24px", height: "1px", backgroundColor: "rgba(214, 168, 90, 0.45)" }} />
          <span>Fotonic Client Section</span>
          <span style={{ width: "24px", height: "1px", backgroundColor: "rgba(214, 168, 90, 0.45)" }} />
        </div>

        {/* Informasi Klien di Bagian Bawah: Ringkas & Elegan di Atas Gaun/Torso Klien */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "20px",
            paddingLeft: "16px",
            paddingRight: "16px",
            textAlign: "center",
          }}>
          {/* Nama Client */}
          <h1
            style={{
              fontSize: "clamp(1.75rem, 5.5vw, 2.3rem)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.5px",
              marginBottom: "6px",
              lineHeight: "1.2",
              textShadow: "0 3px 18px rgba(0, 0, 0, 0.95)",
            }}>
            {clientName}
          </h1>

          {/* Tanggal Foto & Kuota Badge */}
          {photoDate && (
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#f0cf8e",
                letterSpacing: "0.03em",
                marginBottom: "10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(9, 9, 11, 0.85)",
                border: "1px solid rgba(214, 168, 90, 0.35)",
                padding: "4px 14px",
                borderRadius: "9999px",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
              }}>
              <span>🗓️</span>
              <span>{photoDate}</span>
              {maxPhotos && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: "#ededed" }}>Kuota {maxPhotos} Foto</span>
                </>
              )}
            </div>
          )}

          {/* Link Instagram */}
          <a
            href="https://instagram.com/fotonicproject"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(9, 9, 11, 0.85)",
              border: "1px solid rgba(214, 168, 90, 0.35)",
              borderRadius: "9999px",
              padding: "4px 16px",
              textDecoration: "none",
              backdropFilter: "blur(8px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d6a85a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "block" }}>
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
            <span
              style={{
                fontFamily: "'Tangerine', cursive, serif",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#f0cf8e",
                lineHeight: 1,
                letterSpacing: "0.5px",
              }}>
              @fotonicproject
            </span>
          </a>
        </div>
      </div>

      {/* ========================================================
          2. TAMPILAN DESKTOP: Bersih, Minimalis, Tanpa Gambar Hero Raksasa
          ======================================================== */}
      <div
        className="hero-desktop-clean"
        style={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px 20px 20px 20px",
          marginBottom: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#d6a85a",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
          <span style={{ width: "24px", height: "1px", backgroundColor: "rgba(214, 168, 90, 0.4)" }} />
          <span>Fotonic Client Section</span>
          <span style={{ width: "24px", height: "1px", backgroundColor: "rgba(214, 168, 90, 0.4)" }} />
        </div>

        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            marginBottom: "8px",
            lineHeight: "1.2",
          }}>
          {clientName}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginTop: "4px",
          }}>
          {photoDate && (
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#f0cf8e",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(214, 168, 90, 0.12)",
                border: "1px solid rgba(214, 168, 90, 0.3)",
                padding: "4px 14px",
                borderRadius: "9999px",
              }}>
              <span>🗓️</span>
              <span>{photoDate}</span>
              {maxPhotos && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: "#ededed" }}>Maksimal {maxPhotos} Foto</span>
                </>
              )}
            </div>
          )}

          <a
            href="https://instagram.com/fotonicproject"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#a1a1aa",
              textDecoration: "none",
              padding: "4px 12px",
              borderRadius: "9999px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f0cf8e")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1aa")}>
            <span>@fotonicproject</span>
          </a>
        </div>
      </div>
    </div>
  );
}
