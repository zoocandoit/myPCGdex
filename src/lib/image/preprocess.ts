"use client";

import heic2any from "heic2any";

export interface PreprocessResult {
  dataUrl: string;
  mimeType: string;
  wasConverted: boolean;
  originalSize: number;
  finalSize: number;
}

export interface PreprocessOptions {
  maxDimension?: number;
  quality?: number;
  targetFormat?: "image/jpeg" | "image/webp";
}

const DEFAULT_OPTIONS: Required<PreprocessOptions> = {
  maxDimension: 1400,
  quality: 0.85,
  targetFormat: "image/jpeg",
};

/**
 * Check if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const heicTypes = ["image/heic", "image/heif"];
  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  // Check extension as fallback (iOS sometimes doesn't set mime type correctly)
  const ext = file.name.toLowerCase().split(".").pop();
  return ext === "heic" || ext === "heif";
}

/**
 * Convert HEIC/HEIF to JPEG
 */
export async function convertHeicToJpeg(
  file: File,
  quality: number = 0.85
): Promise<Blob> {
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality,
  });

  // heic2any can return array or single blob
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

/**
 * Load an image from a Blob/File and get its dimensions
 */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Get EXIF orientation from image data
 * Returns orientation value (1-8) or 1 if not found
 */
async function getExifOrientation(file: File): Promise<number> {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);

    // Check for JPEG SOI marker
    if (view.getUint16(0, false) !== 0xffd8) {
      return 1;
    }

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 marker (EXIF)
      if (marker === 0xffe1) {
        // Skip length field (we don't need it for orientation extraction)
        const _length = view.getUint16(offset, false);
        offset += 2;

        // Check for "Exif\0\0"
        if (
          view.getUint32(offset, false) === 0x45786966 &&
          view.getUint16(offset + 4, false) === 0x0000
        ) {
          offset += 6;

          // Check byte order
          const littleEndian = view.getUint16(offset, false) === 0x4949;
          offset += 8;

          // Get number of entries
          const entries = view.getUint16(offset, littleEndian);
          offset += 2;

          // Search for orientation tag (0x0112)
          for (let i = 0; i < entries; i++) {
            const tag = view.getUint16(offset + i * 12, littleEndian);
            if (tag === 0x0112) {
              return view.getUint16(offset + i * 12 + 8, littleEndian);
            }
          }
        }
        break;
      } else if ((marker & 0xff00) === 0xff00) {
        offset += view.getUint16(offset, false);
      } else {
        break;
      }
    }
  } catch {
    // Ignore EXIF parsing errors
  }
  return 1;
}

/**
 * Resize and optionally rotate image based on EXIF orientation
 */
async function resizeImage(
  blob: Blob,
  maxDimension: number,
  quality: number,
  targetFormat: "image/jpeg" | "image/webp",
  orientation: number = 1
): Promise<Blob> {
  const img = await loadImage(blob);

  // Calculate new dimensions
  let { width, height } = img;

  // Swap dimensions for orientations that rotate 90/270 degrees
  const rotates90 = [5, 6, 7, 8].includes(orientation);
  if (rotates90) {
    [width, height] = [height, width];
  }

  // Calculate scale to fit within maxDimension
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Apply EXIF orientation transforms
  ctx.save();

  switch (orientation) {
    case 2: // Flip horizontal
      ctx.scale(-1, 1);
      ctx.translate(-newWidth, 0);
      break;
    case 3: // Rotate 180
      ctx.rotate(Math.PI);
      ctx.translate(-newWidth, -newHeight);
      break;
    case 4: // Flip vertical
      ctx.scale(1, -1);
      ctx.translate(0, -newHeight);
      break;
    case 5: // Rotate 90 CW + flip horizontal
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6: // Rotate 90 CW
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -newHeight);
      break;
    case 7: // Rotate 90 CCW + flip horizontal
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1, -1);
      ctx.translate(-newWidth, -newHeight);
      break;
    case 8: // Rotate 90 CCW
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-newWidth, 0);
      break;
    default:
      break;
  }

  // Draw image with proper dimensions for rotated orientations
  if (rotates90) {
    ctx.drawImage(img, 0, 0, newHeight, newWidth);
  } else {
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
  }

  ctx.restore();

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      targetFormat,
      quality
    );
  });
}

/**
 * Preprocess an image file for upload
 * - Converts HEIC to JPEG
 * - Resizes to max dimension
 * - Normalizes EXIF orientation
 * - Returns data URL ready for upload
 */
export async function preprocessImage(
  file: File,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;
  let wasConverted = false;
  let blob: Blob = file;
  let mimeType = file.type;

  // Step 1: Convert HEIC to JPEG if needed
  if (isHeicFile(file)) {
    blob = await convertHeicToJpeg(file, opts.quality);
    mimeType = "image/jpeg";
    wasConverted = true;
  }

  // Step 2: Get EXIF orientation before resize
  const orientation = await getExifOrientation(file);

  // Step 3: Resize and normalize orientation
  // Check if we need to resize
  const img = await loadImage(blob);
  const maxCurrentDimension = Math.max(img.width, img.height);
  URL.revokeObjectURL(img.src);

  if (maxCurrentDimension > opts.maxDimension || orientation !== 1 || wasConverted) {
    blob = await resizeImage(
      blob,
      opts.maxDimension,
      opts.quality,
      opts.targetFormat,
      orientation
    );
    mimeType = opts.targetFormat;
    wasConverted = true;
  }

  // Step 4: Convert to data URL
  const dataUrl = await blobToDataUrl(blob);

  return {
    dataUrl,
    mimeType,
    wasConverted,
    originalSize,
    finalSize: blob.size,
  };
}

/**
 * Convert a Blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Validate file before preprocessing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  // Check type (also check extension for HEIC)
  const isValidType = validTypes.includes(file.type.toLowerCase()) || isHeicFile(file);
  if (!isValidType) {
    return {
      valid: false,
      error: "Unsupported format. Please use JPG, PNG, WebP, or HEIC.",
    };
  }

  // Check size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`,
    };
  }

  return { valid: true };
}
