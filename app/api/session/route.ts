import { NextRequest, NextResponse } from "next/server";
import {
  getLatestSelectionFromSheet,
  getLatestEditedReviewFromSheet,
} from "@/lib/google/sheets";
import {
  getPhotosFromFolder,
  getEditedPhotosFromFolder,
} from "@/lib/google/drive";
import {
  parseCombinedNotes,
  parsePhotoCommentsOnly,
} from "@/lib/notesHelper";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id");
  const mode = searchParams.get("mode");

  if (!folderId) {
    return NextResponse.json(
      { error: "Parameter folder_id belum ditentukan." },
      { status: 400 },
    );
  }

  try {
    if (mode === "edited") {
      const record = await getLatestEditedReviewFromSheet(folderId);

      if (!record) {
        return NextResponse.json({
          hasPreviousSession: false,
        });
      }

      const photosInFolder = await getEditedPhotosFromFolder(folderId);
      const photoNotes = parsePhotoCommentsOnly(
        record.photoCommentsRaw,
        photosInFolder,
      );

      return NextResponse.json({
        hasPreviousSession: true,
        status: record.status, // "DRAF" | "TERKUNCI"
        waktu: record.waktu,
        clientName: record.clientName,
        sessionDate: record.sessionDate,
        count: record.count,
        notes: record.overallNotes,
        photoNotes,
        photoCommentsRaw: record.photoCommentsRaw,
      });
    }

    const record = await getLatestSelectionFromSheet(folderId);

    if (!record) {
      return NextResponse.json({
        hasPreviousSession: false,
      });
    }

    // Cocokkan nama file dengan ID foto yang ada di Google Drive
    const photosInFolder = await getPhotosFromFolder(folderId);
    const nameToId = new Map(
      photosInFolder.map((p) => [p.name.toLowerCase().trim(), p.id]),
    );

    const matchedIds: string[] = [];
    for (const fileName of record.selectedFileNames) {
      const id = nameToId.get(fileName.toLowerCase().trim());
      if (id) {
        matchedIds.push(id);
      }
    }

    const { overallNotes, photoNotes } = parseCombinedNotes(
      record.notes,
      photosInFolder,
    );

    return NextResponse.json({
      hasPreviousSession: true,
      status: record.status, // "DRAF" | "TERKUNCI"
      waktu: record.waktu,
      clientName: record.clientName,
      sessionDate: record.sessionDate,
      quota: record.quota,
      count: record.count,
      selectedFileNames: record.selectedFileNames,
      matchedIds,
      notes: overallNotes,
      photoNotes,
    });
  } catch (error: any) {
    console.error("Gagal memeriksa sesi Google Sheets:", error);
    return NextResponse.json(
      { error: "Gagal memeriksa sesi Google Sheets." },
      { status: 500 },
    );
  }
}
