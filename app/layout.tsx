import type { Metadata, Viewport } from "next";
import "./global.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://fotonic-project-seleksi-foto-client.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Fotonic - Seleksi Foto Klien",
  description: "Portal seleksi foto resmi klien Fotonic Photo & Video Project",
  icons: {
    icon: [
      { url: "/Fotonic Logo White.ico", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/Fotonic Logo White.ico",
    apple: "/og-logo.png",
  },
  openGraph: {
    title: "Fotonic - Seleksi Foto Klien",
    description: "Portal seleksi foto resmi klien Fotonic Photo & Video Project",
    type: "website",
    siteName: "Fotonic Project",
    images: [
      {
        url: "/og-logo.png",
        width: 600,
        height: 600,
        alt: "Fotonic Photo & Video Project",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Fotonic - Seleksi Foto Klien",
    description: "Portal seleksi foto resmi klien Fotonic Photo & Video Project",
    images: ["/og-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/Fotonic Logo White.ico" sizes="any" />
        <link rel="shortcut icon" href="/Fotonic Logo White.ico" />
        <link rel="apple-touch-icon" href="/og-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Tangerine:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body style={{ fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
