"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { IconPaper, IconPaperPlus, IconImage } from "./Icons";

export interface FullviewPhoto {
  id: string;
  name: string;
  isLandscape?: boolean;
  width?: number;
  height?: number;
}

interface PhotoModalProps {
  photos: FullviewPhoto[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  photoNotes?: Record<string, string>;
  onOpenNote?: (id: string, name: string) => void;
  isQuotaFull?: boolean;
}

export default function PhotoModal({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  selectedIds,
  onToggle,
  photoNotes = {},
  onOpenNote,
  isQuotaFull = false,
}: PhotoModalProps) {
  const safeIndex = photos && photos.length > 0 ? Math.max(0, Math.min(currentIndex, photos.length - 1)) : 0;
  const currentPhoto = photos && photos.length > 0 ? photos[safeIndex] : null;
  const isSelected = currentPhoto ? selectedIds.includes(currentPhoto.id) : false;
  const currentNote = currentPhoto ? photoNotes[currentPhoto.id] || "" : "";
  const hasNote = Boolean(currentNote && currentNote.trim().length > 0);

  // Status Zoom & Pan Independen (Sinkron dengan Ref DOM Langsung agar 60fps Tanpa Re-render Lag Saat Geser/Cubit)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const fullImgRef = useRef<HTMLImageElement | null>(null);
  const thumbImgRef = useRef<HTMLImageElement | null>(null);

  // Transisi Drop To Black antar gambar (200ms)
  const [isBlackout, setIsBlackout] = useState(false);

  // Status Loading Resolusi Penuh
  const [isFullLoaded, setIsFullLoaded] = useState(false);

  // Touch References untuk Ketuk Dua Kali Instan (Tanpa Hold), Pinch Zoom, & Swipe
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse References untuk Double-Click Cepat Desktop
  const mouseDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Helper mengaplikasikan transformasi langsung ke elemen DOM gambar (0ms latency tanpa React re-render)
  const applyTransformToDom = useCallback((z: number, p: { x: number; y: number }, animate: boolean) => {
    const transformStr = `translate3d(${p.x}px, ${p.y}px, 0) scale(${z})`;
    if (fullImgRef.current) {
      fullImgRef.current.style.transition = animate
        ? "opacity 160ms ease-out, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
        : "opacity 160ms ease-out";
      fullImgRef.current.style.transform = transformStr;
    }
    if (thumbImgRef.current) {
      thumbImgRef.current.style.transform = transformStr;
    }
  }, []);

    // Otomatis sinkronkan index atau tutup jika list foto kosong
  useEffect(() => {
    if (isOpen) {
      if (!photos || photos.length === 0) {
        onClose();
      } else if (currentIndex >= photos.length) {
        onNavigate(photos.length - 1);
      }
    }
  }, [isOpen, photos, currentIndex, onClose, onNavigate]);

  // Reset zoom & pan saat berpindah foto
  const resetZoom = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
    applyTransformToDom(1, { x: 0, y: 0 }, true);
  }, [applyTransformToDom]);

  useEffect(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsFullLoaded(false);
  }, [currentIndex]);

  // Preload foto sebelahnya (kiri & kanan) setelah foto saat ini selesai dimuat agar swipe berikutnya instan
  useEffect(() => {
    if (!isOpen || !isFullLoaded) return;
    const neighbors = [photos[currentIndex + 1], photos[currentIndex - 1]].filter(Boolean);
    const timers = neighbors.map((neighbor, i) =>
      setTimeout(() => {
        const preloader = new Image();
        preloader.src = `/api/thumbnail?id=${neighbor.id}&full=1`;
      }, 150 * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, [isOpen, isFullLoaded, currentIndex, photos]);

  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
  }, [isOpen]);

  // Fungsi Pindah Foto dengan Efek Transisi Drop to Black 200ms
  const changePhotoWithDropToBlack = useCallback(
    (newIdx: number) => {
      if (newIdx < 0 || newIdx >= photos.length || newIdx === currentIndex || isBlackout) return;
      setIsBlackout(true);
      setTimeout(() => {
        onNavigate(newIdx);
        setTimeout(() => {
          setIsBlackout(false);
        }, 30);
      }, 100);
    },
    [currentIndex, photos.length, onNavigate, isBlackout],
  );

  // Navigasi Keyboard (Panah Kiri, Kanan, Escape, Zoom +/-)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          changePhotoWithDropToBlack(currentIndex - 1);
        }
      } else if (e.key === "ArrowRight") {
        if (currentIndex < photos.length - 1) {
          changePhotoWithDropToBlack(currentIndex + 1);
        }
      } else if (e.key === "+" || e.key === "=") {
        const next = Math.min(4, Math.round((zoomRef.current + 0.35) * 10) / 10);
        zoomRef.current = next;
        setZoom(next);
        applyTransformToDom(next, panRef.current, true);
      } else if (e.key === "-") {
        const next = Math.max(1, Math.round((zoomRef.current - 0.35) * 10) / 10);
        zoomRef.current = next;
        if (next === 1) {
          panRef.current = { x: 0, y: 0 };
          setPan({ x: 0, y: 0 });
        }
        setZoom(next);
        applyTransformToDom(next, panRef.current, true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, photos.length, changePhotoWithDropToBlack, onClose, applyTransformToDom]);

  if (!isOpen || !currentPhoto) return null;

  // Zoom dengan Mouse Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    const next = Math.min(4, Math.max(1, Math.round((zoomRef.current + delta) * 100) / 100));
    zoomRef.current = next;
    if (next === 1) {
      panRef.current = { x: 0, y: 0 };
      setPan({ x: 0, y: 0 });
    }
    setZoom(next);
    applyTransformToDom(next, panRef.current, true);
  };

  // Toggle Zoom Cepat Instan (Double-Tap di HP / Double-Click di PC Tanpa Hold)
  const handleDoubleTapOrClick = (clientX?: number, clientY?: number) => {
    if (zoomRef.current > 1) {
      resetZoom();
    } else {
      const nextZoom = 2.5;
      let nextPan = { x: 0, y: 0 };
      if (typeof window !== "undefined" && clientX !== undefined && clientY !== undefined) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        nextPan = {
          x: Math.max(-window.innerWidth * 0.7, Math.min(window.innerWidth * 0.7, (centerX - clientX) * 1.3)),
          y: Math.max(-window.innerHeight * 0.7, Math.min(window.innerHeight * 0.7, (centerY - clientY) * 1.3)),
        };
      }
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
      applyTransformToDom(nextZoom, nextPan, true);
    }
  };

  // Handler Mouse Drag & Double-Click Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    if (zoomRef.current > 1) {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || zoomRef.current <= 1) return;
    const nextPan = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
    panRef.current = nextPan;
    applyTransformToDom(zoomRef.current, nextPan, false);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setPan(panRef.current);
    }
    if (!mouseDownPosRef.current) return;

    const moveDist = Math.hypot(
      e.clientX - mouseDownPosRef.current.x,
      e.clientY - mouseDownPosRef.current.y,
    );
    const duration = Date.now() - mouseDownPosRef.current.time;

    // Deteksi klik cepat
    if (moveDist < 6 && duration < 240) {
      const now = Date.now();
      const timeSinceLast = now - lastClickTimeRef.current;
      if (timeSinceLast > 30 && timeSinceLast < 380) {
        handleDoubleTapOrClick(e.clientX, e.clientY);
        lastClickTimeRef.current = 0;
      } else {
        lastClickTimeRef.current = now;
      }
    }
    mouseDownPosRef.current = null;
  };

  // Handler Touch: Double-Tap Instan (Tanpa Hold), Pinch Zoom, & Swipe Antar Foto
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Cubit Lebar (Pinch to zoom)
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoomRef.current;
      touchStartRef.current = null;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (zoomRef.current > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = { x: touch.clientX - panRef.current.x, y: touch.clientY - panRef.current.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = dist / pinchStartDistRef.current;
      const nextZoom = Math.min(4, Math.max(1, pinchStartZoomRef.current * ratio));
      zoomRef.current = nextZoom;
      if (nextZoom === 1) {
        panRef.current = { x: 0, y: 0 };
      }
      applyTransformToDom(nextZoom, panRef.current, false);
    } else if (e.touches.length === 1 && isDraggingRef.current && zoomRef.current > 1) {
      const touch = e.touches[0];
      const nextPan = {
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      };
      panRef.current = nextPan;
      applyTransformToDom(zoomRef.current, nextPan, false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const wasPinching = pinchStartDistRef.current !== null;
    pinchStartDistRef.current = null;

    if (isDraggingRef.current || wasPinching) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setZoom(zoomRef.current);
      setPan(panRef.current);
    }

    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const moveDist = Math.hypot(deltaX, deltaY);

    // KETUK DUA KALI (DOUBLE-TAP) CEPAT & RINGAN TANPA HOLD:
    if (deltaTime < 260 && moveDist < 15) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;
      const distFromLastTap = Math.hypot(
        touch.clientX - lastTapPosRef.current.x,
        touch.clientY - lastTapPosRef.current.y,
      );

      if (timeSinceLastTap > 40 && timeSinceLastTap < 400 && distFromLastTap < 45) {
        handleDoubleTapOrClick(touch.clientX, touch.clientY);
        lastTapTimeRef.current = 0;
        touchStartRef.current = null;
        return;
      } else {
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }

    // Geser swipe navigasi foto saat zoom normal (1x)
    if (zoomRef.current === 1 && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && deltaTime < 450) {
      if (deltaX < 0 && currentIndex < photos.length - 1) {
        changePhotoWithDropToBlack(currentIndex + 1);
      } else if (deltaX > 0 && currentIndex > 0) {
        changePhotoWithDropToBlack(currentIndex - 1);
      }
    }

    touchStartRef.current = null;
  };

  return (
    <div
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        zIndex: 1000000,
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      {/* ========================================================
          1. POJOK KIRI ATAS: NAMA FILE
          Dengan Background Transparan Gelap Mewah & Border Gold
          ======================================================== */}
      <div
        title={currentPhoto.name}
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          backgroundColor: "rgba(18, 18, 22, 0.85)",
          color: "#ffffff",
          border: "1px solid rgba(214, 168, 90, 0.35)",
          borderRadius: "12px",
          padding: "8px 16px",
          fontSize: "0.84rem",
          fontWeight: 700,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.7)",
          maxWidth: "calc(60vw - 32px)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
        <IconImage size={16} color="#d6a85a" style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{currentPhoto.name}</span>
      </div>

      {/* ========================================================
          2. POJOK KANAN ATAS: FOTO KE BERAPA DARI BERAPA
          Dengan Background Transparan Gelap Mewah
          ======================================================== */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          backgroundColor: "rgba(18, 18, 22, 0.85)",
          color: "#f0cf8e",
          border: "1px solid rgba(214, 168, 90, 0.35)",
          borderRadius: "9999px",
          padding: "8px 16px",
          fontSize: "0.85rem",
          fontWeight: 800,
          letterSpacing: "0.03em",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.7)",
          zIndex: 60,
        }}>
        {currentIndex + 1} / {photos.length}
      </div>

      {/* ========================================================
          3. AREA PANGGUNG FOTO UTAMA
          - Resolusi maksimal sesuai sumber (full=1)
          - Zoom via pinch to zoom atau double-tap instan tanpa hold
          - Transisi drop to black 200ms
          ======================================================== */}
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={(e) => handleDoubleTapOrClick(e.clientX, e.clientY)}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          zIndex: 10,
          touchAction: "none",
          WebkitTouchCallout: "none",
        }}>
        {/* Indikator Loading Ringan jika Full-Res Belum Siap */}
        {!isFullLoaded && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              zIndex: 25,
              pointerEvents: "none",
            }}>
            {/* Animasi Spinner Emas Fotonic */}
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                border: "3px solid rgba(214, 168, 90, 0.2)",
                borderTopColor: "#d6a85a",
                animation: "spin 0.75s linear infinite",
                boxShadow: "0 0 16px rgba(214, 168, 90, 0.35)",
              }}
            />
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 600,
                color: "#f0cf8e",
                backgroundColor: "rgba(9, 9, 11, 0.8)",
                border: "1px solid rgba(214, 168, 90, 0.25)",
                padding: "3px 12px",
                borderRadius: "9999px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
              }}>
              Memuat Resolusi Penuh...
            </span>
          </div>
        )}

        {/* Gambar Low-Res Cepat dari Cache Sebagai Placeholder Sementara */}
        {!isFullLoaded && (
          <img
            ref={thumbImgRef}
            src={`/api/thumbnail?id=${currentPhoto.id}`}
            alt={currentPhoto.name}
            draggable={false}
            style={{
              maxWidth: "100vw",
              maxHeight: "100vh",
              objectFit: "contain",
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "center center",
              position: "absolute",
              pointerEvents: "none",
              opacity: isBlackout ? 0 : 0.8,
              transition: isBlackout ? "opacity 100ms ease-in" : "none",
            }}
          />
        )}

        {/* Gambar Resolusi Maksimal Asli dari Sumber Google Drive */}
        <img
          ref={fullImgRef}
          key={currentPhoto.id}
          src={`/api/thumbnail?id=${currentPhoto.id}&full=1`}
          alt={currentPhoto.name}
          decoding="async"
          onLoad={() => setIsFullLoaded(true)}
          onError={() => setIsFullLoaded(true)}
          draggable={false}
          style={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            objectFit: "contain",
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
            willChange: "transform, opacity",
            opacity: isBlackout || !isFullLoaded ? 0 : 1,
            transition: isBlackout
              ? "opacity 100ms ease-in"
              : isDragging
              ? "none"
              : "opacity 160ms ease-out, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "auto",
          }}
        />
      </div>

      {/* ========================================================
          4. POJOK KIRI BAWAH: TOMBOL KEMBALI / MINIMIZE
          Dengan Background Transparan Gelap Mewah
          ======================================================== */}
      <button
        onClick={onClose}
        title="Kembali / Tutup Pratinjau (ESC)"
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          backgroundColor: "rgba(18, 18, 22, 0.85)",
          color: "#f0cf8e",
          border: "1px solid rgba(214, 168, 90, 0.35)",
          borderRadius: "10px",
          width: "42px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "1.2rem",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.7)",
          zIndex: 60,
          transition: "transform 0.15s ease, border-color 0.15s ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
        onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}>
        ⛶
      </button>

      {/* ========================================================
          5. POJOK KANAN BAWAH: CATATAN KHUSUS + TOMBOL PILIH FOTO
          Bersebelahan dengan Background Mewah
          ======================================================== */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 60,
        }}>
        {/* Tombol Catatan Khusus Foto (Muncul jika onOpenNote tersedia) */}
        {onOpenNote && (
          <button
            onClick={() => {
              if (isQuotaFull && !isSelected) return;
              onOpenNote(currentPhoto.id, currentPhoto.name);
            }}
            disabled={isQuotaFull && !isSelected}
            title={
              isQuotaFull && !isSelected
                ? "Pilihan catatan dinonaktifkan (kuota foto telah terpenuhi)"
                : hasNote
                ? `Catatan: "${currentNote}"`
                : "Tambah Catatan Khusus untuk Foto Ini"
            }
            style={{
              backgroundColor: hasNote ? "rgba(214, 168, 90, 0.22)" : "rgba(18, 18, 22, 0.85)",
              color: isQuotaFull && !isSelected ? "rgba(240, 207, 142, 0.35)" : "#f0cf8e",
              border: hasNote
                ? "1.5px solid #d6a85a"
                : isQuotaFull && !isSelected
                ? "1px solid rgba(255, 255, 255, 0.12)"
                : "1px solid rgba(214, 168, 90, 0.35)",
              borderRadius: "9999px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: isQuotaFull && !isSelected ? "not-allowed" : "pointer",
              opacity: isQuotaFull && !isSelected ? 0.35 : 1,
              fontSize: "0.8rem",
              fontWeight: 700,
              boxShadow: isQuotaFull && !isSelected ? "none" : "0 4px 16px rgba(0, 0, 0, 0.7)",
              transition: "transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, opacity 0.2s ease",
            }}
            onMouseDown={(e) => {
              if (!isQuotaFull || isSelected) {
                e.currentTarget.style.transform = "scale(0.94)";
              }
            }}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onTouchStart={(e) => {
              if (!isQuotaFull || isSelected) {
                e.currentTarget.style.transform = "scale(0.94)";
              }
            }}
            onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}>
            {hasNote ? (
              <IconPaper size={17} color={isQuotaFull && !isSelected ? "rgba(240, 207, 142, 0.35)" : "#f0cf8e"} />
            ) : (
              <IconPaperPlus size={17} color={isQuotaFull && !isSelected ? "rgba(214, 168, 90, 0.35)" : "#d6a85a"} />
            )}
            {hasNote ? (
              <span style={{ fontSize: "0.74rem", maxWidth: "80px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Catatan
              </span>
            ) : (
              <span style={{ fontSize: "0.74rem" }}>Catatan</span>
            )}
          </button>
        )}

        {/* Tombol Pilih Foto */}
        <button
          onClick={() => {
            if (isQuotaFull && !isSelected) return;
            onToggle(currentPhoto.id);
          }}
          title={isSelected ? "Batalkan Pilihan Foto Ini" : "Pilih Foto Ini"}
          style={{
            background: isSelected
              ? "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)"
              : "rgba(18, 18, 22, 0.85)",
            color: isSelected ? "#09090b" : "#f0cf8e",
            border: isSelected ? "none" : "1px solid rgba(214, 168, 90, 0.35)",
            borderRadius: "9999px",
            padding: "8px 18px",
            fontSize: "0.84rem",
            fontWeight: 800,
            cursor: isQuotaFull && !isSelected ? "not-allowed" : "pointer",
            opacity: isQuotaFull && !isSelected ? 0.45 : 1,
            boxShadow: isSelected
              ? "0 4px 16px rgba(214, 168, 90, 0.45)"
              : "0 4px 16px rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}>
          <span>{isSelected ? "✓" : "+"}</span>
          <span>{isSelected ? "Terpilih" : "Pilih"}</span>
        </button>
      </div>
    </div>
  );
}
