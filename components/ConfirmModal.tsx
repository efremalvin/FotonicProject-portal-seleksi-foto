"use client";

import React from "react";

interface ConfirmModalProps {
  selectedCount: number;
  maxPhotos: number;
  selectedFileNames: string[];
  isSubmitting: boolean;
  onBackToGallery: () => void;
  onConfirmSubmit: () => void;
}

export default function ConfirmModal({
  selectedCount,
  maxPhotos,
  selectedFileNames,
  isSubmitting,
  onBackToGallery,
  onConfirmSubmit,
}: ConfirmModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 9, 11, 0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}>
      <div
        style={{
          backgroundColor: "#16161a",
          borderRadius: "28px",
          padding: "32px 24px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 20px rgba(214, 168, 90, 0.15)",
          border: "1px solid rgba(214, 168, 90, 0.3)",
        }}>
        <h2
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "8px",
          }}>
          Konfirmasi Pilihan Foto
        </h2>
        <p
          style={{
            fontSize: "0.85rem",
            color: "#a1a1aa",
            marginBottom: "18px",
          }}>
          Anda telah memilih{" "}
          <strong style={{ color: "#f0cf8e" }}>{selectedCount}</strong> dari
          maksimal {maxPhotos} foto.
        </p>

        {/* Ringkasan File */}
        <div
          style={{
            backgroundColor: "#0d0d10",
            borderRadius: "16px",
            padding: "14px",
            maxHeight: "180px",
            overflowY: "auto",
            textAlign: "left",
            marginBottom: "24px",
            fontSize: "0.8rem",
            color: "#ededed",
            lineHeight: "1.6",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}>
          {selectedFileNames.map((name, i) => (
            <div key={i} style={{ display: "flex", gap: "6px" }}>
              <span style={{ color: "#d6a85a", fontWeight: 700 }}>{i + 1}.</span>
              <span>{name}</span>
            </div>
          ))}
        </div>

        {/* Tombol Aksi */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Tombol Konfirmasi Final (Gold Pill) */}
          <button
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            style={{
              width: "100%",
              height: "50px",
              background: isSubmitting
                ? "#4a3c25"
                : "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
              color: "#09090b",
              border: "none",
              borderRadius: "9999px",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}>
            <span>{isSubmitting ? "Menyimpan Data..." : "Ya, Kirim Pilihan Ini"}</span>
            <span style={{ fontSize: "1rem" }}>✓</span>
          </button>

          {/* Tombol Batal / Kembali */}
          <button
            onClick={onBackToGallery}
            disabled={isSubmitting}
            style={{
              width: "100%",
              height: "44px",
              backgroundColor: "transparent",
              color: "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}>
            Kembali Memilih
          </button>
        </div>
      </div>
    </div>
  );
}
