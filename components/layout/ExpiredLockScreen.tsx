"use client";

import React from "react";

interface ExpiredLockScreenProps {
  clientName?: string;
  sessionDate?: string | null;
  folderName?: string;
  mode?: "selection" | "edited";
  expiredDate?: string | null;
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.33 11.33 0 0 0 12.04.64C5.76.64.65 5.75.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.64l6.05-1.59a11.37 11.37 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.4 0-3.04-1.18-5.9-3.34-8.06z" />
    </svg>
  );
}

export default function ExpiredLockScreen({
  clientName,
  sessionDate,
  mode = "selection",
  expiredDate,
}: ExpiredLockScreenProps) {
  const isEditedMode = mode === "edited";
  const resolvedName = clientName || "Klien Fotonic";

  const titleText = isEditedMode
    ? "Waktu Peninjauan Hasil Editan Telah Berakhir"
    : "Waktu Pemilihan Foto Telah Berakhir";

  const descriptionText = isEditedMode
    ? "Tautan peninjauan hasil editan foto ini telah melewati batas waktu aktif. Sesuai ketentuan, akses galeri otomatis ditutup setelah masa tenggang berakhir. Jangan khawatir, hasil editan Anda masih tersimpan di arsip kami."
    : "Tautan seleksi foto ini telah melewati batas waktu aktif. Sesuai ketentuan, akses galeri otomatis ditutup setelah masa tenggang berakhir. Jangan khawatir, file mentah Anda masih tersimpan di arsip kami.";

  const waMessage = isEditedMode
    ? `Halo Admin Fotonic, saya ${resolvedName}. Tautan review hasil editan foto saya telah kedaluwarsa, mohon bantuannya untuk mengaktifkan kembali aksesnya. Terima kasih!`
    : `Halo Admin Fotonic, saya ${resolvedName}. Tautan seleksi foto saya telah kedaluwarsa, mohon bantuannya untuk mengaktifkan kembali aksesnya. Terima kasih!`;

  const waUrl = `https://wa.me/6281994218428?text=${encodeURIComponent(waMessage)}`;

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

      {/* Kartu Utama Expired Lock Screen */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          backgroundColor: "#16171e",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "28px",
          padding: "40px 26px",
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

        {/* Badge Status */}
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

        {/* Judul Adaptif */}
        <h1
          style={{
            fontSize: "clamp(1.25rem, 4.5vw, 1.55rem)",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            marginBottom: "14px",
          }}>
          {titleText}
        </h1>

        {/* Teks Pesan Adaptif */}
        <p
          style={{
            color: "#a1a1aa",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            marginBottom: "22px",
            padding: "0 4px",
          }}>
          {descriptionText}
        </p>

        {/* Info Box Tambahan */}
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
            marginBottom: "22px",
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
                fontSize: "0.76rem",
                color: "#71717a",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
              Sesi / Klien
            </span>
            <span
              style={{
                fontSize: "0.86rem",
                color: "#ededed",
                fontWeight: 700,
                textAlign: "right",
              }}>
              {resolvedName}
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
                  fontSize: "0.76rem",
                  color: "#71717a",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                Tanggal Sesi
              </span>
              <span
                style={{
                  fontSize: "0.84rem",
                  color: "#d4d4d8",
                  fontWeight: 600,
                  textAlign: "right",
                }}>
                {sessionDate}
              </span>
            </div>
          )}

          {expiredDate && (
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
                  fontSize: "0.76rem",
                  color: "#71717a",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                Batas Waktu
              </span>
              <span
                style={{
                  fontSize: "0.84rem",
                  color: "#f0cf8e",
                  fontWeight: 600,
                  textAlign: "right",
                }}>
                {expiredDate}
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
                fontSize: "0.76rem",
                color: "#71717a",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
              Tipe Menu
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                color: "#d4d4d8",
                fontWeight: 600,
                textAlign: "right",
              }}>
              {isEditedMode ? "Review Hasil Editan" : "Seleksi Foto Klien"}
            </span>
          </div>

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
                fontSize: "0.76rem",
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
              Diarsipkan / Akses Ditutup
            </span>
          </div>
        </div>

        {/* Tombol Hubungi Admin via WhatsApp */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            height: "48px",
            backgroundColor: "#25d366",
            color: "#09090b",
            borderRadius: "9999px",
            fontSize: "0.9rem",
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 6px 20px rgba(37, 211, 102, 0.3)",
            whiteSpace: "nowrap",
          }}>
          <WhatsAppIcon size={19} />
          <span>Hubungi Admin via WhatsApp</span>
        </a>
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
