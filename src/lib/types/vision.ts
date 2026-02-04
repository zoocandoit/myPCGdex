import { z } from "zod";

// Supported languages: Korean, Japanese, English only
export const SUPPORTED_LANGUAGES = ["ko", "ja", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Vision API response schema
export const VisionResponseSchema = z.object({
  pokemon_name: z.string().min(1, "Pokemon name is required"),
  card_number: z.string().min(1, "Card number is required"),
  set_id: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES),
});

export type VisionResponse = z.infer<typeof VisionResponseSchema>;

// Vision API request schema
export const VisionRequestSchema = z.object({
  imageUrl: z.string().url("Valid image URL is required"),
});

export type VisionRequest = z.infer<typeof VisionRequestSchema>;

// Scan result for UI
export type ScanResult = {
  success: boolean;
  data?: VisionResponse;
  error?: string;
  imageUrl?: string;
};

// Upload result
export type UploadResult = {
  success: boolean;
  path?: string;
  signedUrl?: string;
  error?: string;
};
