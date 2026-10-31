"use client";

import React from "react";

interface ProgressBarProps {
  current: number;
  max: number;
}

export default function ProgressBar({ current, max }: ProgressBarProps) {
  const isFull = current >= max;
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div
      style={{
        position: "sticky",
        top: "12px",
        zIndex: 9999,
        margin: "0 auto 20px auto",
        maxWidth: "500px",
        width: "calc(100% - 24px)",
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "9999px",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(214, 168, 90, 0.12)",
        border: "1px solid rgba(214, 168, 90, 0.35)",
      }}>
      {/* Bar Track */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#1c1c22",
          height: "8px",
          borderRadius: "9999px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}>
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: isFull
              ? "linear-gradient(90deg, #10b981, #22c55e)"
              : current > 0
              ? "linear-gradient(90deg, #b9853a, #d6a85a 60%, #f0cf8e 100%)"
              : "#27272a",
            borderRadius: "9999px",
            transition: "width 0.35s ease, background 0.35s ease",
            boxShadow: isFull
              ? "0 0 10px rgba(34, 197, 94, 0.5)"
              : current > 0
              ? "0 0 10px rgba(214, 168, 90, 0.5)"
              : "none",
          }}
        />
      </div>

      {/* Badge Penghitung Foto (Kontras Tinggi & Sangat Terbaca) */}
      <div
        style={{
          fontSize: "0.82rem",
          fontWeight: 800,
          color: isFull ? "#4ade80" : current > 0 ? "#f0cf8e" : "#a1a1aa",
          backgroundColor: isFull
            ? "rgba(34, 197, 94, 0.18)"
            : current > 0
            ? "rgba(214, 168, 90, 0.15)"
            : "rgba(255, 255, 255, 0.05)",
          border: isFull
            ? "1px solid rgba(34, 197, 94, 0.45)"
            : current > 0
            ? "1px solid rgba(214, 168, 90, 0.4)"
            : "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "9999px",
          padding: "4px 10px",
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}>
        <span>{current}</span>
        <span style={{ opacity: 0.6 }}>/</span>
        <span>{max}</span>
        <span style={{ fontSize: "0.72rem", opacity: 0.85, fontWeight: 600 }}>Foto</span>
      </div>
    </div>
  );
}
