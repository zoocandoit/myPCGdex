import { z } from "zod";

// ─── Acquisition (Deal / 매입) ────────────────────────────────────────────────

export const AcquisitionStatus = {
  CANDIDATE: "candidate",
  BOUGHT: "bought",
  CANCELED: "canceled",
} as const;
export type AcquisitionStatus = (typeof AcquisitionStatus)[keyof typeof AcquisitionStatus];

export const SourcePlatform = {
  DANGGEUN: "danggeun",
  BUNJANG: "bunjang",
  OFFLINE: "offline",
  FRIEND: "friend",
  EBAY: "ebay",
  OTHER: "other",
} as const;
export type SourcePlatform = (typeof SourcePlatform)[keyof typeof SourcePlatform];

export interface Acquisition {
  id: string;
  user_id: string;
  collection_id: string | null;
  card_name: string | null;
  status: AcquisitionStatus;
  source_platform: SourcePlatform | null;
  source_url: string | null;
  asking_price: number | null;
  negotiated_price: number | null;
  fees_cost: number;
  notes: string | null;
  screenshot_path: string | null;
  created_at: string;
  updated_at: string;
}

export const CreateAcquisitionSchema = z.object({
  collection_id: z.string().uuid().optional(),
  card_name: z.string().optional(),
  status: z.enum(["candidate", "bought", "canceled"]).default("candidate"),
  source_platform: z
    .enum(["danggeun", "bunjang", "offline", "friend", "ebay", "other"])
    .optional(),
  source_url: z.string().url("올바른 URL을 입력하세요").optional().or(z.literal("")),
  asking_price: z.number().min(0).optional(),
  negotiated_price: z.number().min(0).optional(),
  fees_cost: z.number().min(0).default(0),
  notes: z.string().optional(),
  screenshot_path: z.string().optional(),
});
export type CreateAcquisitionInput = z.infer<typeof CreateAcquisitionSchema>;

export const UpdateAcquisitionSchema = CreateAcquisitionSchema.partial();
export type UpdateAcquisitionInput = z.infer<typeof UpdateAcquisitionSchema>;

// ─── Listing (판매 리스팅) ──────────────────────────────────────────────────────

export const ListingStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  ENDED: "ended",
  SOLD: "sold",
  CANCELED: "canceled",
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const ListingPlatform = {
  EBAY: "ebay",
  BUNJANG: "bunjang",
  DANGGEUN: "danggeun",
  OTHER: "other",
} as const;
export type ListingPlatform = (typeof ListingPlatform)[keyof typeof ListingPlatform];

export const Currency = {
  KRW: "KRW",
  USD: "USD",
  JPY: "JPY",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export interface Listing {
  id: string;
  user_id: string;
  collection_id: string;
  status: ListingStatus;
  platform: ListingPlatform;
  listing_url: string | null;
  title: string | null;
  listed_price: number;
  currency: Currency;
  quantity: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CreateListingSchema = z.object({
  collection_id: z.string().uuid("카드를 선택하세요"),
  status: z.enum(["draft", "active", "ended", "sold", "canceled"]).default("draft"),
  platform: z.enum(["ebay", "bunjang", "danggeun", "other"]),
  listing_url: z.string().url("올바른 URL을 입력하세요").optional().or(z.literal("")),
  title: z.string().optional(),
  listed_price: z.number().min(0, "가격을 입력하세요"),
  currency: z.enum(["KRW", "USD", "JPY"]).default("KRW"),
  quantity: z.number().int().min(1).default(1),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
});
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = CreateListingSchema.partial();
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

// ─── Sale (판매 정산) ──────────────────────────────────────────────────────────

export const BuyerRegion = {
  DOMESTIC: "domestic",
  US: "us",
  JP: "jp",
  EU: "eu",
  OTHER: "other",
} as const;
export type BuyerRegion = (typeof BuyerRegion)[keyof typeof BuyerRegion];

export interface Sale {
  id: string;
  user_id: string;
  listing_id: string;
  sold_price: number;
  shipping_charged: number;
  shipping_cost: number;
  platform_fee: number;
  payment_fee: number;
  international_fee: number;
  tax_withheld: number;
  net_payout: number | null;
  sold_at: string;
  buyer_region: BuyerRegion | null;
  created_at: string;
}

export const CreateSaleSchema = z.object({
  listing_id: z.string().uuid("리스팅을 선택하세요"),
  sold_price: z.number().min(0, "판매가를 입력하세요"),
  shipping_charged: z.number().min(0).default(0),
  shipping_cost: z.number().min(0).default(0),
  platform_fee: z.number().min(0).default(0),
  payment_fee: z.number().min(0).default(0),
  international_fee: z.number().min(0).default(0),
  tax_withheld: z.number().min(0).default(0),
  sold_at: z.string().datetime().optional(),
  buyer_region: z.enum(["domestic", "us", "jp", "eu", "other"]).optional(),
});
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

// ─── FeeRule (수수료 룰) ────────────────────────────────────────────────────────

export const FeeRuleType = {
  FINAL_VALUE: "final_value",
  FINAL_VALUE_OVERAGE: "final_value_overage",
  PAYMENT: "payment",
  INTERNATIONAL: "international",
  FIXED: "fixed",
} as const;
export type FeeRuleType = (typeof FeeRuleType)[keyof typeof FeeRuleType];

export interface FeeRule {
  id: string;
  platform: string;
  category: string;
  rule_type: FeeRuleType;
  rate: number;
  fixed_amount: number;
  currency: string;
  valid_from: string;
  valid_to: string | null;
  threshold_amount: number | null;
  notes: string | null;
  created_at: string;
}

// ─── PriceSnapshot (시세 스냅샷) ────────────────────────────────────────────────

export type PriceSource = "tcg_api" | "ebay_comps" | "manual";

export interface PriceSnapshot {
  id: string;
  collection_id: string;
  user_id: string;
  market_price: number;
  currency: Currency;
  source: PriceSource;
  captured_at: string;
}

// ─── PnL Calculation Types ────────────────────────────────────────────────────

export interface CostBasis {
  purchase_price: number;
  fees_cost: number;
  total: number;
}

export interface RealizedPnL {
  gross_revenue: number;
  total_fees: number;
  net_payout: number;
  cost_basis: number;
  realized_pnl: number;
  margin_pct: number | null;
}

export interface UnrealizedPnL {
  market_price: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number | null;
}

// ─── Platform display labels ──────────────────────────────────────────────────

export const SOURCE_PLATFORM_LABELS: Record<SourcePlatform, { ko: string; en: string }> = {
  danggeun: { ko: "당근마켓", en: "Danggeun" },
  bunjang: { ko: "번개장터", en: "Bunjang" },
  offline: { ko: "오프라인", en: "Offline" },
  friend: { ko: "지인거래", en: "Friend" },
  ebay: { ko: "eBay", en: "eBay" },
  other: { ko: "기타", en: "Other" },
};

export const LISTING_PLATFORM_LABELS: Record<ListingPlatform, { ko: string; en: string }> = {
  ebay: { ko: "eBay", en: "eBay" },
  bunjang: { ko: "번개장터", en: "Bunjang" },
  danggeun: { ko: "당근마켓", en: "Danggeun" },
  other: { ko: "기타", en: "Other" },
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, { ko: string; en: string }> = {
  draft: { ko: "초안", en: "Draft" },
  active: { ko: "활성", en: "Active" },
  ended: { ko: "종료", en: "Ended" },
  sold: { ko: "판매완료", en: "Sold" },
  canceled: { ko: "취소", en: "Canceled" },
};

export const ACQUISITION_STATUS_LABELS: Record<AcquisitionStatus, { ko: string; en: string }> = {
  candidate: { ko: "매입 후보", en: "Candidate" },
  bought: { ko: "매입 확정", en: "Bought" },
  canceled: { ko: "취소", en: "Canceled" },
};

export const BUYER_REGION_LABELS: Record<BuyerRegion, { ko: string; en: string }> = {
  domestic: { ko: "국내", en: "Domestic" },
  us: { ko: "미국", en: "US" },
  jp: { ko: "일본", en: "Japan" },
  eu: { ko: "유럽", en: "Europe" },
  other: { ko: "기타", en: "Other" },
};
