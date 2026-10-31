let lockCount = 0;

/**
 * Mengunci scroll body secara aman dengan reference counting,
 * mencegah bug ketika dua modal tumpang tindih (misalnya crossfade loading dan welcome modal).
 */
export function lockScroll() {
  if (typeof document === "undefined") return;
  lockCount++;
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
}

/**
 * Melepas satu kunci scroll. Hanya membuka scroll jika tidak ada modal lain yang aktif.
 */
export function unlockScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }
}

/**
 * Memaksa membuka seluruh kunci scroll (misalnya saat pengguna sudah menekan Mulai Memilih).
 */
export function forceUnlockScroll() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
}
