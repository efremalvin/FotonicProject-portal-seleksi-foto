"use client";

import React, { useState } from "react";

interface SuccessModalProps {
  clientName: string;
  selectedFileNames: string[];
  notes?: string;
  adminWaNumber?: string;
  onClose?: () => void;
}

function WhatsAppIcon({ size = 19 }: { size?: number }) {
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

export default function SuccessModal({
  clientName,
  selectedFileNames,
  notes,
  adminWaNumber = "6281994218428",
  onClose,
}: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const fileListText = selectedFileNames
    .map((name, index) => `${index + 1}. ${name}`)
    .join("\n");

  const notesText = notes ? `\n\nCatatan Editing:\n"${notes}"` : "";

  const message = `Halo Tim Fotonic, saya ${clientName}.\nSaya telah selesai memilih ${selectedFileNames.length} foto untuk sesi editing:\n\n${fileListText}${notesText}\n\nMohon dicek ya, terima kasih!`;

  const waUrl = `https://wa.me/${adminWaNumber}?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 9, 11, 0.94)",
        backdropFilter: "blur(14px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}>
      <div
        style={{
          position: "relative",
          backgroundColor: "#16161a",
          borderRadius: "28px",
          padding: "36px 24px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 25px rgba(214, 168, 90, 0.15)",
          border: "1px solid rgba(214, 168, 90, 0.3)",
        }}>
        {/* Tombol Silang di Pojok Kanan Atas Popup Menu (Permintaan 3.a) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Popup"
            title="Tutup"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(214, 168, 90, 0.35)",
              color: "#f0cf8e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s ease",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(214, 168, 90, 0.2)";
              e.currentTarget.style.borderColor = "#d6a85a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(214, 168, 90, 0.35)";
            }}>
            ✕
          </button>
        )}

        {/* Ikon Perayaan */}
        <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>🎉</div>

        {/* Judul Final */}
        <h2
          style={{
            fontSize: "1.45rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "10px",
          }}>
          Data Foto Berhasil Disimpan!
        </h2>

        {/* Sapaan Klien */}
        <p
          style={{
            fontSize: "0.88rem",
            color: "#a1a1aa",
            lineHeight: "1.5",
            marginBottom: "20px",
          }}>
          Terima kasih Kak{" "}
          <strong style={{ color: "#f0cf8e" }}>{clientName}</strong>. Foto
          pilihan Anda ({selectedFileNames.length} foto) telah tersimpan ke sistem Fotonic.
        </p>

        {/* Daftar Bernomor File Terpilih */}
        <div
          style={{
            backgroundColor: "#0d0d10",
            borderRadius: "16px",
            padding: "16px 18px",
            maxHeight: "180px",
            overflowY: "auto",
            textAlign: "left",
            border: "1px solid rgba(214, 168, 90, 0.2)",
            marginBottom: "20px",
          }}>
          {selectedFileNames.map((name, i) => (
            <div
              key={i}
              style={{
                fontSize: "0.82rem",
                color: "#ededed",
                marginBottom: "5px",
                display: "flex",
                gap: "6px",
              }}>
              <span style={{ color: "#d6a85a", fontWeight: 700 }}>{i + 1}.</span>
              <span>{name}</span>
            </div>
          ))}
        </div>

        {/* Tombol Aksi: WhatsApp & Copy */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Tombol Konfirmasi ke WhatsApp (Satu Baris & Ikon WhatsApp) */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "#25d366",
              color: "#09090b",
              borderRadius: "9999px",
              height: "48px",
              padding: "0 20px",
              fontSize: "0.9rem",
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 16px rgba(37, 211, 102, 0.35)",
              transition: "transform 0.2s ease",
            }}>
            <WhatsAppIcon size={19} />
            <span>Konfirmasi ke WhatsApp</span>
          </a>

          {/* Tombol Salin Teks Rekapitulasi (Ikon content_copy) */}
          <button
            onClick={handleCopy}
            style={{
              backgroundColor: "transparent",
              color: copied ? "#f0cf8e" : "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "9999px",
              height: "42px",
              padding: "0 18px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}>
            {copied ? (
              <span>✓ Rekapan Berhasil Disalin!</span>
            ) : (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px", lineHeight: 1 }}>
                  content_copy
                </span>
                <span>Salin Daftar Foto ke Clipboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
