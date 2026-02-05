import { z } from "zod";

// Card condition enum matching database
export const CardCondition = {
  MINT: "mint",
  NEAR_MINT: "near_mint",
  LIGHTLY_PLAYED: "lightly_played",
  MODERATELY_PLAYED: "moderately_played",
  HEAVILY_PLAYED: "heavily_played",
} as const;

export type CardCondition = (typeof CardCondition)[keyof typeof CardCondition];

// Card language enum matching database
export const CardLanguage = {
  KO: "ko",
  JA: "ja",
  EN: "en",
} as const;

export type CardLanguage = (typeof CardLanguage)[keyof typeof CardLanguage];

// Input method enum
export const InputMethod = {
  VISION: "vision",
  MANUAL: "manual",
} as const;

export type InputMethod = (typeof InputMethod)[keyof typeof InputMethod];

// Collection card type
export interface CollectionCard {
  id: string;
  user_id: string;

  // Basic info
  pokemon_name: string;
  card_number: string;
  set_id: string | null;
  language: CardLanguage;
  rarity: string | null;

  // TCG API info (auto via Vision)
  tcg_card_id: string | null;
  set_name: string | null;
  tcg_image_url: string | null;
  market_price: number | null;
  artist: string | null;

  // Collection info (manual)
  purchase_price: number | null;
  condition: CardCondition;
  quantity: number;
  notes: string | null;

  // Images
  front_image_path: string | null;
  back_image_path: string | null;

  // Meta
  input_method: InputMethod;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

// Schema for manual card entry
export const ManualCardEntrySchema = z.object({
  pokemon_name: z.string().min(1, "Pokemon name is required"),
  card_number: z.string().min(1, "Card number is required"),
  set_id: z.string().optional(),
  language: z.enum(["ko", "ja", "en"]).default("ko"),
  rarity: z.string().optional(),
  purchase_price: z.number().min(0).optional(),
  condition: z
    .enum(["mint", "near_mint", "lightly_played", "moderately_played", "heavily_played"])
    .default("near_mint"),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional(),
  front_image_path: z.string().optional(),
  back_image_path: z.string().optional(),
});

export type ManualCardEntry = z.infer<typeof ManualCardEntrySchema>;

// Schema for Vision-based card entry (includes TCG data)
export const VisionCardEntrySchema = ManualCardEntrySchema.extend({
  tcg_card_id: z.string().optional(),
  set_name: z.string().optional(),
  tcg_image_url: z.string().url().optional(),
  market_price: z.number().min(0).optional(),
  artist: z.string().optional(),
});

export type VisionCardEntry = z.infer<typeof VisionCardEntrySchema>;

// Condition display labels
export const CONDITION_LABELS: Record<CardCondition, { ko: string; en: string; ja: string }> = {
  mint: { ko: "민트", en: "Mint", ja: "ミント" },
  near_mint: { ko: "니어민트", en: "Near Mint", ja: "ニアミント" },
  lightly_played: { ko: "라이틀리 플레이드", en: "Lightly Played", ja: "ライトリープレイド" },
  moderately_played: { ko: "모더레이틀리 플레이드", en: "Moderately Played", ja: "モデレートリープレイド" },
  heavily_played: { ko: "헤비리 플레이드", en: "Heavily Played", ja: "ヘビリープレイド" },
};

// Language display labels
export const LANGUAGE_LABELS: Record<CardLanguage, { ko: string; en: string; ja: string }> = {
  ko: { ko: "한국어", en: "Korean", ja: "韓国語" },
  ja: { ko: "일본어", en: "Japanese", ja: "日本語" },
  en: { ko: "영어", en: "English", ja: "英語" },
};
