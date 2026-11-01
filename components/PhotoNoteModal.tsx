"use client";

import React, { useState, useEffect } from "react";
import { IconPaper, IconImage } from "./Icons";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

interface PhotoNoteModalProps {
  isOpen: boolean;
  photoName: string;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

export default function PhotoNoteModal({
  isOpen,
  photoName,
  initialNote,
  onSave,
  onClose,
}: PhotoNoteModalProps) {
  const [note, setNote] = useState(initialNote || "");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setNote(initialNote || "");
  }, [initialNote, isOpen]);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => {
        cancelAnimationFrame(frame);
        unlockScroll();
      };
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  const handleDelete = () => {
    onSave("");
    onClose();
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
        zIndex: 1000005, // Berada di atas fullview modal jika dipanggil dari fullview
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}>
      <div
        style={{
          backgroundColor: "#16161a",
          borderRadius: "24px",
          padding: "28px 22px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "left",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.85), 0 0 25px rgba(214, 168, 90, 0.18)",
          border: "1px solid rgba(214, 168, 90, 0.35)",
          transform: isVisible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
          transition: "transform 0.25s ease-out",
        }}>
        {/* Header Modal Catatan */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconPaper size={20} color="#d6a85a" style={{ flexShrink: 0 }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff", margin: 0 }}>
              Catatan Khusus Foto
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#a1a1aa",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1rem",
            }}>
            ✕
          </button>
        </div>

        {/* Nama Foto Target */}
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#f0cf8e",
            backgroundColor: "#0d0d10",
            padding: "8px 14px",
            borderRadius: "10px",
            marginBottom: "16px",
            border: "1px solid rgba(214, 168, 90, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}>
          <IconImage size={18} color="#d6a85a" style={{ flexShrink: 0 }} />
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}>
            {photoName}
          </span>
        </div>

        {/* Instruksi Ringkas */}
        <label
          htmlFor="photo-specific-note"
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "#a1a1aa",
            marginBottom: "8px",
          }}>
          Tulis instruksi khusus untuk editor (contoh: retouch noda, warm tone, bersihkan background):
        </label>

        {/* Textarea Catatan */}
        <textarea
          id="photo-specific-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Mohon bersihkan background di sisi kiri dan kulit dibuat lebih cerah natural."
          rows={4}
          style={{
            width: "100%",
            backgroundColor: "#09090b",
            color: "#ededed",
            border: "1px solid rgba(214, 168, 90, 0.35)",
            borderRadius: "14px",
            padding: "12px 14px",
            fontSize: "0.88rem",
            lineHeight: "1.5",
            outline: "none",
            resize: "vertical",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#f0cf8e")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(214, 168, 90, 0.35)")}
        />

        {/* Tombol Aksi */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
          {initialNote && (
            <button
              onClick={handleDelete}
              style={{
                backgroundColor: "transparent",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                marginRight: "auto",
              }}>
              Hapus
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "#d4d4d8",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "9px 18px",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}>
            Batal
          </button>

          <button
            onClick={handleSave}
            style={{
              background:
                "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
              color: "#09090b",
              border: "none",
              padding: "9px 20px",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(214, 168, 90, 0.35)",
            }}>
            Simpan Catatan
          </button>
        </div>
      </div>
    </div>
  );
}
