import { NextRequest, NextResponse } from "next/server";
import { getLatestSelectionFromSheet } from "@/lib/google/sheets";
import { getPhotosFromFolder } from "@/lib/google/drive";
import { parseCombinedNotes } from "@/lib/notesHelper";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id");

  if (!folderId) {
    return NextResponse.json(
      { error: "Parameter folder_id belum ditentukan." },
      { status: 400 },
    );
  }

  try {
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
