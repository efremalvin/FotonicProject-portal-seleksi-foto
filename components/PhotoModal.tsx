"use client";

import React from "react";

interface PhotoModalProps {
  id: string;
  name: string;
  isSelected: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
}

export default function PhotoModal({
  id,
  name,
  isSelected,
  onClose,
  onToggle,
}: PhotoModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 9, 11, 0.96)",
        backdropFilter: "blur(16px)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}>
      {/* Tombol Tutup */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          backgroundColor: "#16161a",
          color: "#f0cf8e",
          border: "1px solid rgba(214, 168, 90, 0.35)",
          borderRadius: "50%",
          width: "42px",
          height: "42px",
          fontSize: "1.2rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          transition: "transform 0.2s ease",
        }}>
        ✕
      </button>

      {/* Gambar Pratinjau (Menyesuaikan Rasio Asli Penuh, Tidak Crop) */}
      <div
        style={{
          maxWidth: "92vw",
          maxHeight: "78vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
        <img
          src={`/api/thumbnail?id=${id}`}
          alt={name}
          style={{
            maxWidth: "100%",
            maxHeight: "78vh",
            objectFit: "contain",
            borderRadius: "14px",
            border: isSelected ? "2px solid #d6a85a" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isSelected
              ? "0 12px 40px rgba(214, 168, 90, 0.35)"
              : "0 12px 40px rgba(0,0,0,0.8)",
          }}
        />
      </div>

      {/* Informasi & Tombol Toggle Aksi */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          backgroundColor: "#16161a",
          padding: "10px 20px",
          borderRadius: "9999px",
          border: "1px solid rgba(214, 168, 90, 0.3)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
        <span
          style={{
            color: isSelected ? "#f0cf8e" : "#ededed",
            fontSize: "0.92rem",
            fontWeight: 700,
            maxWidth: "240px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
          {name}
        </span>
        <button
          onClick={() => onToggle(id)}
          style={{
            background: isSelected
              ? "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)"
              : "rgba(214, 168, 90, 0.15)",
            color: isSelected ? "#09090b" : "#f0cf8e",
            border: isSelected ? "none" : "1px solid rgba(214, 168, 90, 0.4)",
            borderRadius: "9999px",
            padding: "8px 22px",
            fontSize: "0.86rem",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: isSelected ? "0 4px 14px rgba(214, 168, 90, 0.35)" : "none",
            transition: "all 0.2s ease",
          }}>
          {isSelected ? "✓ Batalkan Pilihan" : "+ Pilih Foto Ini"}
        </button>
      </div>
    </div>
  );
}
