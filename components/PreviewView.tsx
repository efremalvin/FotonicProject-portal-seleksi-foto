"use client";

import React, { memo, useCallback } from "react";
import MasonryGallery from "./MasonryGallery";
import { IconPaper, IconPaperPlus, IconCalendar, IconImage } from "./Icons";

export interface SelectedPhoto {
  id: string;
  name: string;
  width?: number;
  height?: number;
  isLandscape?: boolean;
}

interface PreviewCardItemProps {
  photo: SelectedPhoto;
  noteText?: string;
  onPreview: (id: string, name: string) => void;
  onToggle?: (id: string) => void;
  onOpenNote?: (id: string, name: string) => void;
}

const PreviewCardItem = memo(function PreviewCardItem({
  photo,
  noteText,
  onPreview,
  onToggle,
  onOpenNote,
}: PreviewCardItemProps) {
  const computedAspectRatio =
    photo.width && photo.height
      ? `${photo.width} / ${photo.height}`
      : photo.isLandscape !== undefined
      ? photo.isLandscape
        ? "3 / 2"
        : "2 / 3"
      : undefined;

  return (
    <div
      style={{
        backgroundColor: "#16161a",
        borderRadius: "20px",
        padding: "10px",
        border: "2px solid #d6a85a",
        boxShadow: "0 2px 12px rgba(214, 168, 90, 0.22)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        contain: "layout style paint",
      }}>
      {/* Foto Thumbnail (Klik Foto atau Tombol Expand untuk Buka Fullview) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onPreview(photo.id, photo.name);
        }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: computedAspectRatio,
          borderRadius: "14px",
          overflow: "hidden",
          backgroundColor: "#0d0d10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
        <img
          src={`/api/thumbnail?id=${photo.id}`}
          alt={photo.name}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            borderRadius: "14px",
          }}
        />

        {/* Badge Centang Emas di Kiri Atas Foto (Ukuran Ringkas agar Tidak Menutupi Foto - Permintaan 2.a) */}
        <div
          style={{
            position: "absolute",
            top: "6px",
            left: "6px",
            backgroundColor: "#d6a85a",
            color: "#09090b",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.72rem",
            fontWeight: 800,
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
            zIndex: 2,
          }}>
          ✓
        </div>

        {/* Tombol Perbesar Pratinjau (Ukuran Ringkas - Permintaan 2.a) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(photo.id, photo.name);
          }}
          title="Lihat Pratinjau Penuh"
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            backgroundColor: "rgba(18, 18, 22, 0.88)",
            color: "#f0cf8e",
            border: "1px solid rgba(214, 168, 90, 0.4)",
            borderRadius: "6px",
            width: "22px",
            height: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "0.75rem",
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          }}>
          ⛶
        </button>
      </div>

      {/* 1. Baris Nama File (Jelas, Tidak Tertutup Apapun - Permintaan 2.b) */}
      <div style={{ padding: "8px 2px 2px 2px", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "6px" }}>
        <IconImage size={15} color="#d6a85a" />
        <span
          title={photo.name}
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#ffffff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
            width: "100%",
          }}>
          {photo.name}
        </span>
      </div>

      {/* 2. Catatan Independen di Bawah Nama File (Teks Sedikit + Titik-Titik Sesuai Lebar UI - Permintaan 2.b) */}
      <div style={{ width: "100%", marginTop: "4px" }}>
        {noteText ? (
          <button
            onClick={() => onOpenNote && onOpenNote(photo.id, photo.name)}
            title={`Catatan Khusus: "${noteText}" (Klik untuk edit)`}
            style={{
              width: "100%",
              backgroundColor: "rgba(214, 168, 90, 0.12)",
              border: "1px solid rgba(214, 168, 90, 0.35)",
              borderRadius: "8px",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              textAlign: "left",
              boxSizing: "border-box",
            }}>
            <IconPaper size={15} color="#f0cf8e" />
            <span
              style={{
                fontSize: "0.72rem",
                color: "#f0cf8e",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}>
              {noteText}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onOpenNote && onOpenNote(photo.id, photo.name)}
            title="Tambah catatan khusus untuk foto ini"
            style={{
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed rgba(255, 255, 255, 0.16)",
              borderRadius: "8px",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              color: "#a1a1aa",
              fontSize: "0.7rem",
              cursor: "pointer",
              boxSizing: "border-box",
            }}>
            <IconPaperPlus size={15} color="#d6a85a" />
            <span>Catatan Khusus</span>
          </button>
        )}
      </div>

      {/* 3. Tombol Terpilih di Bawah Catatan Independen (Permintaan 2.c) */}
      <div style={{ marginTop: "8px", width: "100%" }}>
        {onToggle ? (
          <button
            onClick={() => onToggle(photo.id)}
            title="Klik untuk membatalkan / mengubah pilihan foto ini"
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
              color: "#09090b",
              border: "none",
              borderRadius: "9999px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              cursor: "pointer",
              fontSize: "0.76rem",
              fontWeight: 800,
              boxShadow: "0 2px 8px rgba(214, 168, 90, 0.35)",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}>
            <span>✓</span>
            <span>Terpilih</span>
          </button>
        ) : (
          <div
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
              color: "#09090b",
              borderRadius: "9999px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              fontSize: "0.76rem",
              fontWeight: 800,
              boxShadow: "0 2px 8px rgba(214, 168, 90, 0.35)",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}>
            <span>✓</span>
            <span>Terpilih</span>
          </div>
        )}
      </div>
    </div>
  );
});

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
  photoNotes?: Record<string, string>;
  onOpenNote?: (id: string, name: string) => void;
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
  photoNotes = {},
  onOpenNote,
}: PreviewViewProps) {
  const renderCard = useCallback(
    (photo: any) => (
      <PreviewCardItem
        photo={photo}
        noteText={photoNotes[photo.id]}
        onPreview={onPreview}
        onToggle={onToggle}
        onOpenNote={onOpenNote}
      />
    ),
    [photoNotes, onPreview, onToggle, onOpenNote]
  );

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
            <IconCalendar size={15} color="#d6a85a" style={{ marginRight: 6, verticalAlign: -2 }} /> Tanggal Sesi: <strong style={{ color: "#f0cf8e" }}>{photoDate}</strong>
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

      {/* Grid Galeri Foto Terpilih (Smart Masonry Tanpa Gap Kosong & Terisolasi dari Re-render Textarea) */}
      <div style={{ marginBottom: "32px" }}>
        {selectedPhotos.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              backgroundColor: "#16161a",
              borderRadius: "16px",
              border: "1px dashed rgba(214, 168, 90, 0.3)",
              color: "#a1a1aa",
            }}>
            <p style={{ margin: "0 0 16px 0", fontSize: "0.95rem" }}>
              Belum ada foto yang dipilih. Silakan kembali ke galeri untuk memilih foto.
            </p>
            <button
              onClick={onBackToGallery}
              style={{
                backgroundColor: "rgba(214, 168, 90, 0.15)",
                color: "#f0cf8e",
                border: "1px solid rgba(214, 168, 90, 0.35)",
                padding: "8px 20px",
                borderRadius: "9999px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}>
              ← Kembali ke Galeri
            </button>
          </div>
        ) : (
          <MasonryGallery photos={selectedPhotos as any} renderItem={renderCard} />
        )}
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><IconPaper size={18} color="#d6a85a" /><span>Catatan Tambahan untuk Editor (Opsional):</span></span>
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
