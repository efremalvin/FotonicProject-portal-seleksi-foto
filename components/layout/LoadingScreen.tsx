"use client";

import React, { useEffect, useState, useRef } from "react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

interface LoadingScreenProps {
  isLoading: boolean;
  onFinished?: () => void;
  onCrossfadeStart?: () => void;
  folderDetected?: boolean;
  clientName?: string;
}

export default function LoadingScreen({
  isLoading,
  onFinished,
  onCrossfadeStart,
  folderDetected,
  clientName,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(12);
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const hasLockedRef = useRef(false);

  const releaseScrollLockOnce = () => {
    if (hasLockedRef.current) {
      hasLockedRef.current = false;
      unlockScroll();
    }
  };

  useEffect(() => {
    // Kunci scroll halaman saat loading screen aktif
    lockScroll();
    hasLockedRef.current = true;
    return () => {
      releaseScrollLockOnce();
    };
  }, []);

  // Simulasi progress animasi bertahap
  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(35), 250);
    const timer2 = setTimeout(() => setProgress(58), 650);
    const timer3 = setTimeout(() => setProgress(78), 1100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Ketika proses loading selesai (baik sukses maupun error)
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const holdTimer = setTimeout(() => {
        // Lepas kunci scroll dari LoadingScreen tepat saat crossfade dimulai
        // agar halaman (terutama /edited atau mobile tanpa welcome modal) langsung bisa di-scroll
        releaseScrollLockOnce();
        setIsFadingOut(true);
        if (onCrossfadeStart) {
          onCrossfadeStart();
        }

        // Hilangkan loading screen setelah durasi crossfade selesai sempurna
        const removeTimer = setTimeout(() => {
          setShouldRender(false);
          if (onFinished) onFinished();
        }, 420);

        return () => clearTimeout(removeTimer);
      }, folderDetected ? 160 : 80);

      return () => clearTimeout(holdTimer);
    }
  }, [isLoading, folderDetected, onCrossfadeStart, onFinished]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000000,
        backgroundColor: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        opacity: isFadingOut ? 0 : 1,
        transition: "opacity 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isFadingOut ? "none" : "auto",
      }}>
      {/* Ambient Lighting di Belakang Icon Shutter (Gradien Halus Bebas Blur Filter Berat) */}
      <div
        style={{
          position: "absolute",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(214, 168, 90, 0.14) 0%, rgba(214, 168, 90, 0.05) 40%, rgba(9, 9, 11, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Kontainer Animasi Shutter Fotonic (Larut halus ke atas saat crossfade) */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
          transform: isFadingOut ? "scale(0.96) translateY(-8px)" : "scale(1) translateY(0)",
          transition: "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
        {/* Lingkaran Luar dengan Efek Pulsa & Rotasi Halus */}
        <div
          className="shutter-pulse-ring"
          style={{
            position: "relative",
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            border: "1.5px solid rgba(214, 168, 90, 0.35)",
            backgroundColor: "rgba(22, 22, 26, 0.9)",
            boxShadow:
              "0 0 35px rgba(214, 168, 90, 0.22), inset 0 0 15px rgba(214, 168, 90, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}>
          {/* Gambar Icon Shutter / Aperture Berputar Halus */}
          <img
            src="/images/aperture-white.png"
            alt="Fotonic Shutter Icon"
            className="shutter-rotate-icon"
            style={{
              width: "48px",
              height: "48px",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Teks Brand Fotonic */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span
            style={{
              display: "block",
              fontSize: "1.55rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#ffffff",
              marginBottom: "3px",
            }}>
            Fotonic
          </span>
          <span
            style={{
              display: "block",
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.26em",
              color: "#d6a85a",
              fontWeight: 700,
            }}>
            Photo &amp; Video Project
          </span>
        </div>

        {/* Progress Bar Ramping Aksen Gold */}
        <div
          style={{
            width: "180px",
            height: "3px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: "9999px",
            overflow: "hidden",
            position: "relative",
            marginBottom: "12px",
          }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #b9853a 0%, #d6a85a 50%, #f0cf8e 100%)",
              borderRadius: "9999px",
              transition: "width 0.4s ease-out",
              boxShadow: "0 0 10px rgba(214, 168, 90, 0.6)",
            }}
          />
        </div>

        {/* Status Loading */}
        <p
          style={{
            fontSize: "0.8rem",
            color: "#a1a1aa",
            letterSpacing: "0.02em",
            margin: 0,
            fontWeight: 500,
          }}>
          {progress < 60
            ? "Mendeteksi sesi klien..."
            : progress < 100
            ? "Menyiapkan galeri foto..."
            : `Sesi ${clientName || "Klien"} Siap ✨`}
        </p>
      </div>
    </div>
  );
}
