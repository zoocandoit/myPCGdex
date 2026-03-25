"use server";

import { createClient } from "@/lib/supabase/server";
import {
  CreateSaleSchema,
  type Sale,
  type CreateSaleInput,
  type FeeRule,
} from "@/lib/types/trade";
import { calculateNetPayout } from "@/lib/utils/pnl";

export interface SaleResult {
  success: boolean;
  data?: Sale;
  error?: string;
}

export interface SaleListResult {
  success: boolean;
  data?: Sale[];
  count?: number;
  error?: string;
}

export interface PnLSummary {
  total_gross_revenue: number;
  total_fees: number;
  total_net_payout: number;
  total_cost_basis: number;
  total_purchase_price: number;
  total_acquisition_fees: number;
  realized_pnl: number;
  margin_pct: number | null;
  sale_count: number;
}

/**
 * Record a completed sale with net payout auto-calculation
 */
export async function createSale(input: CreateSaleInput): Promise<SaleResult> {
  const parsed = CreateSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력값" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const d = parsed.data;
  const net_payout = calculateNetPayout({
    sold_price: d.sold_price,
    shipping_charged: d.shipping_charged,
    shipping_cost: d.shipping_cost,
    platform_fee: d.platform_fee,
    payment_fee: d.payment_fee,
    international_fee: d.international_fee,
    tax_withheld: d.tax_withheld,
  });

  const { data, error } = await supabase
    .from("sales")
    .insert({ ...d, user_id: user.id, net_payout })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Mark the linked listing as sold
  const { data: soldListing } = await supabase
    .from("listings")
    .update({ status: "sold", ended_at: new Date().toISOString() })
    .eq("id", d.listing_id)
    .eq("user_id", user.id)
    .select("collection_id, quantity")
    .single();

  // Decrement collection quantity by the listing's quantity
  if (soldListing?.collection_id) {
    const { data: collCard } = await supabase
      .from("collections")
      .select("quantity")
      .eq("id", soldListing.collection_id)
      .eq("user_id", user.id)
      .single();

    if (collCard && collCard.quantity > 0) {
      const newQty = Math.max(0, collCard.quantity - (soldListing.quantity ?? 1));
      await supabase
        .from("collections")
        .update({ quantity: newQty })
        .eq("id", soldListing.collection_id)
        .eq("user_id", user.id);
    }
  }

  return { success: true, data: data as Sale };
}

/**
 * Get all sales for the current user
 */
export async function getSales(options?: {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): Promise<SaleListResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  let query = supabase
    .from("sales")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("sold_at", { ascending: false });

  if (options?.from) query = query.gte("sold_at", options.from);
  if (options?.to) query = query.lte("sold_at", options.to);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, (options.offset ?? 0) + (options.limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Sale[], count: count ?? 0 };
}

/**
 * Get aggregated PnL summary for the current user
 * Optionally filtered by date range (ISO strings)
 */
export async function getPnLSummary(options?: {
  from?: string;
  to?: string;
}): Promise<{ success: boolean; data?: PnLSummary; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  let query = supabase
    .from("sales")
    .select(
      "sold_price, shipping_charged, shipping_cost, platform_fee, payment_fee, international_fee, tax_withheld, net_payout, listing_id"
    )
    .eq("user_id", user.id);

  if (options?.from) query = query.gte("sold_at", options.from);
  if (options?.to) query = query.lte("sold_at", options.to);

  const { data: salesData, error: salesError } = await query;
  if (salesError) return { success: false, error: salesError.message };

  if (!salesData || salesData.length === 0) {
    return {
      success: true,
      data: {
        total_gross_revenue: 0,
        total_fees: 0,
        total_net_payout: 0,
        total_cost_basis: 0,
        realized_pnl: 0,
        sale_count: 0,
      },
    };
  }

  // Aggregate fees and revenue
  let total_gross_revenue = 0;
  let total_fees = 0;
  let total_net_payout = 0;

  for (const s of salesData) {
    total_gross_revenue += (s.sold_price ?? 0) + (s.shipping_charged ?? 0);
    total_fees +=
      (s.platform_fee ?? 0) +
      (s.payment_fee ?? 0) +
      (s.international_fee ?? 0) +
      (s.tax_withheld ?? 0) +
      (s.shipping_cost ?? 0);
    total_net_payout += s.net_payout ?? 0;
  }

  // Fetch cost basis: sale → listing → collection → acquisition fees
  const listingIds = salesData.map((s) => s.listing_id);
  const { data: listingsData } = await supabase
    .from("listings")
    .select("id, collection_id, quantity")
    .in("id", listingIds)
    .eq("user_id", user.id);

  const listingMap = new Map(
    (listingsData ?? []).map((l) => [l.id, l])
  );

  const collectionIds = (listingsData ?? [])
    .map((l) => l.collection_id)
    .filter(Boolean) as string[];

  let total_purchase_price = 0;
  let total_acquisition_fees = 0;

  if (collectionIds.length > 0) {
    // Fetch collection purchase prices
    const { data: cardsData } = await supabase
      .from("collections")
      .select("id, purchase_price")
      .in("id", collectionIds)
      .eq("user_id", user.id);

    // Fetch linked acquisition fees (lot-level incidental costs)
    const { data: acquisitionsData } = await supabase
      .from("acquisitions")
      .select("collection_id, fees_cost")
      .in("collection_id", collectionIds)
      .eq("user_id", user.id)
      .eq("status", "bought");

    const cardMap = new Map((cardsData ?? []).map((c) => [c.id, c]));
    const acqFeeMap = new Map<string, number>();
    for (const acq of acquisitionsData ?? []) {
      // Sum fees if multiple acquisitions for same card
      acqFeeMap.set(acq.collection_id, (acqFeeMap.get(acq.collection_id) ?? 0) + (acq.fees_cost ?? 0));
    }

    // For each sale, allocate cost proportional to listing quantity
    for (const sale of salesData) {
      const listing = listingMap.get(sale.listing_id);
      if (!listing) continue;
      const collId = listing.collection_id;
      const listingQty = listing.quantity ?? 1;

      const card = cardMap.get(collId);
      const rawPurchase = card?.purchase_price ?? 0;
      const rawFees = acqFeeMap.get(collId) ?? 0;

      // Allocate cost per unit sold (partial sale support)
      const unitPurchase = rawPurchase / Math.max(listingQty, 1);
      const unitFees = rawFees / Math.max(listingQty, 1);

      total_purchase_price += unitPurchase;
      total_acquisition_fees += unitFees;
    }
  }

  const total_cost_basis = total_purchase_price + total_acquisition_fees;
  const realized_pnl = total_net_payout - total_cost_basis;
  const margin_pct =
    total_cost_basis > 0 ? Math.round((realized_pnl / total_cost_basis) * 10000) / 100 : null;

  return {
    success: true,
    data: {
      total_gross_revenue,
      total_fees,
      total_net_payout,
      total_cost_basis,
      total_purchase_price,
      total_acquisition_fees,
      realized_pnl,
      margin_pct,
      sale_count: salesData.length,
    },
  };
}

/**
 * Fetch active eBay fee rules from the database
 */
export async function getEbayFeeRules(): Promise<{
  success: boolean;
  data?: FeeRule[];
  error?: string;
}> {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("fee_rules")
    .select("*")
    .eq("platform", "ebay")
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gte.${today}`);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as FeeRule[] };
}
