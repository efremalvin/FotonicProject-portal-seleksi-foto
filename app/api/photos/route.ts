import { NextRequest, NextResponse } from "next/server";
import {
  getPhotosFromFolder,
  getEditedPhotosFromFolder,
  getFolderDetails,
} from "@/lib/google/drive";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id");
  const mode = searchParams.get("mode");

  if (!folderId) {
    return NextResponse.json(
      { error: "Parameter folder_id wajib disertakan" },
      { status: 400 },
    );
  }

  try {
    const [photosData, folder] = await Promise.all([
      mode === "edited"
        ? getEditedPhotosFromFolder(folderId)
        : getPhotosFromFolder(folderId),
      getFolderDetails(folderId),
    ]);

    const isExpired = Boolean((photosData as any).isExpired);
    const noEditedFolder = Boolean((photosData as any).noEditedFolder);

    return NextResponse.json({
      success: true,
      folder,
      isExpired,
      noEditedFolder,
      photos: isExpired ? [] : photosData,
      hasSubfolders: isExpired ? false : ((photosData as any).hasSubfolders || false),
      sections: isExpired ? [] : ((photosData as any).sections || []),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil daftar foto" },
      { status: 500 },
    );
  }
}
