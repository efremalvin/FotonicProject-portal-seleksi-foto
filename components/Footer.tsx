"use client";

import React from "react";
import { IconLocation } from "./Icons";

/**
 * Ikon WhatsApp persis seperti Web-Porto (Outline bubble hijau dengan gagang telepon di dalam)
 */
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0, color: "#25d366" }}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.33 11.33 0 0 0 12.04.64C5.76.64.65 5.75.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.64l6.05-1.59a11.37 11.37 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.4 0-3.04-1.18-5.9-3.34-8.06z" />
    </svg>
  );
}

/**
 * Ikon Instagram dengan aksen warna gold mewah Fotonic
 */
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d6a85a"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="#d6a85a" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const waChatLink =
    "https://wa.me/6281994218428?text=" +
    encodeURIComponent(
      "Halo Admin Fotonic Project! Saya ingin bertanya mengenai paket foto. Mohon infonya ya. Terima kasih."
    );

  return (
    <footer id="kontak" className="footer-section">
      {/* Subtle Ambient Light Gold Accent di Batas Atas */}
      <div className="footer-ambient-light" />

      <div className="footer-container">
        <div className="footer-content">
          {/* Brand Info Identik Web-Porto */}
          <div className="footer-brand">
            <a href="#top" className="footer-brand-link" aria-label="Fotonic Project">
              <span className="footer-brand-title">Fotonic</span>
              <span className="footer-brand-subtitle">PHOTO &amp; VIDEO PROJECT</span>
            </a>
            <p className="footer-quote">&ldquo;Capture your moment and tell your story&rdquo;</p>
            <p className="footer-location" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconLocation size={16} color="#d6a85a" style={{ flexShrink: 0 }} />
              <span>Bandar Lampung &amp; Sekitarnya</span>
            </p>
          </div>

          {/* Symmetrical Action Buttons (WhatsApp & Instagram) Persis Screenshot */}
          <div className="footer-actions">
            <a
              href={waChatLink}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-btn footer-btn-wa">
              <WhatsAppIcon size={18} />
              <span className="footer-btn-text">WhatsApp</span>
            </a>
            <a
              href="https://www.instagram.com/fotonicproject"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-btn footer-btn-ig">
              <InstagramIcon size={18} />
              <span className="footer-btn-text">@fotonicproject</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <p className="footer-copyright">
          © {year} Fotonic Project. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
