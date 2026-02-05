"use server";

import { createClient } from "@/lib/supabase/server";
import type { PendingCard, PendingCardInsert, PendingCardStatus } from "@/lib/types/pending";

export interface PendingResult {
  success: boolean;
  data?: PendingCard;
  error?: string;
}

export interface PendingListResult {
  success: boolean;
  data?: PendingCard[];
  count?: number;
  error?: string;
}

/**
 * Add a card to the pending queue
 */
export async function addToPendingQueue(
  entry: PendingCardInsert
): Promise<PendingResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  const { data, error } = await supabase
    .from("pending_cards")
    .insert({
      user_id: user.id,
      front_image_path: entry.front_image_path,
      back_image_path: entry.back_image_path || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[addToPendingQueue] Error:", error.message);
    return { success: false, error: "insert_failed" };
  }

  return { success: true, data: data as PendingCard };
}

/**
 * Get user's pending cards list
 */
export async function getPendingCards(): Promise<PendingListResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  const { data, error, count } = await supabase
    .from("pending_cards")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("queued_at", { ascending: true });

  if (error) {
    console.error("[getPendingCards] Error:", error.message);
    return { success: false, error: "fetch_failed" };
  }

  return {
    success: true,
    data: data as PendingCard[],
    count: count || 0,
  };
}

/**
 * Get count of pending cards
 */
export async function getPendingCount(): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, count: 0, error: "unauthorized" };
  }

  const { count, error } = await supabase
    .from("pending_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    console.error("[getPendingCount] Error:", error.message);
    return { success: false, count: 0, error: "fetch_failed" };
  }

  return { success: true, count: count || 0 };
}

/**
 * Get a single pending card by ID
 */
export async function getPendingCard(cardId: string): Promise<PendingResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  const { data, error } = await supabase
    .from("pending_cards")
    .select("*")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("[getPendingCard] Error:", error.message);
    return { success: false, error: "fetch_failed" };
  }

  return { success: true, data: data as PendingCard };
}

/**
 * Update pending card status
 */
export async function updatePendingStatus(
  cardId: string,
  status: PendingCardStatus,
  lastError?: string
): Promise<PendingResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "failed" && lastError) {
    updateData.last_error = lastError;
    // Increment retry_count when failed
    const { data: current } = await supabase
      .from("pending_cards")
      .select("retry_count")
      .eq("id", cardId)
      .eq("user_id", user.id)
      .single();

    updateData.retry_count = (current?.retry_count || 0) + 1;
  }

  const { data, error } = await supabase
    .from("pending_cards")
    .update(updateData)
    .eq("id", cardId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[updatePendingStatus] Error:", error.message);
    return { success: false, error: "update_failed" };
  }

  return { success: true, data: data as PendingCard };
}

/**
 * Delete a pending card
 */
export async function deletePendingCard(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  const { error } = await supabase
    .from("pending_cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deletePendingCard] Error:", error.message);
    return { success: false, error: "delete_failed" };
  }

  return { success: true };
}
