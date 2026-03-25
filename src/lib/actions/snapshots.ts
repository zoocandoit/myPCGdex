"use server";

import { createClient } from "@/lib/supabase/server";
import type { PriceSnapshot, PriceSource, Currency } from "@/lib/types/trade";

export interface SnapshotListResult {
  success: boolean;
  data?: PriceSnapshot[];
  error?: string;
}

export interface SnapshotResult {
  success: boolean;
  data?: PriceSnapshot;
  error?: string;
}

/**
 * Fetch price snapshot history for a single collection card
 */
export async function getPriceSnapshots(
  collectionId: string,
  limit = 60
): Promise<SnapshotListResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const { data, error } = await supabase
    .from("price_snapshots")
    .select("*")
    .eq("collection_id", collectionId)
    .eq("user_id", user.id)
    .order("captured_at", { ascending: true })
    .limit(limit);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PriceSnapshot[] };
}

/**
 * Record a new price snapshot and update collections.market_price
 */
export async function addPriceSnapshot(
  collectionId: string,
  marketPrice: number,
  source: PriceSource = "manual",
  currency: Currency = "USD"
): Promise<SnapshotResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const { data, error } = await supabase
    .from("price_snapshots")
    .insert({
      collection_id: collectionId,
      user_id: user.id,
      market_price: marketPrice,
      source,
      currency,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Keep collections.market_price in sync with latest snapshot
  await supabase
    .from("collections")
    .update({ market_price: marketPrice, updated_at: new Date().toISOString() })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  return { success: true, data: data as PriceSnapshot };
}
