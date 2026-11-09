import { NextRequest, NextResponse } from "next/server";
import {
  getPhotosFromFolder,
  getEditedPhotosFromFolder,
  getFolderDetails,
} from "@/lib/google/drive";
import {
  appendSelectionToSheet,
  appendEditedReviewToSheet,
} from "@/lib/google/sheets";
import {
  formatCombinedNotes,
  formatPhotoCommentsOnly,
} from "@/lib/notesHelper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      folderId,
      clientName,
      max,
      selectedFileIds,
      notes,
      photoNotes,
      isDraft,
      photoDate,
      sessionDate,
      mode,
    } = body;

    if (!folderId) {
      return NextResponse.json(
        { error: "Format permintaan tidak valid" },
        { status: 400 },
      );
    }

    // ========================================================
    // MODE EDITED: Konfirmasi / Komentar Hasil Editan Foto (Tab "Edited")
    // ========================================================
    if (mode === "edited") {
      const editedPhotos = await getEditedPhotosFromFolder(folderId);
      if (editedPhotos.length === 0) {
        return NextResponse.json(
          { error: "Tidak ada foto hasil editan di dalam folder Edited." },
          { status: 400 },
        );
      }

      const photoCommentsFormatted = formatPhotoCommentsOnly(
        photoNotes && typeof photoNotes === "object" ? photoNotes : {},
        editedPhotos,
      );

      let resolvedDate = photoDate || sessionDate || null;
      if (!resolvedDate) {
        try {
          const folderDetails = await getFolderDetails(folderId);
          resolvedDate = folderDetails.photoDate;
        } catch {
          // Fallback
        }
      }

      const submissionStatus = isDraft ? "DRAF" : "TERKUNCI";

      await appendEditedReviewToSheet({
        clientName: clientName || "Klien Fotonic",
        totalEditedPhotos: editedPhotos.length,
        photoCommentsFormatted,
        overallNotes: typeof notes === "string" ? notes : "",
        folderId,
        status: submissionStatus,
        sessionDate: resolvedDate || "-",
      });

      return NextResponse.json({
        success: true,
        message: isDraft
          ? "Komentar hasil editan berhasil disimpan sementara"
          : "Hasil editan berhasil dikonfirmasi & dikunci",
        status: submissionStatus,
        count: editedPhotos.length,
        fileNames: editedPhotos.map((p) => p.name),
        photoCommentsFormatted,
        timestamp: new Date().toISOString(),
      });
    }

    // ========================================================
    // MODE DEFAULT: Seleksi Foto Awal (Tab "Sheet1")
    // ========================================================
    if (!selectedFileIds || !Array.isArray(selectedFileIds)) {
      return NextResponse.json(
        { error: "Format permintaan tidak valid" },
        { status: 400 },
      );
    }

    const parsedMax = Number(max);
    const effectiveMax =
      !isNaN(parsedMax) && parsedMax > 0 && parsedMax <= 50 ? parsedMax : 50;
    const selectedCount = selectedFileIds.length;

    if (selectedCount < 1) {
      return NextResponse.json(
        { error: "Pilih minimal 1 foto sebelum menyimpan atau mengirim seleksi." },
        { status: 400 },
      );
    }

    // Hanya kunci pilihan (bukan draf) yang dibatasi kuota maksimum ketat
    if (!isDraft && selectedCount > effectiveMax) {
      return NextResponse.json(
        {
          error: `Jumlah foto yang dipilih (${selectedCount}) melebihi batas maksimum (${effectiveMax}).`,
        },
        { status: 400 },
      );
    }

    const photosInFolder = await getPhotosFromFolder(folderId);
    const photoMap = new Map(photosInFolder.map((p) => [p.id, p.name]));

    const resolvedFileNames: string[] = [];
    for (const fileId of selectedFileIds) {
      const fileName = photoMap.get(fileId);
      if (fileName) {
        resolvedFileNames.push(fileName);
      }
    }

    if (resolvedFileNames.length === 0) {
      return NextResponse.json(
        { error: `File yang dipilih tidak ditemukan dalam folder Google Drive ini.` },
        { status: 400 },
      );
    }

    // Gabungkan catatan khusus per foto (jika ada) ke dalam catatan umum
    const combinedNotes = formatCombinedNotes(
      typeof notes === "string" ? notes : "",
      photoNotes && typeof photoNotes === "object" ? photoNotes : {},
      photosInFolder,
    );

    const submissionStatus = isDraft ? "DRAF" : "TERKUNCI";

    let resolvedDate = photoDate || sessionDate || null;
    let quotaValue = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : null;

    if (!resolvedDate || !quotaValue) {
      try {
        const folderDetails = await getFolderDetails(folderId);
        if (!resolvedDate) resolvedDate = folderDetails.photoDate;
        if (!quotaValue) quotaValue = folderDetails.maxPhotos;
      } catch (e) {
        // Fallback jika metadata folder gagal diambil
      }
    }

    await appendSelectionToSheet({
      clientName: clientName || "Klien Fotonic",
      selectedFileNames: resolvedFileNames,
      notes: combinedNotes,
      folderId,
      status: submissionStatus,
      sessionDate: resolvedDate || "-",
      quota: quotaValue || effectiveMax,
    });

    return NextResponse.json({
      success: true,
      message: isDraft
        ? "Pilihan berhasil disimpan sementara"
        : "Seleksi berhasil dikonfirmasi & dikunci",
      status: submissionStatus,
      count: resolvedFileNames.length,
      fileNames: resolvedFileNames,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Submission error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Terjadi kesalahan pada server saat memproses seleksi.",
      },
      { status: 500 },
    );
  }
}
