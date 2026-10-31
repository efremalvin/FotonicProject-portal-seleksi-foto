"use client";

import React from "react";
import MasonryGallery from "./MasonryGallery";

interface SelectedPhoto {
  id: string;
  name: string;
  width?: number;
  height?: number;
  isLandscape?: boolean;
}

interface PreviewViewProps {
  clientName: string;
  photoDate?: string | null;
  selectedPhotos: SelectedPhoto[];
  maxPhotos: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  isSubmitting: boolean;
  onBackToGallery: () => void;
  onConfirmSubmit: () => void;
  onPreview: (id: string, name: string) => void;
  onToggle?: (id: string) => void;
}

export default function PreviewView({
  clientName,
  photoDate,
  selectedPhotos,
  maxPhotos,
  notes,
  onNotesChange,
  isSubmitting,
  onBackToGallery,
  onConfirmSubmit,
  onPreview,
  onToggle,
}: PreviewViewProps) {
  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "24px 16px 80px 16px",
        animation: "fadeIn 0.28s ease-in-out",
      }}>
      {/* Header Halaman Pratinjau */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#d6a85a",
            marginBottom: "8px",
          }}>
          Review Pilihan Foto
        </div>

        <h1
          style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}>
          Tinjau Foto Terpilih — <span className="text-gradient-gold">{clientName}</span>
        </h1>

        {photoDate && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "#a1a1aa",
              marginBottom: "8px",
            }}>
            🗓️ Tanggal Sesi: <strong style={{ color: "#f0cf8e" }}>{photoDate}</strong>
          </div>
        )}

        <p style={{ fontSize: "0.88rem", color: "#a1a1aa", lineHeight: "1.5" }}>
          Pastikan foto-foto berikut adalah pilihan terbaik Anda sebelum dikirim ke tim editor Fotonic.
        </p>

        {/* Counter Badge */}
        <div
          style={{
            marginTop: "14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(214, 168, 90, 0.14)",
            color: "#f0cf8e",
            border: "1px solid rgba(214, 168, 90, 0.35)",
            borderRadius: "9999px",
            padding: "5px 16px",
            fontSize: "0.85rem",
            fontWeight: 800,
          }}>
          <span>Terpilih: {selectedPhotos.length} / {maxPhotos} Foto</span>
        </div>
      </div>

      {/* Grid Galeri Foto Terpilih (Smart Masonry Tanpa Gap Kosong) */}
      <div style={{ marginBottom: "32px" }}>
        <MasonryGallery
          photos={selectedPhotos as any}
          renderItem={(photo) => (
            <div
              style={{
                backgroundColor: "#16161a",
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid #d6a85a",
                boxShadow: "0 6px 24px rgba(214, 168, 90, 0.22)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}>
              {/* Foto Thumbnail Menyesuaikan Rasio (Contain) */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  borderRadius: "14px",
                  overflow: "hidden",
                  backgroundColor: "#0d0d10",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <img
                  src={`/api/thumbnail?id=${photo.id}`}
                  alt={photo.name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    borderRadius: "14px",
                  }}
                />

                {/* Badge Centang Emas di Kiri Atas Foto (Konsisten dengan PhotoCard) */}
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    backgroundColor: "#d6a85a",
                    color: "#09090b",
                    borderRadius: "50%",
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    zIndex: 2,
                  }}>
                  ✓
                </div>

                {/* Tombol Perbesar Pratinjau */}
                <button
                  onClick={() => onPreview(photo.id, photo.name)}
                  title="Lihat Pratinjau Penuh"
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "rgba(9, 9, 11, 0.75)",
                    color: "#f0cf8e",
                    border: "1px solid rgba(214, 168, 90, 0.3)",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    zIndex: 2,
                  }}>
                  ⛶
                </button>
              </div>

              {/* Info Nama & Badge Terpilih: Rapi 1 Baris, Tidak Pernah Patah */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "10px 4px 4px 4px",
                  width: "100%",
                  boxSizing: "border-box",
                }}>
                <span
                  title={photo.name}
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#f0cf8e",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: "1 1 auto",
                    minWidth: 0,
                  }}>
                  {photo.name}
                </span>

                {onToggle ? (
                  <button
                    onClick={() => onToggle(photo.id)}
                    title="Klik untuk membatalkan / mengubah pilihan foto ini"
                    style={{
                      background:
                        "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                      color: "#09090b",
                      border: "none",
                      borderRadius: "9999px",
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      boxShadow: "0 2px 8px rgba(214, 168, 90, 0.35)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      lineHeight: 1,
                      transition: "transform 0.15s ease",
                    }}>
                    <span>✓</span>
                    <span>Terpilih</span>
                  </button>
                ) : (
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                      color: "#09090b",
                      borderRadius: "9999px",
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      boxShadow: "0 2px 8px rgba(214, 168, 90, 0.35)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      lineHeight: 1,
                    }}>
                    <span>✓</span>
                    <span>Terpilih</span>
                  </div>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {/* Kotak Catatan Tambahan (Opsional) */}
      <div
        style={{
          backgroundColor: "#16161a",
          border: "1px solid rgba(214, 168, 90, 0.25)",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "32px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}>
        <label
          htmlFor="edit-notes"
          style={{
            display: "block",
            fontSize: "0.92rem",
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: "8px",
          }}>
          📝 Catatan Tambahan untuk Editor (Opsional):
        </label>
        <textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Contoh: Mohon bersihkan background pada DSC_0003, tone warna dibuat warm tone seperti portofolio Instagram."
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "14px 16px",
            backgroundColor: "#0d0d10",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "14px",
            color: "#ededed",
            fontSize: "0.88rem",
            lineHeight: "1.5",
            outline: "none",
            resize: "vertical",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#d6a85a")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")}
        />
      </div>

      {/* Bagian Tombol Aksi: Responsif Mobile & Desktop Tanpa Teks Terpotong / Ikon Tergencet */}
      <div className="preview-action-container">
        {/* Tombol Konfirmasi Pilihan (Gold Pill) */}
        <button
          onClick={onConfirmSubmit}
          disabled={isSubmitting}
          className="preview-btn-confirm"
          style={{
            background: isSubmitting
              ? "#4a3c25"
              : "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
            color: "#09090b",
            border: "none",
            fontSize: "0.94rem",
            fontWeight: 800,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
            transition: "all 0.25s ease",
          }}>
          <span style={{ whiteSpace: "nowrap" }}>
            {isSubmitting ? "Menyimpan Data..." : "Konfirmasi & Kirim Pilihan"}
          </span>
          <span
            className="preview-icon-badge"
            style={{
              backgroundColor: "#09090b",
              color: "#f0cf8e",
            }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "block" }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </button>

        {/* Tombol Ubah Pilihan di Galeri */}
        <button
          onClick={onBackToGallery}
          disabled={isSubmitting}
          className="preview-btn-back"
          style={{
            backgroundColor: "#16161a",
            color: "#ededed",
            border: "1.5px solid rgba(214, 168, 90, 0.4)",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: 700,
            transition: "all 0.25s ease",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
          <span
            className="preview-icon-badge"
            style={{
              backgroundColor: "rgba(214, 168, 90, 0.12)",
              color: "#f0cf8e",
            }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "block" }}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </span>
          <span style={{ whiteSpace: "nowrap" }}>Ubah Pilihan di Galeri</span>
        </button>
      </div>
    </div>
  );
}
