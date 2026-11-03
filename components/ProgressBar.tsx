"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { IconFolder } from "@/components/Icons";

export interface NavSectionItem {
  id: string;
  title: string;
  count: number;
}

interface ProgressBarProps {
  current: number;
  max: number;
  sections?: NavSectionItem[];
  activeSectionId?: string;
  onSelectSection?: (sectionId: string) => void;
}

function ProgressBarComponent({
  current,
  max,
  sections = [],
  activeSectionId,
  onSelectSection,
}: ProgressBarProps) {
  const isFull = current >= max;
  const percentage = Math.min((current / max) * 100, 100);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSections = sections.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "sticky",
        top: "12px",
        zIndex: 9999,
        margin: "0 auto 20px auto",
        maxWidth: "540px",
        width: "calc(100% - 24px)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
      {/* Tombol Navigasi Section di Sebelah ProgressBar (Khusus Mobile jika ada subfolder - Permintaan 1.a) */}
      {hasSections && (
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Navigasi Kategori Foto"
          title="Pilih Kategori / Folder"
          className="mobile-only-inline-flex"
          style={{
            height: "42px",
            minHeight: "42px",
            borderRadius: "9999px",
            backgroundColor: menuOpen ? "#d6a85a" : "rgba(9, 9, 11, 0.96)",
            color: menuOpen ? "#09090b" : "#f0cf8e",
            border: "1px solid rgba(214, 168, 90, 0.4)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(214, 168, 90, 0.12)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s ease",
            padding: "0 10px",
            gap: "5px",
          }}>
          <IconFolder size={18} color={menuOpen ? "#09090b" : "#f0cf8e"} />
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              maxWidth: "80px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
            {sections.find((s) => s.id === activeSectionId)?.title || "Folder"}
          </span>
        </button>
      )}

      {/* Pill ProgressBar Utama */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: "rgba(9, 9, 11, 0.96)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          transform: "translateZ(0)",
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
              transition: "width 0.3s ease",
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

      {/* Dropdown Daftar Section (Mobile) */}
      {hasSections && menuOpen && (
        <div
          className="mobile-only-flex"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            backgroundColor: "rgba(18, 18, 22, 0.98)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(214, 168, 90, 0.35)",
            borderRadius: "16px",
            padding: "8px",
            flexDirection: "column",
            gap: "4px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.85)",
            maxHeight: "60vh",
            overflowY: "auto",
            zIndex: 10000,
          }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#a1a1aa",
              padding: "4px 10px 6px 10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              marginBottom: "2px",
            }}>
            Navigasi Kategori Folder
          </div>
          {sections.map((sec) => {
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  onSelectSection?.(sec.id);
                  setMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: isActive
                    ? "1px solid rgba(214, 168, 90, 0.45)"
                    : "1px solid transparent",
                  backgroundColor: isActive
                    ? "rgba(214, 168, 90, 0.15)"
                    : "transparent",
                  color: isActive ? "#f0cf8e" : "#ededed",
                  fontSize: "0.84rem",
                  fontWeight: isActive ? 700 : 600,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: "8px",
                  }}>
                  {sec.title}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: isActive ? "#09090b" : "#f0cf8e",
                    backgroundColor: isActive
                      ? "#d6a85a"
                      : "rgba(214, 168, 90, 0.12)",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    flexShrink: 0,
                  }}>
                  {sec.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ProgressBar = memo(ProgressBarComponent);
export default ProgressBar;
