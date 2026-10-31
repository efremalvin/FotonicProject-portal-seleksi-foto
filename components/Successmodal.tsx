"use client";

import React, { useState } from "react";

interface SuccessModalProps {
  clientName: string;
  selectedFileNames: string[];
  notes?: string;
  adminWaNumber?: string;
}

export default function SuccessModal({
  clientName,
  selectedFileNames,
  notes,
  adminWaNumber = "6281994218428",
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
          backgroundColor: "#16161a",
          borderRadius: "28px",
          padding: "36px 24px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 25px rgba(214, 168, 90, 0.15)",
          border: "1px solid rgba(214, 168, 90, 0.3)",
        }}>
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
          {/* Tombol Konfirmasi ke WhatsApp Fotonic */}
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
              padding: "14px 20px",
              fontSize: "0.95rem",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(37, 211, 102, 0.35)",
              transition: "transform 0.2s ease",
            }}>
            <span>💬 Konfirmasi ke WhatsApp Fotonic</span>
          </a>

          {/* Tombol Salin Teks Rekapitulasi */}
          <button
            onClick={handleCopy}
            style={{
              backgroundColor: "transparent",
              color: copied ? "#f0cf8e" : "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "9999px",
              padding: "10px 18px",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}>
            {copied ? "✓ Rekapan Berhasil Disalin!" : "📋 Salin Daftar Foto ke Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
