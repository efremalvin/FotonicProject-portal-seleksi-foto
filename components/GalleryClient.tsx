"use client";

import React, { Suspense, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import WelcomeModal from "@/components/WelcomeModal";
import HeroBanner from "@/components/HeroBanner";
import ProgressBar from "@/components/ProgressBar";
import PhotoCard from "@/components/PhotoCard";
import PhotoModal from "@/components/PhotoModal";
import PreviewView from "@/components/PreviewView";
import SuccessModal from "@/components/Successmodal";
import Footer from "@/components/Footer";
import MasonryGallery from "@/components/MasonryGallery";
import LoadingScreen from "@/components/LoadingScreen";
import DraftSavedModal from "@/components/DraftSavedModal";
import LockedSessionModal from "@/components/LockedSessionModal";
import PhotoNoteModal from "@/components/PhotoNoteModal";
import { IconTrash } from "@/components/Icons";
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

/**
 * Helper untuk mengekstrak folder ID murni dari link lengkap Google Drive atau string ID
 */
function extractFolderId(input?: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return trimmed.split("?")[0].split("&")[0].trim();
}

function GalleryContent() {
  const searchParams = useSearchParams();

  const rawFolderParam = searchParams.get("folder_id");
  const folderId = extractFolderId(rawFolderParam);

  const urlClient = searchParams.get("klien");
  const urlDate = searchParams.get("date") || searchParams.get("tanggal");
  const urlMax = searchParams.get("max");

  // State untuk input manual jika link dibuka tanpa parameter folder_id
  const [manualInput, setManualInput] = useState("");

  // State info folder yang di-parse otomatis dari Google Drive
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);

  // Nilai efektif: Prioritaskan parameter URL jika ada, jika tidak gunakan hasil parse nama folder GDrive
  const clientName = urlClient || folderInfo?.clientName || "Klien Fotonic";
  const photoDate = urlDate || folderInfo?.photoDate || null;
  const parsedUrlMax = Number(urlMax);
  const maxPhotos =
    !isNaN(parsedUrlMax) && parsedUrlMax > 0 && parsedUrlMax <= 50
      ? parsedUrlMax
      : folderInfo?.maxPhotos || 15;

  // Sinkronisasi judul tab browser dengan nama klien dari Google Drive
  useEffect(() => {
    const resolvedName = urlClient || folderInfo?.clientName;
    if (resolvedName && typeof document !== "undefined") {
      document.title = `Fotonic - Seleksi Foto ${resolvedName}`;
    }
  }, [urlClient, folderInfo?.clientName]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hasSubfolders, setHasSubfolders] = useState<boolean>(false);
  const [sections, setSections] = useState<FolderSection[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Navigasi Section & Slide View Foto Terpilih (Desktop)
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isSlideViewOpen, setIsSlideViewOpen] = useState<boolean>(true);
  const [isFolderNavOpen, setIsFolderNavOpen] = useState<boolean>(true);

  // Modal Konfirmasi Hapus Semua Pilihan Foto
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  // Status Tampilan: 'gallery' | 'preview' | 'success'
  const [currentView, setCurrentView] = useState<
    "gallery" | "preview" | "success"
  >("gallery");
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFileNames, setSubmittedFileNames] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Catatan khusus per foto (Permintaan #3)
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [activeNoteModalPhoto, setActiveNoteModalPhoto] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Status Simpan Sementara (Permintaan #1 & #2a)
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftSavedModal, setShowDraftSavedModal] = useState(false);
  const [showResumeDraftModal, setShowResumeDraftModal] = useState(false);
  const hasSessionRef = useRef(false);

  // Status Sesi Terkunci Sebelumnya (Permintaan #1 & #2b)
  const [lockedSessionData, setLockedSessionData] = useState<{
    waktu: string;
    clientName: string;
    count: number;
    selectedFileNames: string[];
    matchedIds: string[];
    notes: string;
    photoNotes: Record<string, string>;
  } | null>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);

  // Fullview Modal dengan Navigasi Index & Zoom Independen (Permintaan #2)
  const [fullviewIndex, setFullviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!folderId) {
      setIsLoading(false);
      return;
    }

    async function fetchPhotos() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // Ambil data foto & status sesi secara PARALEL untuk mempercepat loading awal hingga 50%
        const [res, sessRes] = await Promise.all([
          fetch(`/api/photos?folder_id=${encodeURIComponent(folderId)}`),
          fetch(`/api/session?folder_id=${encodeURIComponent(folderId)}`).catch((e) => {
            console.warn("Gagal membaca sesi tersimpan:", e);
            return null;
          }),
        ]);

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengambil foto.");

        setPhotos(data.photos || []);
        setHasSubfolders(Boolean(data.hasSubfolders));
        setSections(data.sections || []);
        if (data.sections && data.sections.length > 0) {
          setActiveSectionId(data.sections[0].id);
        }
        if (data.folder) {
          setFolderInfo(data.folder);
        }

        // Periksa riwayat sesi sebelumnya di Google Sheets (DRAF / TERKUNCI)
        if (sessRes && sessRes.ok) {
          try {
            const sessData = await sessRes.json();
            if (sessData.hasPreviousSession) {
              hasSessionRef.current = true;
              setShowWelcome(false);

              if (sessData.status === "TERKUNCI") {
                setLockedSessionData(sessData);
                setShowLockedModal(true);
                setShowResumeDraftModal(false);
              } else if (sessData.status === "DRAF") {
                if (sessData.matchedIds && sessData.matchedIds.length > 0) {
                  setSelectedIds(sessData.matchedIds);
                }
                if (sessData.notes) {
                  setNotes(sessData.notes);
                }
                if (sessData.photoNotes) {
                  setPhotoNotes(sessData.photoNotes);
                }
                setShowResumeDraftModal(true);
                setShowLockedModal(false);
              }
            }
          } catch (e) {
            console.warn("Gagal parsing sesi:", e);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memuat foto dari Google Drive.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPhotos();
  }, [folderId]);

  // Set pencarian O(1) super cepat agar memilih foto tidak melakukan linear scan O(N) ke ratusan kartu
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isQuotaFull = selectedIds.length >= maxPhotos;

  const maxPhotosRef = useRef(maxPhotos);
  maxPhotosRef.current = maxPhotos;

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
      window.history.pushState({ fotonicLayer: layer }, "");
    }
  }, []);

  const popNavLayerSilently = useCallback((expectedLayer: string) => {
    if (
      typeof window !== "undefined" &&
      window.history.state &&
      window.history.state.fotonicLayer === expectedLayer
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
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= maxPhotosRef.current) return prev;
        return [...prev, id];
      }
    });
  }, []);

  const handleGoToPreview = useCallback(() => {
    pushNavLayer("preview");
    setCurrentView("preview");
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

  // Map O(1) id -> photo untuk pencarian super cepat
  const photoMap = useMemo(() => {
    const map = new Map<string, Photo>();
    for (const p of photos) {
      map.set(p.id, p);
    }
    return map;
  }, [photos]);

  // Foto-foto yang sedang terpilih dengan urutan LIFO (Pilihan TERAKHIR berada di PALING ATAS)
  const selectedPhotosList = useMemo(
    () =>
      [...selectedIds]
        .reverse()
        .map((id) => photoMap.get(id))
        .filter((p): p is Photo => Boolean(p))
        .map((p) => ({
          id: p.id,
          name: p.name,
          width: p.width,
          height: p.height,
          isLandscape: p.isLandscape,
        })),
    [selectedIds, photoMap]
  );

  // Memoisasi pengelompokan foto per subfolder agar tidak di-filter ulang setiap kali klik pilih foto
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

  // ScrollSpy: Deteksi subfolder/section mana yang sedang berada di layar pengguna secara otomatis saat scroll
  useEffect(() => {
    if (sectionsWithPhotos.length <= 1) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Garis acuan deteksi di bawah sticky header / progress bar
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

  // Handler Hapus Seluruh Pilihan Foto
  const handleConfirmClearAll = useCallback(() => {
    setSelectedIds([]);
    setPhotoNotes({});
    setShowClearConfirmModal(false);
  }, []);

  // Data ringkas section untuk komponen ProgressBar (Navigasi Mobile)
  const navSections = useMemo(
    () =>
      sectionsWithPhotos.map((sec) => ({
        id: sec.id,
        title: sec.title,
        count: sec.secPhotos.length,
      })),
    [sectionsWithPhotos]
  );

  const handleSelectSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    if (typeof document !== "undefined") {
      const target = document.getElementById(`section-${sectionId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  // Ref stabil untuk handleOpenPreview agar referensi fungsi tidak berubah-ubah
  const previewStateRef = useRef({ currentView, selectedPhotosList, photos, fullviewIndex });
  previewStateRef.current = { currentView, selectedPhotosList, photos, fullviewIndex };

  const handleOpenPreview = useCallback((id: string) => {
    const { currentView: view, selectedPhotosList: selList, photos: allList, fullviewIndex: currFull } =
      previewStateRef.current;
    if (currFull === null) {
      pushNavLayer("fullview");
    }
    const activeList = view === "preview" ? selList : allList;
    const idx = activeList.findIndex((p) => p.id === id);
    setFullviewIndex(idx >= 0 ? idx : 0);
  }, [pushNavLayer]);

  const handleCloseFullview = useCallback(() => {
    setFullviewIndex(null);
    popNavLayerSilently("fullview");
  }, [popNavLayerSilently]);

  const handleOpenNoteModal = useCallback((id: string, name: string) => {
    if (navStateRef.current.activeNoteModalPhoto === null) {
      pushNavLayer("note");
    }
    setActiveNoteModalPhoto({ id, name });
  }, [pushNavLayer]);

  const handleCloseNoteModal = useCallback(() => {
    setActiveNoteModalPhoto(null);
    popNavLayerSilently("note");
  }, [popNavLayerSilently]);

  // Render item yang ter-memoisasi untuk MasonryGallery: memilih 1 foto hanya me-render 1 kartu itu saja!
  const renderPhotoCard = useCallback(
    (photo: Photo) => {
      const isSelected = selectedSet.has(photo.id);
      return (
        <PhotoCard
          id={photo.id}
          name={photo.name}
          isSelected={isSelected}
          isDisabled={isQuotaFull && !isSelected}
          onToggle={toggleSelect}
          onPreview={handleOpenPreview}
          width={photo.width}
          height={photo.height}
          isLandscape={photo.isLandscape}
        />
      );
    },
    [selectedSet, isQuotaFull, toggleSelect, handleOpenPreview]
  );

  const handleCrossfadeStart = useCallback(() => {
    if (!hasStarted && !hasSessionRef.current) {
      setShowWelcome(true);
    }
  }, [hasStarted]);

  const handleSaveDraft = async () => {
    if (selectedIds.length === 0 || !folderId) return;
    setIsSavingDraft(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId,
          clientName,
          max: maxPhotos,
          selectedFileIds: selectedIds,
          notes,
          photoNotes,
          isDraft: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan sementara.");

      pushNavLayer("draftSaved");
      setShowDraftSavedModal(true);
    } catch (err: any) {
      alert(`Gagal menyimpan sementara: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0 || !folderId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId,
          clientName,
          max: maxPhotos,
          selectedFileIds: selectedIds,
          notes,
          photoNotes,
          isDraft: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan seleksi.");

      setSubmittedFileNames(data.fileNames || []);
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
    window.location.href = `/?folder_id=${encodeURIComponent(cleaned)}`;
  };

  // Tampilan 0: Form Masukkan Folder jika folder_id belum ada di URL
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
              Portal Seleksi Foto Klien
            </h2>
            <p
              style={{
                color: "#a1a1aa",
                fontSize: "0.88rem",
                lineHeight: "1.5",
                marginBottom: "26px",
              }}>
              Silakan masukkan tautan atau ID folder Google Drive yang telah diberikan oleh tim Fotonic:
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
                Buka Galeri Foto →
              </button>
            </form>

            <div
              style={{
                marginTop: "22px",
                padding: "12px",
                backgroundColor: "rgba(214, 168, 90, 0.08)",
                border: "1px dashed rgba(214, 168, 90, 0.25)",
                borderRadius: "12px",
                fontSize: "0.78rem",
                color: "#d4d4d8",
                textAlign: "left",
              }}>
              💡 <strong>Contoh input yang didukung:</strong>
              <br />
              • Link: <code style={{ color: "#f0cf8e" }}>https://drive.google.com/drive/folders/1f6p...</code>
              <br />
              • ID Saja: <code style={{ color: "#f0cf8e" }}>1f6pznHVQyktvflAPYQO5W...</code>
            </div>
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
              href="/"
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
        {/* Loading Screen dengan Animasi Shutter Fotonic sebelum nama terdeteksi & foto siap (Seamless Crossfade) */}
        {folderId && (
          <LoadingScreen
            isLoading={isLoading}
            folderDetected={Boolean(folderInfo) || Boolean(errorMsg)}
            clientName={folderInfo?.clientName || urlClient || undefined}
            onCrossfadeStart={handleCrossfadeStart}
          />
        )}

        {/* 1. Modal Sapaan Awal (Halaman dikunci dan tidak bisa di-scroll sebelum klik mulai) */}
        {showWelcome && (
          <WelcomeModal
            clientName={clientName}
            photoDate={photoDate}
            maxPhotos={maxPhotos}
            onStart={() => {
              setShowWelcome(false);
              setHasStarted(true);
              forceUnlockScroll();
            }}
          />
        )}

        {/* 2. TAMPILAN 1: GALERI UTAMA */}
        {currentView === "gallery" && (
          <>
            <HeroBanner
              clientName={clientName}
              photoDate={photoDate}
              maxPhotos={maxPhotos}
              folderId={folderId}
            />
            <ProgressBar
              current={selectedIds.length}
              max={maxPhotos}
              sections={navSections}
              activeSectionId={activeSectionId || navSections[0]?.id}
              onSelectSection={handleSelectSection}
            />

            <div
              className="gallery-outer-container"
              style={{
                maxWidth: "1680px",
                margin: "0 auto",
                paddingBottom: "110px",
              }}>
              {isLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "80px 0",
                    color: "#d6a85a",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                  <div style={{ fontSize: "1.8rem" }}>⏳</div>
                  <span>Memuat foto dari Google Drive Fotonic...</span>
                </div>
              ) : photos.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "80px 0",
                    color: "#a1a1aa",
                    backgroundColor: "#16161a",
                    borderRadius: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}>
                  Tidak ada foto yang ditemukan di folder Google Drive ini.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    width: "100%",
                  }}>
                  {/* ========================================================
                     KOLOM KIRI (DESKTOP): NAVIGATION BUTTON SECTION (Permintaan 1.a)
                     Ditampilkan hanya jika ada section / subfolder di folder client
                     ======================================================== */}
                  {sectionsWithPhotos.length > 0 && (
                    <aside
                      className="desktop-only-flex"
                      style={{
                        width: isFolderNavOpen ? "215px" : "auto",
                        flexShrink: 0,
                        position: "sticky",
                        top: "74px",
                        maxHeight: "calc(100vh - 96px)",
                        flexDirection: "column",
                        transition: "width 0.25s ease",
                      }}>
                      {isFolderNavOpen ? (
                        <div
                          style={{
                            width: "215px",
                            backgroundColor: "rgba(22, 22, 26, 0.94)",
                            border: "1px solid rgba(214, 168, 90, 0.3)",
                            borderRadius: "16px",
                            padding: "12px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
                            maxHeight: "calc(100vh - 96px)",
                            overflowY: "auto",
                          }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              padding: "2px 6px 8px 6px",
                              borderBottom: "1px solid rgba(214, 168, 90, 0.2)",
                              marginBottom: "2px",
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                              <span
                                style={{
                                  width: "3px",
                                  height: "14px",
                                  backgroundColor: "#d6a85a",
                                  borderRadius: "2px",
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  color: "#f0cf8e",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                Folder
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsFolderNavOpen(false)}
                              title="Sembunyikan Navigasi Folder"
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.06)",
                                border: "1px solid rgba(214, 168, 90, 0.3)",
                                color: "#d4d4d8",
                                borderRadius: "9999px",
                                padding: "3px 9px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                                transition: "all 0.15s ease",
                              }}>
                              Hide ❮
                            </button>
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
                                  textAlign: "left",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}>
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    paddingRight: "6px",
                                  }}>
                                  {sec.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    color: isActive ? "#09090b" : "#f0cf8e",
                                    backgroundColor: isActive
                                      ? "#d6a85a"
                                      : "rgba(214, 168, 90, 0.12)",
                                    padding: "2px 7px",
                                    borderRadius: "9999px",
                                    flexShrink: 0,
                                  }}>
                                  {sec.secPhotos.length}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsFolderNavOpen(true)}
                          title="Tampilkan Navigasi Folder"
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
                            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.65)",
                            transition: "all 0.2s ease",
                          }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 800 }}>Folder ❯</span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              backgroundColor: "rgba(214, 168, 90, 0.16)",
                              border: "1px solid rgba(214, 168, 90, 0.35)",
                              padding: "2px 7px",
                              borderRadius: "9999px",
                              color: "#f0cf8e",
                              maxWidth: "80px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}>
                            {sectionsWithPhotos.find((s) => s.id === activeSectionId)?.title || "Semua"}
                          </span>
                        </button>
                      )}
                    </aside>
                  )}

                  {/* ========================================================
                     KOLOM TENGAH: GALERI UTAMA (Membentang Penuh & Fleksibel)
                     ======================================================== */}
                  <div style={{ flex: 1, minWidth: 0, width: "100%", margin: "0 auto" }}>
                    {sectionsWithPhotos.length > 0 ? (
                      /* KONDISI B: JIKA ADA SUBFOLDER (Permintaan 1.c) */
                      <div style={{ display: "flex", flexDirection: "column", gap: "38px" }}>
                        {sectionsWithPhotos.map((sec) => (
                          <div
                            key={sec.id}
                            id={`section-${sec.id}`}
                            style={{ width: "100%", scrollMarginTop: "78px" }}>
                            {/* Judul Section Berdasarkan Nama Subfolder */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "14px",
                                padding: "0 4px",
                                borderBottom: "1px solid rgba(214, 168, 90, 0.2)",
                                paddingBottom: "8px",
                              }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span
                                  style={{
                                    width: "4px",
                                    height: "20px",
                                    backgroundColor: "#d6a85a",
                                    borderRadius: "2px",
                                    display: "inline-block",
                                  }}
                                />
                                <h2
                                  style={{
                                    fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)",
                                    fontWeight: 800,
                                    color: "#ffffff",
                                    letterSpacing: "-0.3px",
                                    margin: 0,
                                  }}>
                                  {sec.title}
                                </h2>
                              </div>
                              <span
                                style={{
                                  fontSize: "0.78rem",
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

                            {/* Galeri Masonry Khusus Subfolder Ini */}
                            <MasonryGallery
                              photos={sec.secPhotos}
                              renderItem={renderPhotoCard}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* KONDISI A: JIKA TIDAK ADA SUBFOLDER (Permintaan 1.c) */
                      <MasonryGallery
                        photos={photos}
                        renderItem={renderPhotoCard}
                      />
                    )}
                  </div>

                  {/* ========================================================
                     KOLOM KANAN (DESKTOP SAJA): SLIDE VIEW FOTO TERPILIH (Permintaan 1.e)
                     Tampilkan foto terpilih di sebelah kanan galeri dengan tombol hide & unhide
                     ======================================================== */}
                  <aside
                    className="desktop-only-flex"
                    style={{
                      width: isSlideViewOpen ? "255px" : "auto",
                      flexShrink: 0,
                      position: "sticky",
                      top: "74px",
                      maxHeight: "calc(100vh - 96px)",
                      flexDirection: "column",
                      transition: "width 0.25s ease",
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
                        {/* Header Slide View + Tombol Hide */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid rgba(214, 168, 90, 0.2)",
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                            <span
                              style={{
                                width: "3px",
                                height: "14px",
                                backgroundColor: "#d6a85a",
                                borderRadius: "2px",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: "0.76rem",
                                fontWeight: 800,
                                color: "#f0cf8e",
                                whiteSpace: "nowrap",
                              }}>
                              Terpilih ({selectedIds.length}/{maxPhotos})
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            {selectedIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowClearConfirmModal(true)}
                                title="Hapus Semua Pilihan"
                                style={{
                                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  color: "#fca5a5",
                                  borderRadius: "9999px",
                                  padding: "3px 8px",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  flexShrink: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  transition: "all 0.15s ease",
                                }}>
                                <IconTrash size={13} color="#fca5a5" />
                                <span>Reset</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setIsSlideViewOpen(false)}
                              title="Sembunyikan Panel Foto Terpilih"
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.06)",
                                border: "1px solid rgba(214, 168, 90, 0.3)",
                                color: "#d4d4d8",
                                borderRadius: "9999px",
                                padding: "3px 9px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                                transition: "all 0.15s ease",
                              }}>
                              Hide ❯
                            </button>
                          </div>
                        </div>

                        {/* Daftar Foto Terpilih */}
                        {selectedPhotosList.length === 0 ? (
                          <div
                            style={{
                              padding: "28px 10px",
                              textAlign: "center",
                              color: "#a1a1aa",
                              fontSize: "0.76rem",
                              lineHeight: 1.5,
                            }}>
                            Belum ada foto yang dipilih.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "8px",
                              overflowY: "auto",
                              paddingRight: "2px",
                              maxHeight: "calc(100vh - 165px)",
                            }}>
                            {selectedPhotosList.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleOpenPreview(item.id)}
                                style={{
                                  position: "relative",
                                  borderRadius: "8px",
                                  overflow: "hidden",
                                  backgroundColor: "#111114",
                                  border: "1.5px solid rgba(214, 168, 90, 0.55)",
                                  aspectRatio: "1 / 1",
                                  cursor: "pointer",
                                }}>
                                <img
                                  src={`/api/thumbnail?id=${item.id}`}
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(item.id);
                                  }}
                                  title="Batalkan Pilihan"
                                  style={{
                                    position: "absolute",
                                    top: "4px",
                                    right: "4px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(9, 9, 11, 0.85)",
                                    color: "#f0cf8e",
                                    border: "1px solid rgba(214, 168, 90, 0.45)",
                                    fontSize: "0.65rem",
                                    fontWeight: 800,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    padding: 0,
                                  }}>
                                  ✕
                                </button>
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background:
                                      "linear-gradient(to top, rgba(0,0,0,0.88), transparent)",
                                    padding: "10px 5px 3px 5px",
                                    fontSize: "0.62rem",
                                    fontWeight: 600,
                                    color: "#f0cf8e",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}>
                                  {item.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Tombol Unhide ketika Slide View disembunyikan */
                      <button
                        type="button"
                        onClick={() => setIsSlideViewOpen(true)}
                        title="Tampilkan Panel Foto Terpilih"
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
                          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.65)",
                          transition: "all 0.2s ease",
                        }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800 }}>❮ Unhide</span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(214, 168, 90, 0.16)",
                            border: "1px solid rgba(214, 168, 90, 0.35)",
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            color: "#f0cf8e",
                          }}>
                          {selectedIds.length}/{maxPhotos}
                        </span>
                      </button>
                    )}
                  </aside>
                </div>
              )}
            </div>

            {/* ========================================================
               TOMBOL MENGAMBANG DESKTOP: PERTAHANKAN (Permintaan 1.c & 1.d Desktop)
               ======================================================== */}
            {selectedIds.length > 0 && (
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
                  flexWrap: "wrap",
                }}>
                {/* Tombol 1: Simpan Sementara (Desktop) */}
                <button
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
                    transition: "background-color 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#d6a85a";
                    e.currentTarget.style.backgroundColor = "#1f1f26";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(214, 168, 90, 0.45)";
                    e.currentTarget.style.backgroundColor = "#16161a";
                  }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", lineHeight: 1 }}>
                    save_as
                  </span>
                  <span>{isSavingDraft ? "Menyimpan..." : "Simpan Sementara"}</span>
                </button>

                {/* Tombol Reset / Hapus Pilihan (Desktop) */}
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  title="Hapus Seluruh Pilihan Foto"
                  style={{
                    pointerEvents: "auto",
                    backgroundColor: "#16161a",
                    border: "1.5px solid rgba(239, 68, 68, 0.45)",
                    color: "#fca5a5",
                    borderRadius: "9999px",
                    padding: "13px 20px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.65)",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#ef4444";
                    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.45)";
                    e.currentTarget.style.backgroundColor = "#16161a";
                  }}>
                  <IconTrash size={18} color="#f87171" />
                  <span>Hapus Pilihan</span>
                </button>

                {/* Tombol 2: Lihat Foto Terpilih (Desktop) */}
                <button
                  onClick={handleGoToPreview}
                  style={{
                    pointerEvents: "auto",
                    position: "relative",
                    overflow: "hidden",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "14px 26px",
                    cursor: "pointer",
                    maxWidth: "92vw",
                    boxShadow: isQuotaFull
                      ? "0 10px 30px rgba(34, 197, 94, 0.55), 0 0 16px rgba(34, 197, 94, 0.3)"
                      : "0 10px 30px rgba(214, 168, 90, 0.45), 0 0 16px rgba(214, 168, 90, 0.2)",
                    transition: "box-shadow 0.45s ease, transform 0.2s ease",
                  }}>
                  {/* Layer 1: Background Emas Gradien Asli */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                      borderRadius: "inherit",
                      zIndex: 1,
                    }}
                  />
                  {/* Layer 2: Background Hijau Gradien dengan Transisi Opacity Super Halus */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #15803d 100%)",
                      borderRadius: "inherit",
                      opacity: isQuotaFull ? 1 : 0,
                      transition: "opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                      zIndex: 2,
                    }}
                  />
                  {/* Layer 3: Konten Teks & Ikon */}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      color: "#09090b",
                      fontSize: "0.92rem",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}>
                    <span>
                      {`Lihat Foto Terpilih (${selectedIds.length}/${maxPhotos})`}
                    </span>
                    <span
                      style={{
                        backgroundColor: "#09090b",
                        color: isQuotaFull ? "#4ade80" : "#f0cf8e",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        minWidth: "24px",
                        minHeight: "24px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        transition: "color 0.45s ease",
                      }}>
                      ✓
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* ========================================================
               TOMBOL MENGAMBANG MOBILE (Permintaan 1.c & 1.d Mobile)
               - Kiri Bawah: Simpan Sementara (icon save_as, tinggi & ukuran icon sama dan sejajar, tulisan lebih kecil)
               - Kanan Bawah: Lihat Foto Terpilih (icon arrow_forward saja)
               ======================================================== */}
            {selectedIds.length > 0 && (
              <div
                className="mobile-only-flex"
                style={{
                  position: "fixed",
                  bottom: "20px",
                  left: "16px",
                  right: "16px",
                  alignItems: "center",
                  justifyContent: "space-between",
                  zIndex: 9999,
                  pointerEvents: "none",
                }}>
                {/* Kiri Bawah: Tombol Simpan Sementara (Mobile - Permintaan 1.d) */}
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  style={{
                    pointerEvents: "auto",
                    height: "48px",
                    minHeight: "48px",
                    backgroundColor: "#16161a",
                    border: "1.5px solid rgba(214, 168, 90, 0.45)",
                    color: "#f0cf8e",
                    borderRadius: "9999px",
                    padding: "0 16px",
                    cursor: isSavingDraft ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                    whiteSpace: "nowrap",
                  }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "22px", lineHeight: 1 }}>
                    save_as
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                    {isSavingDraft ? "Menyimpan..." : "Simpan Sementara"}
                  </span>
                </button>

                {/* Tengah: Tombol Hapus Semua Pilihan (Mobile) */}
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  aria-label="Hapus Seluruh Pilihan Foto"
                  title="Hapus Seluruh Pilihan Foto"
                  style={{
                    pointerEvents: "auto",
                    width: "48px",
                    height: "48px",
                    minWidth: "48px",
                    minHeight: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#16161a",
                    border: "1.5px solid rgba(239, 68, 68, 0.45)",
                    color: "#fca5a5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7), 0 0 12px rgba(239, 68, 68, 0.15)",
                    padding: 0,
                    flexShrink: 0,
                  }}>
                  <IconTrash size={20} color="#f87171" />
                </button>

                {/* Kanan Bawah: Tombol Lihat Foto Terpilih + Angka Pilihan Foto (Mobile - Permintaan 1.c & 2.a) */}
                <button
                  onClick={handleGoToPreview}
                  aria-label="Lihat Foto Terpilih"
                  title={`Lihat Foto Terpilih (${selectedIds.length}/${maxPhotos})`}
                  style={{
                    pointerEvents: "auto",
                    position: "relative",
                    overflow: "hidden",
                    height: "48px",
                    minHeight: "48px",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "0 16px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: isQuotaFull
                      ? "0 10px 30px rgba(34, 197, 94, 0.55), 0 0 16px rgba(34, 197, 94, 0.3)"
                      : "0 10px 30px rgba(214, 168, 90, 0.45), 0 0 16px rgba(214, 168, 90, 0.2)",
                  }}>
                  {/* Layer 1: Background Emas Gradien */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, #f0cf8e 0%, #d6a85a 50%, #b9853a 100%)",
                      borderRadius: "inherit",
                      zIndex: 1,
                    }}
                  />
                  {/* Layer 2: Background Hijau Gradien saat kuota penuh */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #15803d 100%)",
                      borderRadius: "inherit",
                      opacity: isQuotaFull ? 1 : 0,
                      transition: "opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                      zIndex: 2,
                    }}
                  />
                  {/* Layer 3: Angka Pilihan Foto & Ikon arrow_forward */}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 3,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#09090b",
                    }}>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.01em",
                      }}>
                      {`${selectedIds.length}/${maxPhotos}`}
                    </span>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "22px",
                        lineHeight: 1,
                        color: "#09090b",
                        fontWeight: 700,
                      }}>
                      arrow_forward
                    </span>
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* 3. TAMPILAN 2: HALAMAN PRATINJAU FOTO TERPILIH */}
        {(currentView === "preview" || currentView === "success") && (
          <PreviewView
            clientName={clientName}
            photoDate={photoDate}
            selectedPhotos={selectedPhotosList}
            maxPhotos={maxPhotos}
            notes={notes}
            onNotesChange={setNotes}
            isSubmitting={isSubmitting}
            onBackToGallery={handleBackToGallery}
            onConfirmSubmit={handleSubmit}
            onPreview={handleOpenPreview}
            onToggle={toggleSelect}
            photoNotes={photoNotes}
            onOpenNote={handleOpenNoteModal}
            onClearAll={() => setShowClearConfirmModal(true)}
          />
        )}

        {/* 4. TAMPILAN 3: POPUP SUKSES FINAL DENGAN TOMBOL WHATSAPP & TOMBOL SILANG (Permintaan 3.a) */}
        {currentView === "success" && (
          <SuccessModal
            clientName={clientName}
            selectedFileNames={submittedFileNames}
            notes={notes}
            adminWaNumber="6281994218428"
            onClose={() => setCurrentView("preview")}
          />
        )}

        {/* 5. Modal Fullview dengan Zoom & Panning Independen (Permintaan #2 & #3) */}
        {fullviewIndex !== null && (
          <PhotoModal
            photos={currentView === "preview" ? selectedPhotosList : photos}
            currentIndex={fullviewIndex}
            isOpen={fullviewIndex !== null}
            onClose={handleCloseFullview}
            onNavigate={(newIdx) => setFullviewIndex(newIdx)}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            photoNotes={photoNotes}
            onOpenNote={handleOpenNoteModal}
            isQuotaFull={isQuotaFull}
          />
        )}

        {/* 6. Modal Catatan Khusus Per Foto (Permintaan #3) */}
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

        {/* 7a. Modal Melanjutkan Pilihan Draf (Permintaan 2a: Kembali ke web setelah simpan sementara) */}
        {showResumeDraftModal && (
          <DraftSavedModal
            clientName={clientName}
            selectedCount={selectedIds.length}
            isResume={true}
            onContinue={() => {
              setShowResumeDraftModal(false);
              setHasStarted(true);
              forceUnlockScroll();
            }}
          />
        )}

        {/* 7b. Modal Konfirmasi Pilihan Baru Saja Disimpan Sementara */}
        {showDraftSavedModal && (
          <DraftSavedModal
            clientName={clientName}
            selectedCount={selectedIds.length}
            isResume={false}
            onContinue={() => {
              setShowDraftSavedModal(false);
              forceUnlockScroll();
              popNavLayerSilently("draftSaved");
            }}
          />
        )}

        {/* 8. Modal Konfirmasi Sesi Telah Dikunci Sebelumnya (Permintaan 2b) */}
        {showLockedModal && lockedSessionData && (
          <LockedSessionModal
            clientName={lockedSessionData.clientName || clientName}
            waktu={lockedSessionData.waktu}
            count={lockedSessionData.count}
            selectedFileNames={lockedSessionData.selectedFileNames}
            notes={lockedSessionData.notes}
            onUnlockAndEdit={() => {
              if (lockedSessionData.matchedIds && lockedSessionData.matchedIds.length > 0) {
                setSelectedIds(lockedSessionData.matchedIds);
              }
              if (lockedSessionData.notes) {
                setNotes(lockedSessionData.notes);
              }
              if (lockedSessionData.photoNotes) {
                setPhotoNotes(lockedSessionData.photoNotes);
              }
              setShowWelcome(false);
              setHasStarted(true);
              setCurrentView("gallery");
              setShowLockedModal(false);
              forceUnlockScroll();
            }}
            onViewLocked={() => {
              if (lockedSessionData.matchedIds && lockedSessionData.matchedIds.length > 0) {
                setSelectedIds(lockedSessionData.matchedIds);
              }
              if (lockedSessionData.notes) {
                setNotes(lockedSessionData.notes);
              }
              if (lockedSessionData.photoNotes) {
                setPhotoNotes(lockedSessionData.photoNotes);
              }
              setShowWelcome(false);
              setHasStarted(true);
              pushNavLayer("preview");
              setCurrentView("preview");
              setShowLockedModal(false);
              forceUnlockScroll();
            }}
          />
        )}

        {/* 9. Modal Konfirmasi Hapus Seluruh Pilihan Foto */}
        {showClearConfirmModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(9, 9, 11, 0.88)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              zIndex: 100000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}>
            <div
              style={{
                backgroundColor: "#16161a",
                borderRadius: "24px",
                padding: "30px 24px",
                maxWidth: "420px",
                width: "100%",
                textAlign: "center",
                boxShadow:
                  "0 24px 60px rgba(0, 0, 0, 0.85), 0 0 20px rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                animation: "fadeIn 0.2s ease-out",
              }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                  color: "#ef4444",
                }}>
                <IconTrash size={28} color="#ef4444" />
              </div>

              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: "8px",
                }}>
                Hapus Semua Pilihan Foto?
              </h3>

              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: "0.86rem",
                  lineHeight: 1.5,
                  marginBottom: "24px",
                }}>
                Sebanyak{" "}
                <strong style={{ color: "#f0cf8e" }}>
                  {selectedIds.length} foto
                </strong>{" "}
                yang telah Anda pilih akan dikosongkan kembali, termasuk catatan
                khusus jika ada.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}>
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  style={{
                    flex: 1,
                    height: "44px",
                    borderRadius: "9999px",
                    backgroundColor: "#222228",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ededed",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}>
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  style={{
                    flex: 1,
                    height: "44px",
                    borderRadius: "9999px",
                    backgroundColor: "#dc2626",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(220, 38, 38, 0.4)",
                    transition: "all 0.15s ease",
                  }}>
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Keseluruhan Web Menyesuaikan Web-Porto (Permintaan #4) */}
      <Footer />
    </div>
  );
}

export default function GalleryClient() {
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
          Memuat Galeri Fotonic...
        </div>
      }>
      <GalleryContent />
    </Suspense>
  );
}
