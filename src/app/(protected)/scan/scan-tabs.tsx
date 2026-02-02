"use client";

import { DualImageScanner } from "./dual-image-scanner";

export function ScanTabs() {
  // Dual image scanner works on both desktop and mobile
  // On mobile, file input gives option to take photo or choose from gallery
  return <DualImageScanner />;
}
