"use client";

import React, { useState, useEffect } from "react";
import { lockScroll, unlockScroll, forceUnlockScroll } from "@/lib/scrollLock";
import { IconCalendar } from "./Icons";

interface WelcomeModalProps {
  clientName: string;
  photoDate?: string | null;
  maxPhotos: number;
  onStart: () => void;
}

export default function WelcomeModal({
  clientName,
  photoDate,
  maxPhotos,
  onStart,
}: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Kunci scroll halaman belakang secara aman saat modal selamat datang aktif
  useEffect(() => {
    lockScroll();

    // Trigger crossfade fade-in pada frame render berikutnya agar transisi CSS berjalan
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      unlockScroll();
    };
  }, []);

  const handleStart = () => {
    if (isClosing) return;
    setIsClosing(true);
    // Segera buka kunci scroll agar begitu klik mulai, halaman langsung bisa di-scroll
    forceUnlockScroll();
    // Beri waktu 360ms untuk transisi keluar yang lembut sebelum komponen di-unmount
    setTimeout(() => {
      onStart();
    }, 360);
  };

  return (
    <div
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 9, 11, 0.92)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 999990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        opacity: isVisible && !isClosing ? 1 : 0,
        transition: "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isVisible && !isClosing ? "auto" : "none",
      }}>
      <div
        style={{
          backgroundColor: "#16161a",
          borderRadius: "28px",
          padding: "36px 24px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.85), 0 0 25px rgba(214, 168, 90, 0.18)",
          border: "1px solid rgba(214, 168, 90, 0.3)",
          transform:
            isVisible && !isClosing
              ? "scale(1) translateY(0)"
              : isClosing
              ? "scale(0.97) translateY(-8px)"
              : "scale(0.96) translateY(16px)",
          transition:
            "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
        {/* Logo Fotonic */}
        <div style={{ marginBottom: "20px" }}>
          <img
            src="/whitelogo1.png"
            alt="Fotonic Photo & Video Project"
            style={{
              maxWidth: "150px",
              height: "auto",
              margin: "0 auto",
              display: "block",
            }}
          />
        </div>

        {/* Heading Sapaan */}
        <h2
          style={{
            fontSize: "1.45rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "6px",
          }}>
          Halo, Kak <span style={{ color: "#f0cf8e" }}>{clientName}</span>! ✨
        </h2>

        {/* Tanggal Foto jika ada */}
        {photoDate && (
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#d6a85a",
              marginBottom: "16px",
              display: "inline-block",
              backgroundColor: "rgba(214, 168, 90, 0.1)",
              border: "1px solid rgba(214, 168, 90, 0.25)",
              borderRadius: "9999px",
              padding: "3px 12px",
            }}>
            <IconCalendar size={14} color="#d6a85a" style={{ marginRight: 6, verticalAlign: -2 }} /> Tanggal Sesi: {photoDate}
          </div>
        )}

        {/* Deskripsi */}
        <p
          style={{
            fontSize: "0.86rem",
            color: "#a1a1aa",
            lineHeight: "1.5",
            marginBottom: "22px",
          }}>
          Selamat datang di portal seleksi Fotonic.
          <br />
          Silakan tentukan foto-foto terbaik Anda yang akan diproses ke tahap
          retouch & color grading.
        </p>

        {/* Kotak Ketentuan */}
        <div
          style={{
            backgroundColor: "#0d0d10",
            borderRadius: "16px",
            padding: "16px",
            textAlign: "left",
            marginBottom: "26px",
            border: "1px solid rgba(214, 168, 90, 0.2)",
          }}>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#f0cf8e",
              marginBottom: "10px",
            }}>
            📌 Ketentuan Pemilihan :
          </div>
          <ul
            style={{
              fontSize: "0.8rem",
              color: "#d4d4d8",
              paddingLeft: "18px",
              lineHeight: "1.7",
              margin: 0,
            }}>
            <li>
              Pilih foto terbaik Anda (Maksimal{" "}
              <strong style={{ color: "#f0cf8e" }}>{maxPhotos} foto</strong>).
            </li>
            <li>Klik ikon ⛶ pada foto untuk melihat resolusi lebih besar.</li>
            <li>Foto yang dipilih dapat ditinjau ulang sebelum dikirim.</li>
          </ul>
        </div>

        {/* Tombol Mulai Memilih (Gold Brand Pill) */}
        <button
          onClick={handleStart}
          style={{
            width: "100%",
            height: "50px",
            background:
              "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
            color: "#09090b",
            border: "none",
            borderRadius: "9999px",
            fontSize: "0.95rem",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
            transition: "all 0.2s ease",
          }}>
          Mulai Memilih Foto →
        </button>
      </div>
    </div>
  );
}
