"use client";

import React, { useState, useEffect } from "react";
import { IconPaper, IconImage } from "./Icons";
import { lockScroll, unlockScroll, forceUnlockScroll } from "@/lib/scrollLock";

interface LockedSessionModalProps {
  clientName: string;
  waktu: string;
  count: number;
  selectedFileNames: string[];
  notes?: string;
  onViewLocked: () => void;
  onUnlockAndEdit: () => void;
}

export default function LockedSessionModal({
  clientName,
  waktu,
  count,
  selectedFileNames,
  notes,
  onViewLocked,
  onUnlockAndEdit,
}: LockedSessionModalProps) {
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

  const handleAction = (callback: () => void) => {
    if (isClosing) return;
    setIsClosing(true);
    forceUnlockScroll();
    setTimeout(() => {
      callback();
    }, 320);
  };

  return (
    <div
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 9, 11, 0.94)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
          padding: "34px 24px",
          maxWidth: "460px",
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
        {/* Ikon Gembok Emas */}
        <div
          style={{
            position: "relative",
            width: "64px",
            height: "64px",
            margin: "0 auto 16px auto",
            borderRadius: "50%",
            backgroundColor: "rgba(214, 168, 90, 0.12)",
            border: "1.5px solid rgba(214, 168, 90, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 24px rgba(214, 168, 90, 0.25)",
            fontSize: "1.75rem",
          }}>
          🔒
        </div>

        {/* Heading */}
        <h2
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "6px",
          }}>
          Pilihan Foto Sudah Dikunci
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "0.85rem",
            color: "#a1a1aa",
            lineHeight: "1.5",
            marginBottom: "16px",
          }}>
          Sesi seleksi foto untuk <strong style={{ color: "#f0cf8e" }}>{clientName}</strong> sebelumnya telah dikonfirmasi dan dikunci di sistem.
        </p>

        {/* Kotak Ringkasan Data Terkunci */}
        <div
          style={{
            backgroundColor: "#0d0d10",
            borderRadius: "18px",
            padding: "16px",
            textAlign: "left",
            marginBottom: "24px",
            border: "1px solid rgba(214, 168, 90, 0.22)",
            fontSize: "0.82rem",
            lineHeight: "1.6",
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ color: "#a1a1aa", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "17px", lineHeight: 1, color: "#d6a85a" }}>
                calendar_clock
              </span>
              <span>Waktu Dikunci:</span>
            </span>
            <span style={{ color: "#ededed", fontWeight: 600 }}>{waktu || "-"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ color: "#a1a1aa", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "17px", lineHeight: 1, color: "#d6a85a" }}>
                image
              </span>
              <span>Jumlah Terkunci:</span>
            </span>
            <span style={{ color: "#f0cf8e", fontWeight: 700 }}>{count} Foto</span>
          </div>

          {/* Catatan Sebelumnya jika ada */}
          {notes && notes !== "-" && (
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#d6a85a", fontWeight: 700, display: "block", marginBottom: "2px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><IconPaper size={15} color="#d6a85a" /><span>Catatan Sebelumnya:</span></span>
              </span>
              <p style={{ color: "#d4d4d8", fontSize: "0.78rem", margin: 0, whiteSpace: "pre-wrap", maxHeight: "60px", overflowY: "auto" }}>
                {notes}
              </p>
            </div>
          )}

          {/* Daftar Singkat File Terkunci */}
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "#a1a1aa", fontSize: "0.76rem", display: "block", marginBottom: "4px" }}>
              Daftar Foto:
            </span>
            <div
              style={{
                maxHeight: "80px",
                overflowY: "auto",
                color: "#f0cf8e",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}>
              {selectedFileNames.slice(0, 10).map((name, idx) => (
                <span key={idx} style={{ display: "inline-block", marginRight: "8px" }}>
                  {name}
                </span>
              ))}
              {selectedFileNames.length > 10 && (
                <span style={{ color: "#a1a1aa" }}>+{selectedFileNames.length - 10} lainnya</span>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Tombol Buka Kunci & Edit Kembali (Ikon edit_square sesuai Permintaan #1) */}
          <button
            onClick={() => handleAction(onUnlockAndEdit)}
            style={{
              width: "100%",
              height: "48px",
              background:
                "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
              color: "#09090b",
              border: "none",
              borderRadius: "9999px",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "transform 0.15s ease",
            }}>
            <span>Buka Kunci &amp; Edit Kembali</span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px", lineHeight: 1, color: "#09090b" }}>
              edit_square
            </span>
          </button>

          {/* Tombol Lihat Pilihan Terkunci */}
          <button
            onClick={() => handleAction(onViewLocked)}
            style={{
              width: "100%",
              height: "46px",
              backgroundColor: "#16161a",
              color: "#ededed",
              border: "1.5px solid rgba(214, 168, 90, 0.4)",
              borderRadius: "9999px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}>
            <span>Lihat Pilihan Terkunci</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
