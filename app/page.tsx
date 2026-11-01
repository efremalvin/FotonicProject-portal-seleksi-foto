"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
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
import { forceUnlockScroll } from "@/lib/scrollLock";

interface Photo {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  width?: number;
  height?: number;
  isLandscape?: boolean;
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

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= maxPhotos) return prev;
        return [...prev, id];
      }
    });
  };

  const handleGoToPreview = () => {
    setCurrentView("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToGallery = () => {
    setCurrentView("gallery");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  // Foto-foto yang sedang terpilih
  const selectedPhotosList = photos
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  const isQuotaFull = selectedIds.length >= maxPhotos;

  const handleOpenPreview = (id: string) => {
    const activeList = currentView === "preview" ? selectedPhotosList : photos;
    const idx = activeList.findIndex((p) => p.id === id);
    setFullviewIndex(idx >= 0 ? idx : 0);
  };

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
            onCrossfadeStart={() => {
              // Hanya tampilkan Selamat Datang untuk pengunjung baru (bukan draf / sesi terkunci)
              if (!hasStarted && !hasSessionRef.current) {
                setShowWelcome(true);
              }
            }}
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
            <ProgressBar current={selectedIds.length} max={maxPhotos} />

            <div
              style={{
                maxWidth: "1160px",
                margin: "0 auto",
                padding: "0 12px",
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
                /* Tata Letak Kolom Masonry Pintar: Tanpa Gap Kosong (Landscape Otomatis Menyesuaikan di Samping Portrait) */
                <MasonryGallery
                  photos={photos}
                  renderItem={(photo) => (
                    <PhotoCard
                      id={photo.id}
                      name={photo.name}
                      isSelected={selectedIds.includes(photo.id)}
                      isDisabled={
                        selectedIds.length >= maxPhotos &&
                        !selectedIds.includes(photo.id)
                      }
                      onToggle={toggleSelect}
                      onPreview={(id) => handleOpenPreview(id)}
                      width={photo.width}
                      height={photo.height}
                      isLandscape={photo.isLandscape}
                    />
                  )}
                />
              )}
            </div>

            {/* Tombol Mengambang: Simpan Sementara & Lihat Foto Terpilih (Permintaan #1) */}
            {selectedIds.length > 0 && (
              <div
                style={{
                  position: "fixed",
                  bottom: "20px",
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "0 16px",
                  zIndex: 9999,
                  pointerEvents: "none",
                  flexWrap: "wrap",
                }}>
                {/* Tombol 1: Simpan Sementara */}
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
                    backdropFilter: "blur(10px)",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#d6a85a";
                    e.currentTarget.style.backgroundColor = "#1f1f26";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(214, 168, 90, 0.45)";
                    e.currentTarget.style.backgroundColor = "#16161a";
                  }}>
                  <span>💾</span>
                  <span>{isSavingDraft ? "Menyimpan..." : "Simpan Sementara"}</span>
                </button>

                {/* Tombol 2: Lihat Foto Terpilih */}
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
                  {/* Layer 2: Background Hijau Gradien dengan Transisi Opacity Super Halus (Permintaan #5) */}
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
                      {isQuotaFull
                        ? `Lihat Foto Terpilih (${selectedIds.length}/${maxPhotos})`
                        : `Lihat Foto Terpilih (${selectedIds.length}/${maxPhotos})`}
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
          </>
        )}

        {/* 3. TAMPILAN 2: HALAMAN PRATINJAU FOTO TERPILIH */}
        {currentView === "preview" && (
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
            onPreview={(id) => handleOpenPreview(id)}
            onToggle={toggleSelect}
            photoNotes={photoNotes}
            onOpenNote={(id, name) => setActiveNoteModalPhoto({ id, name })}
          />
        )}

      {/* 4. TAMPILAN 3: HALAMAN SUKSES FINAL DENGAN TOMBOL WHATSAPP */}
      {currentView === "success" && (
        <SuccessModal
          clientName={clientName}
          selectedFileNames={submittedFileNames}
          notes={notes}
          adminWaNumber="6281994218428" // Masukkan nomor WhatsApp resmi Fotonic di sini
        />
      )}

        {/* 5. Modal Fullview dengan Zoom & Panning Independen (Permintaan #2 & #3) */}
        {fullviewIndex !== null && (
          <PhotoModal
            photos={currentView === "preview" ? selectedPhotosList : photos}
            currentIndex={fullviewIndex}
            isOpen={fullviewIndex !== null}
            onClose={() => setFullviewIndex(null)}
            onNavigate={(newIdx) => setFullviewIndex(newIdx)}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            photoNotes={photoNotes}
            onOpenNote={(id, name) => setActiveNoteModalPhoto({ id, name })}
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
              setActiveNoteModalPhoto(null);
            }}
            onClose={() => setActiveNoteModalPhoto(null)}
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
              setCurrentView("preview");
              setShowLockedModal(false);
              forceUnlockScroll();
            }}
          />
        )}
      </div>

      {/* Footer Keseluruhan Web Menyesuaikan Web-Porto (Permintaan #4) */}
      <Footer />
    </div>
  );
}

export default function GalleryPage() {
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
