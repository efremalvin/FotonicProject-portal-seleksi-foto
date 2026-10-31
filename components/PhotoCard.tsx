"use client";

import React from "react";

interface PhotoCardProps {
  id: string;
  name: string;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (id: string) => void;
  onPreview: (id: string, name: string) => void;
}

export default function PhotoCard({
  id,
  name,
  isSelected,
  isDisabled,
  onToggle,
  onPreview,
}: PhotoCardProps) {
  const thumbnailUrl = `/api/thumbnail?id=${id}`;

  return (
    <div
      style={{
        backgroundColor: "#16161a",
        borderRadius: "18px",
        padding: "8px",
        border: isSelected
          ? "2px solid #d6a85a"
          : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: isSelected
          ? "0 6px 20px rgba(214, 168, 90, 0.28)"
          : "0 4px 14px rgba(0, 0, 0, 0.45)",
        transition: "all 0.25s ease",
        position: "relative",
      }}>
      {/* Kontainer Foto Menyesuaikan Ukuran (Tidak Crop: Portrait tetap Portrait, Landscape tetap Landscape) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: "#0d0d10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <img
          src={thumbnailUrl}
          alt={name}
          loading="lazy"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            objectFit: "contain",
            borderRadius: "12px",
          }}
        />

        {/* Tombol Perbesar / Lightbox */}
        <button
          onClick={() => onPreview(id, name)}
          title="Lihat Pratinjau Penuh"
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            backgroundColor: "rgba(9, 9, 11, 0.78)",
            color: "#f0cf8e",
            border: "1px solid rgba(214, 168, 90, 0.35)",
            borderRadius: "7px",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "0.88rem",
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            transition: "all 0.2s ease",
          }}>
          ⛶
        </button>

        {/* Badge Terpilih di atas foto */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "6px",
              backgroundColor: "rgba(9, 9, 11, 0.88)",
              color: "#f0cf8e",
              border: "1px solid #d6a85a",
              borderRadius: "9999px",
              padding: "2px 8px",
              fontSize: "0.68rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "3px",
              backdropFilter: "blur(4px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
            ✓
          </div>
        )}
      </div>

      {/* Bagian Bawah: Nama File & Tombol Pilih */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 4px 4px 4px",
        }}>
        <span
          title={name}
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: isSelected ? "#f0cf8e" : "#ededed",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "60%",
          }}>
          {name}
        </span>

        {isSelected ? (
          // Tombol Terpilih (Gold Gradient)
          <button
            onClick={() => onToggle(id)}
            style={{
              background:
                "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
              color: "#09090b",
              border: "none",
              borderRadius: "9999px",
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              fontSize: "0.74rem",
              fontWeight: 800,
              boxShadow: "0 2px 10px rgba(214, 168, 90, 0.4)",
              transition: "transform 0.15s ease",
            }}>
            <span>✓</span>
            <span>Dipilih</span>
          </button>
        ) : (
          // Tombol Belum Dipilih (Dark Gold Outline Pill)
          <button
            onClick={() => onToggle(id)}
            disabled={isDisabled}
            style={{
              backgroundColor: isDisabled
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(214, 168, 90, 0.12)",
              color: isDisabled ? "#71717a" : "#f0cf8e",
              border: isDisabled
                ? "1px solid rgba(255, 255, 255, 0.08)"
                : "1px solid rgba(214, 168, 90, 0.35)",
              borderRadius: "9999px",
              padding: "5px 14px",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: isDisabled ? "not-allowed" : "pointer",
              boxShadow: isDisabled
                ? "none"
                : "0 2px 8px rgba(0, 0, 0, 0.3)",
              transition: "all 0.2s ease",
            }}>
            Pilih
          </button>
        )}
      </div>
    </div>
  );
}
