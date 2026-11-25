"use client";

import React, { memo } from "react";

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

function PhotoCardComponent({
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
        outline: isSelected ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: isSelected
          ? "0 2px 10px rgba(214, 168, 90, 0.45)"
          : "0 1px 4px rgba(0, 0, 0, 0.3)",
        userSelect: "none",
        aspectRatio: computedAspectRatio,
        contain: "layout style paint",
      }}>
      {/* 1. Foto Asli Responsif Sesuai Aspek Rasio (Bebas Shader Filter Lag saat Scroll) */}
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
        }}
      />

      {/* 3. Gradasi Bayangan & Nama Foto di Bawah (Berada di belakang Stroke Line Emas) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background:
            "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.35) 60%, transparent 100%)",
          padding: "16px 9px 7px 9px",
          pointerEvents: "none",
          borderRadius: "0 0 10px 10px",
          zIndex: 4,
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

      {/* 4. Stroke Line Emas Saat Terpilih (Berada di DEPAN Gradasi Shadow Bawah) */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "10px",
            border: "3px solid #d6a85a",
            pointerEvents: "none",
            boxSizing: "border-box",
            zIndex: 8,
          }}
        />
      )}

      {/* 5. Pojok Kiri Atas: Ikon Checklist & Unchecklist Lingkaran (Pudar saat kuota terpenuhi - Permintaan 1.a) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isDisabled && !isSelected) return;
          onToggle(id);
        }}
        title={
          isSelected
            ? "Batalkan Pilihan"
            : isDisabled
            ? "Kuota foto telah terpenuhi"
            : "Pilih Foto"
        }
        style={{
          position: "absolute",
          top: "7px",
          left: "7px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          backgroundColor: isSelected
            ? "#d6a85a"
            : isDisabled
            ? "rgba(18, 18, 22, 0.45)"
            : "rgba(18, 18, 22, 0.85)",
          color: isSelected ? "#09090b" : "transparent",
          border: isSelected
            ? "2px solid #d6a85a"
            : isDisabled
            ? "1.5px solid rgba(255, 255, 255, 0.22)"
            : "2px solid rgba(255, 255, 255, 0.85)",
          opacity: isDisabled && !isSelected ? 0.32 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDisabled && !isSelected ? "not-allowed" : "pointer",
          fontSize: "0.82rem",
          fontWeight: 900,
          boxShadow: isSelected
            ? "0 2px 8px rgba(214, 168, 90, 0.6)"
            : isDisabled
            ? "none"
            : "0 1px 4px rgba(0, 0, 0, 0.4)",
          transition: "background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
          zIndex: 10,
        }}>
        {isSelected ? "✓" : ""}
      </button>

      {/* 6. Pojok Kanan Atas: Tombol Perbesar / Mode Fullview (Bebas GPU Blur Lag) */}
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
    </div>
  );
}

const PhotoCard = memo(PhotoCardComponent);
export default PhotoCard;
