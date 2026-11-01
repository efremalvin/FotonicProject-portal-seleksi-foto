"use client";

import React from "react";

interface PhotoCardProps {
  id: string;
  name: string;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (id: string) => void;
  onPreview: (id: string, name: string) => void;
  width?: number;
  height?: number;
  isLandscape?: boolean;
}

export default function PhotoCard({
  id,
  name,
  isSelected,
  isDisabled,
  onToggle,
  onPreview,
  width,
  height,
  isLandscape,
}: PhotoCardProps) {
  const thumbnailUrl = `/api/thumbnail?id=${id}`;

  const handleCardClick = () => {
    if (isDisabled && !isSelected) return;
    onToggle(id);
  };

  // Aspek rasio presisi agar browser langsung mengunci tinggi kartu (Zero Layout Shift saat scroll!)
  const computedAspectRatio =
    width && height
      ? `${width} / ${height}`
      : isLandscape !== undefined
      ? isLandscape
        ? "3 / 2"
        : "2 / 3"
      : undefined;

  return (
    <div
      onClick={handleCardClick}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#111114",
        cursor: isDisabled && !isSelected ? "not-allowed" : "pointer",
        outline: isSelected ? "3px solid #d6a85a" : "1px solid rgba(255, 255, 255, 0.08)",
        outlineOffset: isSelected ? "-3px" : "0",
        boxShadow: isSelected
          ? "0 2px 10px rgba(214, 168, 90, 0.45)"
          : "0 1px 4px rgba(0, 0, 0, 0.3)",
        userSelect: "none",
        aspectRatio: computedAspectRatio,
      }}>
      {/* 1. Foto Asli Responsif Sesuai Aspek Rasio (Google Photos Album Tile) */}
      <img
        src={thumbnailUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
          borderRadius: "10px",
          filter: isSelected ? "brightness(1.02)" : "brightness(0.96)",
        }}
      />

      {/* 2. Overlay Halus saat Foto Terpilih (Google Photos Selection Tint) */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(214, 168, 90, 0.12)",
            pointerEvents: "none",
            borderRadius: "inherit",
          }}
        />
      )}

      {/* 3. Pojok Kiri Atas: Ikon Checklist & Unchecklist Lingkaran (Bebas GPU Blur Lag) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isDisabled && !isSelected) return;
          onToggle(id);
        }}
        title={isSelected ? "Batalkan Pilihan" : "Pilih Foto"}
        style={{
          position: "absolute",
          top: "7px",
          left: "7px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          backgroundColor: isSelected ? "#d6a85a" : "rgba(18, 18, 22, 0.85)",
          color: isSelected ? "#09090b" : "transparent",
          border: isSelected
            ? "2px solid #d6a85a"
            : "2px solid rgba(255, 255, 255, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDisabled && !isSelected ? "not-allowed" : "pointer",
          fontSize: "0.82rem",
          fontWeight: 900,
          boxShadow: isSelected
            ? "0 2px 8px rgba(214, 168, 90, 0.6)"
            : "0 1px 4px rgba(0, 0, 0, 0.4)",
          zIndex: 10,
        }}>
        {isSelected ? "✓" : ""}
      </button>

      {/* 4. Pojok Kanan Atas: Tombol Perbesar / Mode Fullview (Bebas GPU Blur Lag) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPreview(id, name);
        }}
        title="Buka Layar Penuh"
        style={{
          position: "absolute",
          top: "7px",
          right: "7px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          backgroundColor: "rgba(18, 18, 22, 0.88)",
          color: "#f0cf8e",
          border: "1px solid rgba(214, 168, 90, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "0.78rem",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.4)",
          zIndex: 10,
        }}>
        ⛶
      </button>

      {/* 5. Gradasi Bayangan & Nama Foto di Bawah */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background:
            "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.35) 60%, transparent 100%)",
          padding: "16px 8px 6px 8px",
          pointerEvents: "none",
          borderRadius: "0 0 10px 10px",
        }}>
        <span
          title={name}
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: isSelected ? "#f0cf8e" : "#ededed",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.9)",
          }}>
          {name}
        </span>
      </div>
    </div>
  );
}
