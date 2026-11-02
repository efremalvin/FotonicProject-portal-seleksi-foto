import type { Metadata } from "next";
import { getFolderDetails, extractFolderId } from "@/lib/google/drive";
import GalleryClient from "@/components/GalleryClient";

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const rawFolderParam =
    typeof searchParams?.folder_id === "string" ? searchParams.folder_id : "";
  const urlClient =
    typeof searchParams?.klien === "string" ? searchParams.klien.trim() : "";

  const folderId = extractFolderId(rawFolderParam);
  let clientName = urlClient;

  if (!clientName && folderId) {
    try {
      const folderInfo = await getFolderDetails(folderId);
      if (folderInfo?.clientName) {
        clientName = folderInfo.clientName;
      }
    } catch {
      // Fallback ke judul default jika gagal mengambil nama folder
    }
  }

  const pageTitle = clientName
    ? `Fotonic - Seleksi Foto ${clientName}`
    : "Fotonic - Seleksi Foto Klien";
  const pageDescription =
    "Portal seleksi foto resmi klien Fotonic Photo & Video Project";

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      type: "website",
      siteName: "Fotonic Project",
      images: [
        {
          url: "/og-logo.png",
          width: 600,
          height: 600,
          alt: pageTitle,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: pageTitle,
      description: pageDescription,
      images: ["/og-logo.png"],
    },
  };
}

export default function GalleryPage() {
  return <GalleryClient />;
}
