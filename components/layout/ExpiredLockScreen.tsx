"use client";

import React from "react";

interface ExpiredLockScreenProps {
  clientName?: string;
  sessionDate?: string | null;
  folderName?: string;
}

export default function ExpiredLockScreen({
  clientName,
  sessionDate,
  folderName,
}: ExpiredLockScreenProps) {
  return (
    <div
      style={{
        backgroundColor: "#0d0e12",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        boxSizing: "border-box",
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}>
      {/* Background radial glow halus untuk atmosfer mewah Fotonic */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle 520px at 50% 35%, rgba(214, 168, 90, 0.05), transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Kartu Utama Expired Lock Screen (Minimalis, Centered Viewport) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          backgroundColor: "#16171e",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "28px",
          padding: "44px 28px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          boxShadow:
            "0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(214, 168, 90, 0.06)",
          boxSizing: "border-box",
        }}>
        {/* Ikon Status: Lingkaran Glow Halus dengan Ikon Jam Pasir (⏳) */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "rgba(214, 168, 90, 0.08)",
            border: "1.5px solid rgba(214, 168, 90, 0.35)",
            boxShadow: "0 0 24px rgba(214, 168, 90, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            fontSize: "32px",
            lineHeight: 1,
            userSelect: "none",
          }}>
          ⏳
        </div>

        {/* Badge Status: Pill Badge Berbingkai */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "6px 18px",
            borderRadius: "9999px",
            border: "1px solid rgba(214, 168, 90, 0.35)",
            backgroundColor: "rgba(214, 168, 90, 0.08)",
            color: "#f0cf8e",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "18px",
            userSelect: "none",
          }}>
          <span>⏳ LINK KEDALUWARSA</span>
        </div>

        {/* Judul: Putih Tegas */}
        <h1
          style={{
            fontSize: "clamp(1.3rem, 4.5vw, 1.6rem)",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            marginBottom: "14px",
          }}>
          Waktu Pemilihan Foto Telah Berakhir
        </h1>

        {/* Teks Pesan */}
        <p
          style={{
            color: "#a1a1aa",
            fontSize: "0.9rem",
            lineHeight: 1.65,
            marginBottom: "24px",
            padding: "0 4px",
          }}>
          Tautan seleksi foto ini telah melewati batas waktu aktif. Sesuai ketentuan,
          akses galeri otomatis ditutup setelah masa tenggang berakhir. Jangan khawatir,
          file mentah Anda masih tersimpan di arsip kami.
        </p>

        {/* Info Box Tambahan: Kotak Info Gelap Transparan */}
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "16px",
            padding: "16px 18px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxSizing: "border-box",
          }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}>
            <span
              style={{
                fontSize: "0.78rem",
                color: "#71717a",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
              Sesi / Klien
            </span>
            <span
              style={{
                fontSize: "0.88rem",
                color: "#ededed",
                fontWeight: 700,
                textAlign: "right",
              }}>
              {clientName || "Klien Fotonic"}
            </span>
          </div>

          {sessionDate && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                paddingTop: "8px",
              }}>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#71717a",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                Tanggal Sesi
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#d4d4d8",
                  fontWeight: 600,
                  textAlign: "right",
                }}>
                {sessionDate}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              paddingTop: "8px",
            }}>
            <span
              style={{
                fontSize: "0.78rem",
                color: "#71717a",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
              Status
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                color: "#d6a85a",
                fontWeight: 700,
                letterSpacing: "0.02em",
                textAlign: "right",
              }}>
              Status: Diarsipkan / Akses Ditutup
            </span>
          </div>
        </div>

        {/* KETENTUAN KHUSUS: WAJIB TANPA TOMBOL APAPUN (murni penanda informasi status) */}
      </div>

      {/* Label Hak Cipta Halus di Luar Kartu */}
      <div
        style={{
          marginTop: "24px",
          color: "#52525b",
          fontSize: "0.75rem",
          fontWeight: 500,
          textAlign: "center",
          userSelect: "none",
          zIndex: 1,
        }}>
        © Fotonic Photo & Video Project
      </div>
    </div>
  );
}
