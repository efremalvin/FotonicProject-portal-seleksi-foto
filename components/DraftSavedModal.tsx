"use client";

import React, { useState, useEffect } from "react";
import { lockScroll, unlockScroll, forceUnlockScroll } from "@/lib/scrollLock";

interface DraftSavedModalProps {
  clientName: string;
  selectedCount: number;
  isResume?: boolean;
  onContinue: () => void;
}

export default function DraftSavedModal({
  clientName,
  selectedCount,
  isResume = false,
  onContinue,
}: DraftSavedModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    lockScroll();
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      unlockScroll();
    };
  }, []);

  const handleContinue = () => {
    if (isClosing) return;
    setIsClosing(true);
    forceUnlockScroll();
    setTimeout(() => {
      onContinue();
    }, 320);
  };

  return (
    <div
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 9, 11, 0.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        zIndex: 999995,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        opacity: isVisible && !isClosing ? 1 : 0,
        transition: "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isVisible && !isClosing ? "auto" : "none",
      }}>
      <div
        style={{
          backgroundColor: "#16161a",
          borderRadius: "28px",
          padding: "36px 24px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.85), 0 0 25px rgba(214, 168, 90, 0.18)",
          border: "1px solid rgba(214, 168, 90, 0.35)",
          transform:
            isVisible && !isClosing
              ? "scale(1) translateY(0)"
              : isClosing
              ? "scale(0.97) translateY(-8px)"
              : "scale(0.96) translateY(16px)",
          transition:
            "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
        {/* Shutter Icon dengan Aksen Gold Pulsa */}
        <div
          style={{
            position: "relative",
            width: "68px",
            height: "68px",
            margin: "0 auto 18px auto",
            borderRadius: "50%",
            backgroundColor: "rgba(214, 168, 90, 0.12)",
            border: "1.5px solid rgba(214, 168, 90, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 24px rgba(214, 168, 90, 0.25)",
          }}>
          <img
            src="/images/aperture-white.png"
            alt="Fotonic Shutter"
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
              filter: "drop-shadow(0 0 6px rgba(240, 207, 142, 0.4))",
            }}
          />
        </div>

        {/* Heading */}
        <h2
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "8px",
          }}>
          {isResume ? "Melanjutkan Pilihan Foto ✨" : "Pilihan Disimpan Sementara ✨"}
        </h2>

        {/* Badge Info */}
        <div
          style={{
            display: "inline-block",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#f0cf8e",
            backgroundColor: "rgba(214, 168, 90, 0.12)",
            border: "1px solid rgba(214, 168, 90, 0.3)",
            borderRadius: "9999px",
            padding: "4px 14px",
            marginBottom: "16px",
          }}>
          {clientName} • {selectedCount} Foto Tersimpan
        </div>

        {/* Deskripsi */}
        <p
          style={{
            fontSize: "0.86rem",
            color: "#a1a1aa",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}>
          {isResume ? (
            <>
              Halo <strong style={{ color: "#f0cf8e" }}>{clientName}</strong>, sesi draf pilihan foto Anda sebelumnya telah kami simpan di sistem.
              <br />
              Anda dapat langsung melanjutkan memilih atau mengubah foto sesuai kuota Anda.
            </>
          ) : (
            <>
              Pilihan foto Anda telah berhasil dicatat ke sistem Google Spreadsheet Fotonic.
              <br />
              Anda dapat menutup halaman ini kapan saja dan melanjutkannya kembali melalui tautan link ini tanpa kehilangan pilihan.
            </>
          )}
        </p>

        {/* Tombol Lanjutkan Memilih Foto (Identik Welcome Modal) */}
        <button
          onClick={handleContinue}
          style={{
            width: "100%",
            height: "50px",
            background:
              "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
            color: "#09090b",
            border: "none",
            borderRadius: "9999px",
            fontSize: "0.95rem",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(214, 168, 90, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(214, 168, 90, 0.35)";
          }}>
          Lanjutkan Memilih Foto →
        </button>
      </div>
    </div>
  );
}
