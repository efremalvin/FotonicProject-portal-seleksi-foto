"use client";

import React, { useState, useCallback, memo } from "react";
import { IconCalendar } from "./Icons";

function InstagramIcon({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}

interface HeroBannerProps {
  clientName: string;
  photoDate?: string | null;
  maxPhotos?: number;
  folderId?: string | null;
  bannerPhotoUrl?: string;
}

function HeroBannerComponent({
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

  // Otomatis Deteksi Wajah & Subjek Klien Langsung dari Elemen Gambar Tanpa Download Ganda & Tanpa Blokir Main Thread
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      // Pada desktop, gambar hero mobile disembunyikan sehingga tidak perlu pemindaian kanvas
      return;
    }

    const img = e.currentTarget;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const runDetection = async () => {
      // Metode 1: Browser Native FaceDetector API (Jika diaktifkan di Chromium / Android)
      if (typeof window !== "undefined" && "FaceDetector" in window) {
        try {
          // @ts-ignore
          const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await detector.detect(img);
          if (faces && faces.length > 0) {
            const face = faces[0].boundingBox;
            const faceCenterY = ((face.top + face.height * 0.5) / img.naturalHeight) * 100;
            const targetY = Math.max(55, Math.min(88, Math.round(faceCenterY * 1.35)));
            setFocalY(targetY);
            return;
          }
        } catch {
          // Lanjut ke metode segmentasi Canvas
        }
      }

      // Metode 2: In-Memory Canvas YCbCr Skin Chrominance Scanner Ringan (Sample 64px)
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const sampleW = 64;
        const sampleH = Math.max(36, Math.round((sampleW * img.naturalHeight) / img.naturalWidth));
        canvas.width = sampleW;
        canvas.height = sampleH;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);

        const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

        let totalWeight = 0;
        let weightedY = 0;

        const scanStartY = Math.floor(sampleH * 0.2);
        const scanEndY = Math.floor(sampleH * 0.82);

        for (let y = scanStartY; y < scanEndY; y++) {
          for (let x = 0; x < sampleW; x++) {
            const idx = (y * sampleW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const Y = 0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            if (Cr >= 135 && Cr <= 178 && Cb >= 88 && Cb <= 135 && Y > 45 && Y < 235) {
              const distFromCenterX = Math.abs(x - sampleW / 2) / (sampleW / 2);
              const weight = Math.max(0.4, 1 - distFromCenterX);
              totalWeight += weight;
              weightedY += y * weight;
            }
          }
        }

        if (totalWeight > 12) {
          const detectedPercent = (weightedY / totalWeight / sampleH) * 100;
          const targetY = Math.max(60, Math.min(88, Math.round(detectedPercent * 1.3)));
          setFocalY(targetY);
        } else {
          setFocalY(74);
        }
      } catch {
        setFocalY(74);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(runDetection, { timeout: 600 });
    } else {
      setTimeout(runDetection, 120);
    }
  }, []);

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
          contain: "layout style paint",
        }}>
        {/* Gambar Banner Klien dengan Auto-Focal Point Centering */}
        <img
          src={bannerSrc}
          alt={clientName}
          decoding="async"
          onLoad={handleImageLoad}
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
                backgroundColor: "rgba(9, 9, 11, 0.9)",
                border: "1px solid rgba(214, 168, 90, 0.35)",
                padding: "4px 14px",
                borderRadius: "9999px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
              }}>
              <IconCalendar size={15} color="#d6a85a" />
              <span>{photoDate}</span>
              {maxPhotos && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: "#ededed" }}>Kuota {maxPhotos} Foto</span>
                </>
              )}
            </div>
          )}

          {/* Link Instagram Mobile: Selalu Tetap Abu-abu (#a1a1aa) */}
          <a
            href="https://instagram.com/fotonicproject"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#a1a1aa",
              textDecoration: "none",
              padding: "4px 14px",
              borderRadius: "9999px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(18, 18, 22, 0.85)",
            }}>
            <InstagramIcon size={14} color="#a1a1aa" />
            <span style={{ color: "#a1a1aa" }}>@fotonicproject</span>
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
              <IconCalendar size={16} color="#d6a85a" />
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
              justifyContent: "center",
              gap: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#a1a1aa",
              textDecoration: "none",
              padding: "4px 14px",
              borderRadius: "9999px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(18, 18, 22, 0.85)",
              transition: "color 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#a1a1aa";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            }}>
            <InstagramIcon size={14} color="currentColor" />
            <span>@fotonicproject</span>
          </a>
        </div>
      </div>
    </div>
  );
}

const HeroBanner = memo(HeroBannerComponent);
export default HeroBanner;
