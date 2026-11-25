"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { DrivePhoto } from "@/lib/google/drive";

interface MasonryGalleryProps {
  photos: DrivePhoto[];
  renderItem: (photo: DrivePhoto) => React.ReactNode;
}

export default function MasonryGallery({ photos, renderItem }: MasonryGalleryProps) {
  // Responsive column count: 2 pada mobile, 3 pada tablet, 4 pada desktop
  const [numCols, setNumCols] = useState<number>(2);

  useEffect(() => {
    let lastWidth = -1;
    const updateColumnCount = () => {
      const width = window.innerWidth;
      // Abaikan event resize akibat sembunyi/munculnya address bar vertikal di HP
      if (width === lastWidth) return;
      lastWidth = width;

      const nextCols = width >= 1024 ? 4 : width >= 640 ? 3 : 2;
      setNumCols((prev) => (prev === nextCols ? prev : nextCols));
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount, { passive: true });
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  // Algoritma Smart Height-Balancing:
  // Jika bersebelahan dengan foto potret (tinggi), foto landscape (lebar/pendek)
  // akan otomatis berpasangan menumpuk di kolom sebelahnya agar tidak ada gap kosong.
  const columns = useMemo(() => {
    const cols: DrivePhoto[][] = Array.from({ length: numCols }, () => []);
    const colHeights: number[] = Array.from({ length: numCols }, () => 0);

    for (const photo of photos) {
      // Cari kolom dengan akumulasi tinggi paling rendah saat ini
      let targetCol = 0;
      for (let c = 1; c < numCols; c++) {
        if (colHeights[c] < colHeights[targetCol]) {
          targetCol = c;
        }
      }

      cols[targetCol].push(photo);

      // Estimasi rasio tinggi kartu:
      // Portrait (~2:3 atau ~3:4): rasio tinggi ~1.45
      // Landscape (~3:2 atau ~4:3): rasio tinggi ~0.72
      let cardHeight = 1.0;
      if (photo.isLandscape !== undefined) {
        cardHeight = photo.isLandscape ? 0.72 : 1.45;
      } else if (photo.width && photo.height) {
        cardHeight = photo.height / photo.width;
      }

      colHeights[targetCol] += cardHeight;
    }

    return cols;
  }, [photos, numCols]);

  return (
    <div className="gallery-masonry-container">
      {columns.map((colPhotos, colIdx) => (
        <div key={colIdx} className="gallery-masonry-col">
          {colPhotos.map((photo) => (
            <div key={photo.id} className="photo-masonry-item">
              {renderItem(photo)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
