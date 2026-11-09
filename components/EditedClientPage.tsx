"use client";

import React, { Suspense, useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import { useSearchParams } from "next/navigation";
import HeroBanner from "@/components/HeroBanner";
import PhotoModal from "@/components/PhotoModal";
import Footer from "@/components/Footer";
import MasonryGallery from "@/components/MasonryGallery";
import LoadingScreen from "@/components/LoadingScreen";
import DraftSavedModal from "@/components/DraftSavedModal";
import LockedSessionModal from "@/components/LockedSessionModal";
import PhotoNoteModal from "@/components/PhotoNoteModal";
import ExpiredLockScreen from "@/components/ExpiredLockScreen";
import { IconPaper, IconPaperPlus, IconCalendar, IconImage, IconFolder } from "@/components/Icons";
import { forceUnlockScroll } from "@/lib/scrollLock";

interface Photo {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  width?: number;
  height?: number;
  isLandscape?: boolean;
  folderId?: string;
  folderName?: string;
}

interface FolderSection {
  id: string;
  title: string;
  count: number;
}

interface FolderInfo {
  id: string;
  folderName: string;
  clientName: string;
  photoDate: string | null;
  maxPhotos: number;
}

function extractFolderId(input?: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return trimmed.split("?")[0].split("&")[0].trim();
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

/**
 * Hook Progressive High-Resolution Image Loader untuk Kartu Foto Editan:
 * - Saat user sedang scroll cepat, kartu hanya merender thumbnail ringan (=w600) agar scroll 60fps bebas lag.
 * - Ketika kartu berhenti di layar (terlihat selama 250ms), gambar HD (=s1600) di-decode di background thread
 *   via img.decode() lalu diganti secara mulus tanpa membebani main thread / GPU.
 */
function useProgressiveCardImage(photoId: string) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState(`/api/thumbnail?id=${photoId}`);
  const upgradedRef = useRef(false);

  useEffect(() => {
    setSrc(`/api/thumbnail?id=${photoId}`);
    upgradedRef.current = false;
  }, [photoId]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || upgradedRef.current || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !upgradedRef.current) {
          timer = setTimeout(() => {
            if (cancelled || upgradedRef.current) return;
            const hdUrl = `/api/thumbnail?id=${photoId}&full=1`;
            const img = new Image();
            img.decoding = "async";
            img.src = hdUrl;

            const applyUpgrade = () => {
              if (cancelled) return;
              upgradedRef.current = true;
              setSrc(hdUrl);
              observer.disconnect();
            };

            if (typeof img.decode === "function") {
              img.decode().then(applyUpgrade).catch(() => {});
            } else {
              img.onload = applyUpgrade;
            }
          }, 260);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { rootMargin: "80px 0px", threshold: 0.15 }
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [photoId]);

  return { cardRef, src };
}

/**
 * Kartu Foto Galeri Hasil Editan (Tanpa Pilih Foto, Fokus Preview Resolusi Maksimal & Komentar)
 */
const EditedGalleryCard = memo(function EditedGalleryCard({
  photo,
  noteText,
  onPreview,
  onOpenNote,
}: {
  photo: Photo;
  noteText?: string;
  onPreview: (id: string, name: string) => void;
  onOpenNote: (id: string, name: string) => void;
}) {
  const hasNote = Boolean(noteText && noteText.trim().length > 0);
  const { cardRef, src } = useProgressiveCardImage(photo.id);

  const computedAspectRatio =
    photo.width && photo.height
      ? `${photo.width} / ${photo.height}`
      : photo.isLandscape !== undefined
      ? photo.isLandscape
        ? "3 / 2"
        : "2 / 3"
      : undefined;

  return (
    <div
      ref={cardRef}
      onClick={() => onPreview(photo.id, photo.name)}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#111114",
        cursor: "pointer",
        outline: hasNote ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: hasNote
          ? "0 2px 10px rgba(214, 168, 90, 0.4)"
          : "0 1px 4px rgba(0, 0, 0, 0.3)",
        userSelect: "none",
        touchAction: "manipulation",
        aspectRatio: computedAspectRatio,
        contain: "layout style paint",
      }}>
      <img
        src={src}
        alt={photo.name}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
          borderRadius: "10px",
        }}
      />

      {/* Gradasi Bawah: Nama Foto & Indikator Komentar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background:
            "linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.45) 65%, transparent 100%)",
          padding: "18px 9px 7px 9px",
          pointerEvents: "none",
          borderRadius: "0 0 10px 10px",
          zIndex: 4,
        }}>
        <span
          title={photo.name}
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: hasNote ? "#f0cf8e" : "#ededed",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.9)",
          }}>
          {photo.name}
        </span>
        {hasNote && (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "#d6a85a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
              marginTop: "1px",
            }}>
            💬 {noteText}
          </span>
        )}
      </div>

      {/* Outline Emas Halus jika Foto Memiliki Komentar */}
      {hasNote && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "10px",
            border: "2.5px solid #d6a85a",
            pointerEvents: "none",
            boxSizing: "border-box",
            zIndex: 8,
          }}
        />
      )}

      {/* Pojok Kiri Atas: Tombol Beri Komentar / Catatan pada Foto */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenNote(photo.id, photo.name);
        }}
        title={hasNote ? `Komentar: "${noteText}" (Klik untuk ubah)` : "Beri Komentar pada Foto Ini"}
        style={{
          position: "absolute",
          top: "7px",
          left: "7px",
          height: "26px",
          padding: "0 8px",
          borderRadius: "9999px",
          backgroundColor: hasNote ? "rgba(214, 168, 90, 0.94)" : "rgba(18, 18, 22, 0.88)",
          color: hasNote ? "#09090b" : "#f0cf8e",
          border: hasNote ? "1.5px solid #d6a85a" : "1px solid rgba(214, 168, 90, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          cursor: "pointer",
          touchAction: "manipulation",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.5)",
          zIndex: 10,
        }}>
        {hasNote ? (
          <IconPaper size={13} color="#09090b" />
        ) : (
          <IconPaperPlus size={13} color="#d6a85a" />
        )}
        <span style={{ fontSize: "0.64rem", fontWeight: 700, lineHeight: 1 }}>
          {hasNote ? "Edit" : "Komentar"}
        </span>
      </button>

      {/* Pojok Kanan Atas: Tombol Perbesar Fullview Resolusi Maksimal */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(photo.id, photo.name);
        }}
        title="Buka Pratinjau Resolusi Maksimal"
        style={{
          position: "absolute",
          top: "7px",
          right: "7px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          backgroundColor: "rgba(18, 18, 22, 0.88)",
          color: "#f0cf8e",
          border: "1px solid rgba(214, 168, 90, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          touchAction: "manipulation",
          fontSize: "0.78rem",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.4)",
          zIndex: 10,
        }}>
        ⛶
      </button>
    </div>
  );
});

/**
 * Kartu Foto pada Halaman Preview Hasil Editan (Tanpa Tombol Pilih/Unselect, Responsif Mobile & Desktop)
 */
const EditedPreviewCard = memo(function EditedPreviewCard({
  photo,
  noteText,
  onPreview,
  onOpenNote,
}: {
  photo: Photo;
  noteText?: string;
  onPreview: (id: string, name: string) => void;
  onOpenNote: (id: string, name: string) => void;
}) {
  const hasNote = Boolean(noteText && noteText.trim().length > 0);
  const { cardRef, src } = useProgressiveCardImage(photo.id);

  const computedAspectRatio =
    photo.width && photo.height
      ? `${photo.width} / ${photo.height}`
      : photo.isLandscape !== undefined
      ? photo.isLandscape
        ? "3 / 2"
        : "2 / 3"
      : undefined;

  return (
    <div
      ref={cardRef}
      style={{
        backgroundColor: "#16161a",
        borderRadius: "16px",
        padding: "8px",
        border: hasNote ? "2px solid #d6a85a" : "1px solid rgba(214, 168, 90, 0.28)",
        boxShadow: hasNote
          ? "0 2px 12px rgba(214, 168, 90, 0.22)"
          : "0 2px 8px rgba(0, 0, 0, 0.35)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        touchAction: "manipulation",
        contain: "layout style paint",
      }}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onPreview(photo.id, photo.name);
        }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: computedAspectRatio,
          borderRadius: "11px",
          overflow: "hidden",
          backgroundColor: "#0d0d10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}>
        <img
          src={src}
          alt={photo.name}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            borderRadius: "11px",
          }}
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(photo.id, photo.name);
          }}
          title="Lihat Pratinjau Resolusi Maksimal"
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            backgroundColor: "rgba(18, 18, 22, 0.88)",
            color: "#f0cf8e",
            border: "1px solid rgba(214, 168, 90, 0.4)",
            borderRadius: "6px",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "0.75rem",
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          }}>
          ⛶
        </button>
      </div>

      {/* Nama File */}
      <div
        style={{
          padding: "7px 2px 2px 2px",
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}>
        <IconImage size={14} color="#d6a85a" style={{ flexShrink: 0 }} />
        <span
          title={photo.name}
          style={{
            fontSize: "0.76rem",
            fontWeight: 700,
            color: "#ffffff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
            width: "100%",
          }}>
          {photo.name}
        </span>
      </div>

      {/* Tombol Komentar Per Foto */}
      <div style={{ width: "100%", marginTop: "5px" }}>
        {hasNote ? (
          <button
            type="button"
            onClick={() => onOpenNote(photo.id, photo.name)}
            title={`Komentar: "${noteText}" (Klik untuk edit)`}
            style={{
              width: "100%",
              backgroundColor: "rgba(214, 168, 90, 0.14)",
              border: "1px solid rgba(214, 168, 90, 0.4)",
              borderRadius: "8px",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              textAlign: "left",
              boxSizing: "border-box",
            }}>
            <IconPaper size={14} color="#f0cf8e" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: "0.7rem",
                color: "#f0cf8e",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}>
              {noteText}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenNote(photo.id, photo.name)}
            title="Tambah komentar untuk foto ini"
            style={{
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed rgba(255, 255, 255, 0.18)",
              borderRadius: "8px",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              color: "#a1a1aa",
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
              boxSizing: "border-box",
            }}>
            <IconPaperPlus size={14} color="#d6a85a" style={{ flexShrink: 0 }} />
            <span>Beri Komentar</span>
          </button>
        )}
      </div>
    </div>
  );
});

function EditedGalleryContent() {
  const searchParams = useSearchParams();

  const rawFolderParam = searchParams.get("folder_id");
  const folderId = extractFolderId(rawFolderParam);

  const urlClient = searchParams.get("klien");
  const urlDate = searchParams.get("date") || searchParams.get("tanggal");

  const [manualInput, setManualInput] = useState("");
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);

  const clientName = urlClient || folderInfo?.clientName || "Klien Fotonic";
  const photoDate = urlDate || folderInfo?.photoDate || null;

  useEffect(() => {
    const resolvedName = urlClient || folderInfo?.clientName;
    if (resolvedName && typeof document !== "undefined") {
      document.title = `Fotonic - Hasil Edit Foto ${resolvedName}`;
    }
  }, [urlClient, folderInfo?.clientName]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hasSubfolders, setHasSubfolders] = useState<boolean>(false);
  const [sections, setSections] = useState<FolderSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [noEditedFolder, setNoEditedFolder] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Navigasi Section & Slide View Komentar (Desktop & Mobile)
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isSlideViewOpen, setIsSlideViewOpen] = useState<boolean>(true);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const stickyBarRef = useRef<HTMLDivElement | null>(null);

  // Status Tampilan: 'gallery' | 'preview' | 'success'
  const [currentView, setCurrentView] = useState<"gallery" | "preview" | "success">("gallery");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftSavedModal, setShowDraftSavedModal] = useState(false);
  const [showResumeDraftModal, setShowResumeDraftModal] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  // Komentar per foto & catatan umum
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [activeNoteModalPhoto, setActiveNoteModalPhoto] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Sesi Terkunci Sebelumnya
  const [lockedSessionData, setLockedSessionData] = useState<{
    waktu: string;
    clientName: string;
    count: number;
    notes: string;
    photoNotes: Record<string, string>;
    photoCommentsRaw: string;
  } | null>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);

  // Fullview Modal
  const [fullviewIndex, setFullviewIndex] = useState<number | null>(null);

  // Pastikan scroll selalu terbuka begitu loading selesai dan tidak ada modal penghalang
  useEffect(() => {
    if (
      !isLoading &&
      !showLockedModal &&
      !showResumeDraftModal &&
      !showDraftSavedModal &&
      fullviewIndex === null &&
      activeNoteModalPhoto === null
    ) {
      forceUnlockScroll();
    }
  }, [
    isLoading,
    showLockedModal,
    showResumeDraftModal,
    showDraftSavedModal,
    fullviewIndex,
    activeNoteModalPhoto,
  ]);

  // Tutup dropdown navigasi mobile jika klik di luar
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (stickyBarRef.current && !stickyBarRef.current.contains(e.target as Node)) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileNavOpen]);

  // Sistem Riwayat Navigasi Tombol Kembali (Back Button HP) Tanpa Reload / Keluar Web
  const ignoreNextPopStateRef = useRef(false);
  const navStateRef = useRef({
    currentView,
    fullviewIndex,
    activeNoteModalPhoto,
    showDraftSavedModal,
  });
  navStateRef.current = {
    currentView,
    fullviewIndex,
    activeNoteModalPhoto,
    showDraftSavedModal,
  };

  const pushNavLayer = useCallback((layer: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({ fotonicEditedLayer: layer }, "");
    }
  }, []);

  const popNavLayerSilently = useCallback((expectedLayer: string) => {
    if (
      typeof window !== "undefined" &&
      window.history.state &&
      window.history.state.fotonicEditedLayer === expectedLayer
    ) {
      ignoreNextPopStateRef.current = true;
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false;
        return;
      }

      const nav = navStateRef.current;
      if (nav.activeNoteModalPhoto !== null) {
        setActiveNoteModalPhoto(null);
      } else if (nav.fullviewIndex !== null) {
        setFullviewIndex(null);
      } else if (nav.showDraftSavedModal) {
        setShowDraftSavedModal(false);
        forceUnlockScroll();
      } else if (nav.currentView === "preview") {
        setCurrentView("gallery");
        forceUnlockScroll();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!folderId) {
      setIsLoading(false);
      return;
    }

    async function fetchEditedData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const [res, sessRes] = await Promise.all([
          fetch(`/api/photos?folder_id=${encodeURIComponent(folderId)}&mode=edited`),
          fetch(`/api/session?folder_id=${encodeURIComponent(folderId)}&mode=edited`).catch(
            () => null
          ),
        ]);

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengambil foto hasil editan.");

        if (data.folder) {
          setFolderInfo(data.folder);
        }

        if (data.isExpired) {
          setIsExpired(true);
          setPhotos([]);
          return;
        }

        setNoEditedFolder(Boolean(data.noEditedFolder));
        setPhotos(data.photos || []);
        setHasSubfolders(Boolean(data.hasSubfolders));
        setSections(data.sections || []);
        if (data.sections && data.sections.length > 0) {
          setActiveSectionId(data.sections[0].id);
        }

        if (sessRes && sessRes.ok) {
          try {
            const sessData = await sessRes.json();
            if (sessData.hasPreviousSession) {
              if (sessData.status === "TERKUNCI") {
                setLockedSessionData(sessData);
                setShowLockedModal(true);
              } else if (sessData.status === "DRAF") {
                if (sessData.notes) setNotes(sessData.notes);
                if (sessData.photoNotes) setPhotoNotes(sessData.photoNotes);
                setShowResumeDraftModal(true);
              }
            }
          } catch {
            // Abaikan error parse sesi
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memuat foto hasil editan dari Google Drive.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEditedData();
  }, [folderId]);

  const sectionsWithPhotos = useMemo(() => {
    if (!hasSubfolders || sections.length === 0) return [];
    return sections
      .map((sec) => ({
        ...sec,
        secPhotos: photos.filter(
          (p) => p.folderId === sec.id || p.folderName === sec.title
        ),
      }))
      .filter((sec) => sec.secPhotos.length > 0);
  }, [hasSubfolders, sections, photos]);

  // ScrollSpy untuk memperbarui section aktif saat scroll di mobile/desktop
  useEffect(() => {
    if (sectionsWithPhotos.length <= 1) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const offsetTop = 130;
          let currentSecId = sectionsWithPhotos[0]?.id;

          for (const sec of sectionsWithPhotos) {
            const el = document.getElementById(`section-${sec.id}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= offsetTop) {
                currentSecId = sec.id;
              }
            }
          }

          if (currentSecId) {
            setActiveSectionId((prev) => (prev !== currentSecId ? currentSecId : prev));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionsWithPhotos]);

  // Foto-foto yang sudah diberi komentar
  const commentedPhotosList = useMemo(
    () =>
      photos.filter((p) => {
        const txt = photoNotes[p.id];
        return Boolean(txt && txt.trim().length > 0);
      }),
    [photos, photoNotes]
  );

  const handleSelectSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    setMobileNavOpen(false);
    if (typeof document !== "undefined") {
      const target = document.getElementById(`section-${sectionId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  const handleOpenPreview = useCallback(
    (id: string) => {
      if (navStateRef.current.fullviewIndex === null) {
        pushNavLayer("fullview");
      }
      const idx = photos.findIndex((p) => p.id === id);
      setFullviewIndex(idx >= 0 ? idx : 0);
    },
    [photos, pushNavLayer]
  );

  const handleCloseFullview = useCallback(() => {
    setFullviewIndex(null);
    popNavLayerSilently("fullview");
  }, [popNavLayerSilently]);

  const handleOpenNoteModal = useCallback(
    (id: string, name: string) => {
      if (navStateRef.current.activeNoteModalPhoto === null) {
        pushNavLayer("note");
      }
      setActiveNoteModalPhoto({ id, name });
    },
    [pushNavLayer]
  );

  const handleCloseNoteModal = useCallback(() => {
    setActiveNoteModalPhoto(null);
    popNavLayerSilently("note");
  }, [popNavLayerSilently]);

  const handleGoToPreview = useCallback(() => {
    pushNavLayer("preview");
    setCurrentView("preview");
    forceUnlockScroll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pushNavLayer]);

  const handleBackToGallery = useCallback(() => {
    setCurrentView("gallery");
    setFullviewIndex(null);
    setActiveNoteModalPhoto(null);
    forceUnlockScroll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    popNavLayerSilently("preview");
  }, [popNavLayerSilently]);

  const renderGalleryCard = useCallback(
    (photo: Photo) => (
      <EditedGalleryCard
        photo={photo}
        noteText={photoNotes[photo.id]}
        onPreview={handleOpenPreview}
        onOpenNote={handleOpenNoteModal}
      />
    ),
    [photoNotes, handleOpenPreview, handleOpenNoteModal]
  );

  const renderPreviewCard = useCallback(
    (photo: Photo) => (
      <EditedPreviewCard
        photo={photo}
        noteText={photoNotes[photo.id]}
        onPreview={handleOpenPreview}
        onOpenNote={handleOpenNoteModal}
      />
    ),
    [photoNotes, handleOpenPreview, handleOpenNoteModal]
  );

  const handleSaveDraft = async () => {
    if (!folderId || photos.length === 0) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId,
          clientName,
          notes,
          photoNotes,
          isDraft: true,
          mode: "edited",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan sementara.");
      setShowDraftSavedModal(true);
    } catch (err: any) {
      alert(`Gagal menyimpan sementara: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!folderId || photos.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId,
          clientName,
          notes,
          photoNotes,
          isDraft: false,
          mode: "edited",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim konfirmasi hasil editan.");
      setCurrentView("success");
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = extractFolderId(manualInput);
    if (!cleaned) {
      alert("Harap masukkan link Google Drive atau ID folder yang valid.");
      return;
    }
    window.location.href = `/edited?folder_id=${encodeURIComponent(cleaned)}`;
  };

  // Pesan WhatsApp untuk Konfirmasi Hasil Editan
  const waMessage = useMemo(() => {
    const commentLines = commentedPhotosList.map(
      (p, i) => `${i + 1}. ${p.name}: "${photoNotes[p.id]}"`
    );
    const commentsSection =
      commentLines.length > 0
        ? `\n\nKomentar Per Foto (${commentLines.length} foto):\n${commentLines.join("\n")}`
        : "\n\nSemua foto hasil editan sudah sesuai (tanpa revisi per foto).";
    const generalNotesSection = notes.trim()
      ? `\n\nCatatan Umum:\n"${notes.trim()}"`
      : "";
    return `Halo Tim Fotonic, saya ${clientName}.\nSaya telah meninjau ${photos.length} foto hasil editan:${commentsSection}${generalNotesSection}\n\nMohon dicek ya, terima kasih!`;
  }, [clientName, photos.length, commentedPhotosList, photoNotes, notes]);

  const waUrl = `https://wa.me/6281994218428?text=${encodeURIComponent(waMessage)}`;

  if (!folderId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
        }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 16px",
          }}>
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              backgroundColor: "#16161a",
              borderRadius: "28px",
              padding: "40px 24px",
              textAlign: "center",
              border: "1px solid rgba(214, 168, 90, 0.3)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 25px rgba(214, 168, 90, 0.15)",
            }}>
            <img
              src="/whitelogo1.png"
              alt="Fotonic Photo & Video Project"
              style={{
                maxWidth: "140px",
                height: "auto",
                margin: "0 auto 20px auto",
                display: "block",
              }}
            />

            <h2
              style={{
                fontSize: "1.45rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "8px",
              }}>
              Portal Review Hasil Edit Foto
            </h2>
            <p
              style={{
                color: "#a1a1aa",
                fontSize: "0.88rem",
                lineHeight: "1.5",
                marginBottom: "26px",
              }}>
              Silakan masukkan tautan atau ID folder Google Drive klien untuk melihat hasil editan foto:
            </p>

            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste link Google Drive atau Folder ID..."
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  backgroundColor: "#0d0d10",
                  border: "1px solid rgba(214, 168, 90, 0.35)",
                  borderRadius: "14px",
                  color: "#ededed",
                  fontSize: "0.9rem",
                  outline: "none",
                  marginBottom: "16px",
                }}
              />

              <button
                type="submit"
                style={{
                  width: "100%",
                  height: "48px",
                  background:
                    "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                  color: "#09090b",
                  border: "none",
                  borderRadius: "9999px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
                }}>
                Buka Hasil Editan →
              </button>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
        }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 16px",
          }}>
          <div
            style={{
              maxWidth: "460px",
              backgroundColor: "#16161a",
              borderRadius: "24px",
              padding: "36px 24px",
              textAlign: "center",
              border: "1px solid rgba(214, 168, 90, 0.3)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}>
            <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              Perhatian
            </h2>
            <p style={{ color: "#a1a1aa", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "20px" }}>
              {errorMsg}
            </p>
            <a
              href="/edited"
              style={{
                display: "inline-block",
                color: "#f0cf8e",
                fontSize: "0.85rem",
                textDecoration: "underline",
              }}>
              ← Masukkan Ulang Link Folder
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoading && isExpired) {
    return <ExpiredLockScreen clientName={clientName} sessionDate={photoDate} />;
  }

  return (
    <div
      style={{
        backgroundColor: "transparent",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
      <div>
        {folderId && (
          <LoadingScreen
            isLoading={isLoading}
            folderDetected={Boolean(folderInfo) || Boolean(errorMsg)}
            clientName={folderInfo?.clientName || urlClient || undefined}
            onCrossfadeStart={() => {
              if (!showLockedModal && !showResumeDraftModal) {
                forceUnlockScroll();
              }
            }}
            onFinished={() => {
              if (!showLockedModal && !showResumeDraftModal) {
                forceUnlockScroll();
              }
            }}
          />
        )}

        {/* TAMPILAN 1: GALERI HASIL EDITAN */}
        {currentView === "gallery" && (
          <>
            <HeroBanner
              clientName={clientName}
              photoDate={photoDate}
              folderId={folderId}
              customQuotaLabel={`Hasil Editan (${photos.length} Foto)`}
            />

            {/* Sticky Status Bar Hasil Editan + Tombol Navigasi Mobile (GPU Isolated, Bebas Lag) */}
            <div
              ref={stickyBarRef}
              style={{
                position: "sticky",
                top: "12px",
                zIndex: 9999,
                margin: "0 auto 18px auto",
                maxWidth: "540px",
                width: "calc(100% - 20px)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transform: "translateZ(0)",
              }}>
              {sectionsWithPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((prev) => !prev)}
                  aria-label="Navigasi Kategori Foto"
                  title="Pilih Kategori / Folder"
                  className="mobile-only-inline-flex"
                  style={{
                    height: "42px",
                    minHeight: "42px",
                    borderRadius: "9999px",
                    backgroundColor: mobileNavOpen ? "#d6a85a" : "rgba(12, 12, 15, 0.96)",
                    color: mobileNavOpen ? "#09090b" : "#f0cf8e",
                    border: "1px solid rgba(214, 168, 90, 0.4)",
                    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.8)",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: "0 11px",
                    gap: "5px",
                    touchAction: "manipulation",
                  }}>
                  <IconFolder size={17} color={mobileNavOpen ? "#09090b" : "#f0cf8e"} />
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      maxWidth: "76px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                    {sectionsWithPhotos.find((s) => s.id === activeSectionId)?.title || "Folder"}
                  </span>
                </button>
              )}

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: "rgba(12, 12, 15, 0.96)",
                  transform: "translateZ(0)",
                  borderRadius: "9999px",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.8), 0 0 14px rgba(214, 168, 90, 0.1)",
                  border: "1px solid rgba(214, 168, 90, 0.35)",
                }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#ededed",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                  ✨ Hasil Editan Foto
                </span>
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: "#f0cf8e",
                    backgroundColor: "rgba(214, 168, 90, 0.15)",
                    border: "1px solid rgba(214, 168, 90, 0.4)",
                    borderRadius: "9999px",
                    padding: "3px 10px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                  {commentedPhotosList.length > 0
                    ? `${commentedPhotosList.length} Komentar`
                    : `${photos.length} Foto`}
                </span>
              </div>

              {sectionsWithPhotos.length > 0 && mobileNavOpen && (
                <div
                  className="mobile-only-flex"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(18, 18, 22, 0.98)",
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
                  {sectionsWithPhotos.map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => handleSelectSection(sec.id)}
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
                          {sec.secPhotos.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className="gallery-outer-container"
              style={{
                maxWidth: "1440px",
                margin: "0 auto",
                paddingBottom: "96px",
              }}>
              {isLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "80px 0",
                    color: "#d6a85a",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  }}>
                  Memuat foto hasil editan dari Google Drive Fotonic...
                </div>
              ) : noEditedFolder || photos.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "64px 20px",
                    color: "#a1a1aa",
                    backgroundColor: "#16161a",
                    borderRadius: "20px",
                    border: "1px solid rgba(214, 168, 90, 0.25)",
                    maxWidth: "560px",
                    margin: "20px auto",
                  }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "10px" }}>✨</div>
                  <h3 style={{ color: "#ffffff", fontSize: "1.15rem", fontWeight: 800, marginBottom: "6px" }}>
                    Folder &ldquo;Edited&rdquo; Belum Tersedia
                  </h3>
                  <p style={{ fontSize: "0.88rem", lineHeight: "1.5" }}>
                    Belum ada foto hasil editan di dalam subfolder <strong>Edited</strong> pada Google Drive klien ini.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    width: "100%",
                  }}>
                  {/* KOLOM KIRI (DESKTOP): NAVIGASI SUBFOLDER */}
                  {sectionsWithPhotos.length > 0 && (
                    <aside
                      className="desktop-only-flex"
                      style={{
                        width: "215px",
                        flexShrink: 0,
                        position: "sticky",
                        top: "74px",
                        maxHeight: "calc(100vh - 96px)",
                        overflowY: "auto",
                        backgroundColor: "rgba(22, 22, 26, 0.94)",
                        border: "1px solid rgba(214, 168, 90, 0.3)",
                        borderRadius: "16px",
                        padding: "12px 10px",
                        flexDirection: "column",
                        gap: "6px",
                      }}>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#f0cf8e",
                          padding: "2px 6px 8px 6px",
                          borderBottom: "1px solid rgba(214, 168, 90, 0.2)",
                        }}>
                        Navigasi Folder
                      </div>
                      {sectionsWithPhotos.map((sec) => {
                        const isActive =
                          (activeSectionId || sectionsWithPhotos[0]?.id) === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSelectSection(sec.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              padding: "9px 10px",
                              borderRadius: "10px",
                              border: isActive
                                ? "1px solid rgba(214, 168, 90, 0.45)"
                                : "1px solid transparent",
                              backgroundColor: isActive
                                ? "rgba(214, 168, 90, 0.15)"
                                : "transparent",
                              color: isActive ? "#f0cf8e" : "#d4d4d8",
                              fontSize: "0.8rem",
                              fontWeight: isActive ? 700 : 600,
                              cursor: "pointer",
                            }}>
                            <span>{sec.title}</span>
                            <span>{sec.secPhotos.length}</span>
                          </button>
                        );
                      })}
                    </aside>
                  )}

                  {/* KOLOM TENGAH: GALERI HASIL EDITAN */}
                  <div style={{ flex: 1, minWidth: 0, maxWidth: "1160px", margin: "0 auto" }}>
                    {sectionsWithPhotos.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                        {sectionsWithPhotos.map((sec) => (
                          <div
                            key={sec.id}
                            id={`section-${sec.id}`}
                            style={{ width: "100%", scrollMarginTop: "78px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                                padding: "0 4px 8px 4px",
                                borderBottom: "1px solid rgba(214, 168, 90, 0.2)",
                              }}>
                              <h2
                                style={{
                                  fontSize: "clamp(1.05rem, 2.5vw, 1.35rem)",
                                  fontWeight: 800,
                                  color: "#ffffff",
                                  margin: 0,
                                }}>
                                {sec.title}
                              </h2>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "#f0cf8e",
                                  backgroundColor: "rgba(214, 168, 90, 0.12)",
                                  border: "1px solid rgba(214, 168, 90, 0.3)",
                                  padding: "2px 10px",
                                  borderRadius: "9999px",
                                }}>
                                {sec.secPhotos.length} Foto
                              </span>
                            </div>
                            <MasonryGallery
                              photos={sec.secPhotos}
                              renderItem={renderGalleryCard}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <MasonryGallery photos={photos} renderItem={renderGalleryCard} />
                    )}
                  </div>

                  {/* KOLOM KANAN (DESKTOP): SLIDE VIEW DAFTAR KOMENTAR FOTO */}
                  <aside
                    className="desktop-only-flex"
                    style={{
                      width: isSlideViewOpen ? "255px" : "auto",
                      flexShrink: 0,
                      position: "sticky",
                      top: "74px",
                      maxHeight: "calc(100vh - 96px)",
                      flexDirection: "column",
                    }}>
                    {isSlideViewOpen ? (
                      <div
                        style={{
                          backgroundColor: "rgba(22, 22, 26, 0.94)",
                          border: "1px solid rgba(214, 168, 90, 0.3)",
                          borderRadius: "16px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          maxHeight: "calc(100vh - 96px)",
                          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
                        }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid rgba(214, 168, 90, 0.2)",
                          }}>
                          <span
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: 800,
                              color: "#f0cf8e",
                              whiteSpace: "nowrap",
                            }}>
                            Komentar ({commentedPhotosList.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsSlideViewOpen(false)}
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(214, 168, 90, 0.3)",
                              color: "#d4d4d8",
                              borderRadius: "9999px",
                              padding: "3px 9px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}>
                            Hide ❯
                          </button>
                        </div>

                        {commentedPhotosList.length === 0 ? (
                          <div
                            style={{
                              padding: "24px 10px",
                              textAlign: "center",
                              color: "#a1a1aa",
                              fontSize: "0.75rem",
                              lineHeight: 1.5,
                            }}>
                            Belum ada komentar khusus per foto. Klik tombol <strong>Komentar</strong> pada foto untuk memberi catatan revisi.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              overflowY: "auto",
                              maxHeight: "calc(100vh - 165px)",
                            }}>
                            {commentedPhotosList.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleOpenNoteModal(item.id, item.name)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "6px",
                                  borderRadius: "10px",
                                  backgroundColor: "#111114",
                                  border: "1px solid rgba(214, 168, 90, 0.35)",
                                  cursor: "pointer",
                                }}>
                                <img
                                  src={`/api/thumbnail?id=${item.id}`}
                                  alt={item.name}
                                  style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "6px",
                                    objectFit: "cover",
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      color: "#ffffff",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}>
                                    {item.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.68rem",
                                      color: "#f0cf8e",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}>
                                    {photoNotes[item.id]}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSlideViewOpen(true)}
                        style={{
                          backgroundColor: "rgba(22, 22, 26, 0.95)",
                          border: "1px solid rgba(214, 168, 90, 0.4)",
                          color: "#f0cf8e",
                          borderRadius: "14px",
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                        }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800 }}>❮ Unhide</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800 }}>
                          {commentedPhotosList.length}
                        </span>
                      </button>
                    )}
                  </aside>
                </div>
              )}
            </div>

            {/* TOMBOL MENGAMBANG DESKTOP */}
            {photos.length > 0 && (
              <div
                className="desktop-only-flex"
                style={{
                  position: "fixed",
                  bottom: "20px",
                  left: 0,
                  right: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "0 16px",
                  zIndex: 9999,
                  pointerEvents: "none",
                }}>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  style={{
                    pointerEvents: "auto",
                    backgroundColor: "#16161a",
                    border: "1.5px solid rgba(214, 168, 90, 0.45)",
                    color: "#f0cf8e",
                    borderRadius: "9999px",
                    padding: "13px 22px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: isSavingDraft ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.65)",
                    whiteSpace: "nowrap",
                  }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", lineHeight: 1 }}>
                    save_as
                  </span>
                  <span>{isSavingDraft ? "Menyimpan..." : "Simpan Sementara"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToPreview}
                  style={{
                    pointerEvents: "auto",
                    background:
                      "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                    color: "#09090b",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "14px 26px",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 10px 30px rgba(214, 168, 90, 0.45)",
                    whiteSpace: "nowrap",
                  }}>
                  <span>Tinjau &amp; Konfirmasi ({photos.length} Foto)</span>
                  <span
                    style={{
                      backgroundColor: "#09090b",
                      color: "#f0cf8e",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      fontWeight: 900,
                    }}>
                    ✓
                  </span>
                </button>
              </div>
            )}

            {/* TOMBOL MENGAMBANG MOBILE (GPU Isolated, Ukuran Proporsional & Sejajar) */}
            {photos.length > 0 && (
              <div
                className="mobile-only-flex"
                style={{
                  position: "fixed",
                  bottom: "16px",
                  left: "12px",
                  right: "12px",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  zIndex: 9999,
                  pointerEvents: "none",
                  transform: "translateZ(0)",
                }}>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  style={{
                    pointerEvents: "auto",
                    height: "46px",
                    minHeight: "46px",
                    backgroundColor: "rgba(22, 22, 26, 0.96)",
                    border: "1.5px solid rgba(214, 168, 90, 0.45)",
                    color: "#f0cf8e",
                    borderRadius: "9999px",
                    padding: "0 14px",
                    cursor: isSavingDraft ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.75)",
                    whiteSpace: "nowrap",
                    touchAction: "manipulation",
                  }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", lineHeight: 1 }}>
                    save_as
                  </span>
                  <span style={{ fontSize: "0.73rem", fontWeight: 700 }}>
                    {isSavingDraft ? "Menyimpan..." : "Simpan Sementara"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToPreview}
                  style={{
                    pointerEvents: "auto",
                    height: "46px",
                    minHeight: "46px",
                    background:
                      "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                    color: "#09090b",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "0 15px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    boxShadow: "0 10px 28px rgba(214, 168, 90, 0.45)",
                    touchAction: "manipulation",
                  }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                    Tinjau ({photos.length})
                  </span>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", lineHeight: 1, color: "#09090b", fontWeight: 700 }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        {/* TAMPILAN 2: MENU PREVIEW / TINJAU HASIL EDITAN */}
        {(currentView === "preview" || currentView === "success") && (
          <div
            style={{
              maxWidth: "960px",
              margin: "0 auto",
              padding: "20px 10px 80px 10px",
              animation: "fadeIn 0.25s ease-out",
            }}>
            {/* Tombol Kembali di Atas */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "18px" }}>
              <button
                type="button"
                onClick={handleBackToGallery}
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#16161a",
                  color: "#ededed",
                  border: "1.5px solid rgba(214, 168, 90, 0.4)",
                  borderRadius: "9999px",
                  height: "42px",
                  padding: "0 16px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  touchAction: "manipulation",
                }}>
                <span
                  className="preview-icon-badge"
                  style={{
                    backgroundColor: "rgba(214, 168, 90, 0.12)",
                    color: "#f0cf8e",
                  }}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "block" }}>
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>Kembali ke Galeri Editan</span>
              </button>
            </div>

            {/* Header Preview Hasil Editan */}
            <div style={{ textAlign: "center", marginBottom: "24px", padding: "0 6px" }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#d6a85a",
                  marginBottom: "6px",
                }}>
                Review Hasil Editan Foto
              </div>

              <h1
                style={{
                  fontSize: "clamp(1.35rem, 3.5vw, 2rem)",
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: "8px",
                  letterSpacing: "-0.4px",
                }}>
                Tinjau Hasil Editan — <span className="text-gradient-gold">{clientName}</span>
              </h1>

              {photoDate && (
                <div style={{ fontSize: "0.84rem", color: "#a1a1aa", marginBottom: "8px" }}>
                  <IconCalendar size={15} color="#d6a85a" style={{ marginRight: 6, verticalAlign: -2 }} />
                  Tanggal Sesi: <strong style={{ color: "#f0cf8e" }}>{photoDate}</strong>
                </div>
              )}

              <p style={{ fontSize: "0.84rem", color: "#a1a1aa", lineHeight: "1.5" }}>
                Klik foto untuk melihat resolusi maksimal, atau tambahkan komentar sebelum dikirim ke tim editor Fotonic.
              </p>

              <div
                style={{
                  marginTop: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "rgba(214, 168, 90, 0.14)",
                  color: "#f0cf8e",
                  border: "1px solid rgba(214, 168, 90, 0.35)",
                  borderRadius: "9999px",
                  padding: "5px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                }}>
                <span>
                  Total: {photos.length} Foto ({commentedPhotosList.length} Berkomentar)
                </span>
              </div>
            </div>

            {/* Grid Masonry Hasil Editan */}
            <div style={{ marginBottom: "28px" }}>
              <MasonryGallery photos={photos} renderItem={renderPreviewCard} />
            </div>

            {/* Kotak Catatan Umum untuk Editor */}
            <div
              style={{
                backgroundColor: "#16161a",
                border: "1px solid rgba(214, 168, 90, 0.25)",
                borderRadius: "20px",
                padding: "18px",
                marginBottom: "28px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              }}>
              <label
                htmlFor="edited-general-notes"
                style={{
                  display: "block",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "8px",
                }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <IconPaper size={18} color="#d6a85a" />
                  <span>Catatan / Komentar Umum untuk Editor (Opsional):</span>
                </span>
              </label>
              <textarea
                id="edited-general-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Secara keseluruhan hasil editan sudah sesuai, mohon cek sedikit catatan pada foto di atas."
                style={{
                  width: "100%",
                  minHeight: "96px",
                  padding: "12px 14px",
                  backgroundColor: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  color: "#ededed",
                  fontSize: "0.86rem",
                  lineHeight: "1.5",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Tombol Konfirmasi Hasil Editan */}
            <div className="preview-action-container">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="preview-btn-confirm"
                style={{
                  background: isSubmitting
                    ? "#4a3c25"
                    : "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                  color: "#09090b",
                  border: "none",
                  fontSize: "0.92rem",
                  fontWeight: 800,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 20px rgba(214, 168, 90, 0.35)",
                  touchAction: "manipulation",
                }}>
                <span style={{ whiteSpace: "nowrap" }}>
                  {isSubmitting ? "Menyimpan Konfirmasi..." : "Konfirmasi Hasil Editan"}
                </span>
                <span
                  className="preview-icon-badge"
                  style={{
                    backgroundColor: "#09090b",
                    color: "#f0cf8e",
                  }}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "block" }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* POPUP SUKSES KONFIRMASI HASIL EDITAN */}
        {currentView === "success" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(9, 9, 11, 0.94)",
              backdropFilter: "blur(10px)",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}>
            <div
              style={{
                position: "relative",
                backgroundColor: "#16161a",
                borderRadius: "28px",
                padding: "34px 22px",
                maxWidth: "460px",
                width: "100%",
                textAlign: "center",
                boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 25px rgba(214, 168, 90, 0.15)",
                border: "1px solid rgba(214, 168, 90, 0.3)",
              }}>
              <button
                type="button"
                onClick={() => setCurrentView("preview")}
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
                  padding: 0,
                }}>
                ✕
              </button>

              <div style={{ fontSize: "2.6rem", marginBottom: "10px" }}>🎉</div>
              <h2
                style={{
                  fontSize: "1.32rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: "8px",
                }}>
                Konfirmasi Hasil Editan Tersimpan!
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#a1a1aa",
                  lineHeight: "1.5",
                  marginBottom: "16px",
                }}>
                Terima kasih Kak <strong style={{ color: "#f0cf8e" }}>{clientName}</strong>. Tinjauan dan komentar hasil editan Anda telah tercatat di sistem Fotonic.
              </p>

              <div
                style={{
                  backgroundColor: "#0d0d10",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  textAlign: "left",
                  border: "1px solid rgba(214, 168, 90, 0.2)",
                  marginBottom: "18px",
                  fontSize: "0.78rem",
                  color: "#ededed",
                }}>
                {commentedPhotosList.length === 0 ? (
                  <div style={{ color: "#a1a1aa" }}>
                    ✓ Seluruh {photos.length} foto hasil editan dikonfirmasi tanpa catatan revisi per foto.
                  </div>
                ) : (
                  commentedPhotosList.map((p, idx) => (
                    <div key={p.id} style={{ marginBottom: "6px" }}>
                      <span style={{ color: "#d6a85a", fontWeight: 700 }}>
                        {idx + 1}. {p.name}:
                      </span>{" "}
                      <span style={{ color: "#f0cf8e" }}>{photoNotes[p.id]}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(37, 211, 102, 0.35)",
                  }}>
                  <WhatsAppIcon size={19} />
                  <span>Konfirmasi ke WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(waMessage);
                    setCopiedWa(true);
                    setTimeout(() => setCopiedWa(false), 2500);
                  }}
                  style={{
                    backgroundColor: "transparent",
                    color: copiedWa ? "#f0cf8e" : "#a1a1aa",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "9999px",
                    height: "42px",
                    padding: "0 16px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    whiteSpace: "nowrap",
                  }}>
                  {copiedWa ? (
                    <span>✓ Rekapan Berhasil Disalin!</span>
                  ) : (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px", lineHeight: 1 }}>
                        content_copy
                      </span>
                      <span>Salin Rekap Komentar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FULLVIEW (TANPA TOMBOL PILIH FOTO + RESOLUSI MAKSIMAL ASLI) */}
        {fullviewIndex !== null && (
          <PhotoModal
            photos={photos}
            currentIndex={fullviewIndex}
            isOpen={fullviewIndex !== null}
            onClose={handleCloseFullview}
            onNavigate={(newIdx) => setFullviewIndex(newIdx)}
            selectedIds={[]}
            onToggle={() => {}}
            photoNotes={photoNotes}
            onOpenNote={handleOpenNoteModal}
            isQuotaFull={false}
            hideSelection={true}
            maxResolution={true}
          />
        )}

        {/* MODAL KOMENTAR KHUSUS PER FOTO */}
        {activeNoteModalPhoto && (
          <PhotoNoteModal
            isOpen={Boolean(activeNoteModalPhoto)}
            photoName={activeNoteModalPhoto.name}
            initialNote={photoNotes[activeNoteModalPhoto.id] || ""}
            onSave={(noteText) => {
              setPhotoNotes((prev) => ({
                ...prev,
                [activeNoteModalPhoto.id]: noteText,
              }));
              handleCloseNoteModal();
            }}
            onClose={handleCloseNoteModal}
          />
        )}

        {/* MODAL DRAF KOMENTAR */}
        {showResumeDraftModal && (
          <DraftSavedModal
            clientName={clientName}
            selectedCount={commentedPhotosList.length || photos.length}
            isResume={true}
            onContinue={() => {
              setShowResumeDraftModal(false);
              forceUnlockScroll();
            }}
          />
        )}

        {showDraftSavedModal && (
          <DraftSavedModal
            clientName={clientName}
            selectedCount={commentedPhotosList.length || photos.length}
            isResume={false}
            onContinue={() => {
              setShowDraftSavedModal(false);
              forceUnlockScroll();
            }}
          />
        )}

        {/* MODAL SESI REVIEW SUDAH DIKUNCI SEBELUMNYA */}
        {showLockedModal && lockedSessionData && (
          <LockedSessionModal
            clientName={lockedSessionData.clientName || clientName}
            waktu={lockedSessionData.waktu}
            count={lockedSessionData.count || photos.length}
            selectedFileNames={photos.map((p) => p.name)}
            notes={lockedSessionData.notes || lockedSessionData.photoCommentsRaw}
            onUnlockAndEdit={() => {
              if (lockedSessionData.notes) setNotes(lockedSessionData.notes);
              if (lockedSessionData.photoNotes) setPhotoNotes(lockedSessionData.photoNotes);
              setCurrentView("gallery");
              setShowLockedModal(false);
              forceUnlockScroll();
            }}
            onViewLocked={() => {
              if (lockedSessionData.notes) setNotes(lockedSessionData.notes);
              if (lockedSessionData.photoNotes) setPhotoNotes(lockedSessionData.photoNotes);
              setCurrentView("preview");
              setShowLockedModal(false);
              forceUnlockScroll();
            }}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function EditedClientPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            backgroundColor: "#09090b",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#d6a85a",
          }}>
          Memuat Hasil Editan Fotonic...
        </div>
      }>
      <EditedGalleryContent />
    </Suspense>
  );
}
