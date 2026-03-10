import type { VisionResponse } from "@/lib/types/vision";

export interface OcrProgress {
  status: string;
  /** 0 ~ 1 */
  progress: number;
}

/**
 * Run Tesseract.js OCR on a card front image (base64 data URL).
 * Dynamically imported to avoid SSR issues and reduce initial bundle size.
 *
 * Language models loaded: eng + kor (covers English and Korean cards).
 * Japanese (jpn) is intentionally skipped by default to keep load time short;
 * card numbers and set codes are ASCII so they still get picked up.
 */
export async function ocrCardFront(
  imageDataUrl: string,
  onProgress?: (p: OcrProgress) => void
): Promise<VisionResponse> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker(["eng", "kor"], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) {
        onProgress({ status: m.status, progress: m.progress ?? 0 });
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(imageDataUrl);
    return parseCardText(text);
  } finally {
    await worker.terminate();
  }
}

// ─── Text Parser ──────────────────────────────────────────────────────────────

function parseCardText(raw: string): VisionResponse {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const fullText = lines.join(" ");

  // ── Card number ──────────────────────────────────────────
  // Matches: "025/165", "001/100", "123/SV-P", "SWSH001"
  const numberMatch = fullText.match(/\b(\d{2,3}\/\d{2,3})\b/);
  const cardNumber = numberMatch?.[1] ?? "";

  // ── Set ID ───────────────────────────────────────────────
  // Matches: "SV2a", "sv4", "BW1", "SWSH", "HS", "XY" etc.
  // Exclude pure numbers and common false positives
  const setIdMatch = fullText.match(/\b([A-Z]{1,5}\d{1,3}[a-z]?)\b/);
  const setId = setIdMatch?.[1] ?? undefined;

  // ── Language detection ───────────────────────────────────
  const hasKorean = /[\uac00-\ud7a3]/.test(raw);
  const hasJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(raw);
  const language: "ko" | "ja" | "en" = hasKorean ? "ko" : hasJapanese ? "ja" : "en";

  // ── Pokemon name ─────────────────────────────────────────
  // Strategy: first meaningful line that isn't a card number or pure symbols
  let pokemonName = "";
  for (const line of lines) {
    if (line.length < 2) continue;
    if (/^\d+\/\d+$/.test(line)) continue; // pure card number
    if (/^[\d\s/.\-—–]+$/.test(line)) continue; // only digits/punctuation
    // Must contain at least one letter (Latin, Hangul, or Kana)
    if (!/[a-zA-Z\uac00-\ud7a3\u3040-\u30ff]/.test(line)) continue;
    pokemonName = line;
    break;
  }

  return {
    pokemon_name: pokemonName,
    card_number: cardNumber,
    set_id: setId,
    language,
  };
}
