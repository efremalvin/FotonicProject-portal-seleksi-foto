import type { Metadata } from "next";
import {
  getFolderDetails,
  extractFolderId,
  isDriveItemInsideAllowedRoot,
} from "@/lib/google/drive";
import EditedClientPage from "@/components/EditedClientPage";

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
      const isAllowed = await isDriveItemInsideAllowedRoot(folderId);
      if (isAllowed) {
        const folderInfo = await getFolderDetails(folderId);
        if (folderInfo?.clientName) {
          clientName = folderInfo.clientName;
        }
      }
    } catch {
      // Fallback jika gagal atau di luar direktori resmi
    }
  }

  const pageTitle = clientName
    ? `Fotonic - Hasil Edit Foto ${clientName}`
    : "Fotonic - Hasil Edit Foto Klien";
  const pageDescription =
    "Portal peninjauan hasil editan foto resmi klien Fotonic Photo & Video Project";

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

export default function EditedPage() {
  return <EditedClientPage />;
}
