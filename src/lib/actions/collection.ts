"use server";

import { createClient } from "@/lib/supabase/server";
import {
  ManualCardEntrySchema,
  VisionCardEntrySchema,
  type ManualCardEntry,
  type VisionCardEntry,
  type CollectionCard,
  type InputMethod,
} from "@/lib/types/collection";

export interface CollectionResult {
  success: boolean;
  data?: CollectionCard;
  error?: string;
}

export interface CollectionListResult {
  success: boolean;
  data?: CollectionCard[];
  count?: number;
  error?: string;
}

/**
 * Add a card to the collection via manual entry
 */
export async function addCardManual(entry: ManualCardEntry): Promise<CollectionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  // Validate input
  const validated = ManualCardEntrySchema.safeParse(entry);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      ...validated.data,
      input_method: "manual" as InputMethod,
    })
    .select()
    .single();

  if (error) {
    console.error("[addCardManual] Error:", error.message);
    return { success: false, error: "insert_failed" };
  }

  return { success: true, data: data as CollectionCard };
}

/**
 * Add a card to the collection via Vision AI (includes TCG data)
 */
export async function addCardVision(entry: VisionCardEntry): Promise<CollectionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  // Validate input
  const validated = VisionCardEntrySchema.safeParse(entry);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      ...validated.data,
      input_method: "vision" as InputMethod,
    })
    .select()
    .single();

  if (error) {
    console.error("[addCardVision] Error:", error.message);
    return { success: false, error: "insert_failed" };
  }

  return { success: true, data: data as CollectionCard };
}

/**
 * Get user's collection with optional filters
 */
export async function getCollection(options?: {
  limit?: number;
  offset?: number;
  setId?: string;
  language?: string;
}): Promise<CollectionListResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  let query = supabase
    .from("collections")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("collected_at", { ascending: false });

  if (options?.setId) {
    query = query.eq("set_id", options.setId);
  }

  if (options?.language) {
    query = query.eq("language", options.language);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[getCollection] Error:", error.message);
    return { success: false, error: "fetch_failed" };
  }

  return {
    success: true,
    data: data as CollectionCard[],
    count: count || 0,
  };
}

/**
 * Update a card in the collection
 */
export async function updateCard(
  cardId: string,
  updates: Partial<ManualCardEntry>
): Promise<CollectionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  // Note: market_price cannot be updated manually (handled by DB/API)
  const { data, error } = await supabase
    .from("collections")
    .update(updates)
    .eq("id", cardId)
    .eq("user_id", user.id) // Ensure user owns this card
    .select()
    .single();

  if (error) {
    console.error("[updateCard] Error:", error.message);
    return { success: false, error: "update_failed" };
  }

  return { success: true, data: data as CollectionCard };
}

/**
 * Delete a card from the collection
 */
export async function deleteCard(cardId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "unauthorized" };
  }

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id); // Ensure user owns this card

  if (error) {
    console.error("[deleteCard] Error:", error.message);
    return { success: false, error: "delete_failed" };
  }

  return { success: true };
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<{
  success: boolean;
  totalCards: number;
  totalValue: number;
  uniquePokemon: number;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      totalCards: 0,
      totalValue: 0,
      uniquePokemon: 0,
      error: "unauthorized",
    };
  }

  const { data, error } = await supabase
    .from("collections")
    .select("quantity, market_price, purchase_price, pokemon_name")
    .eq("user_id", user.id);

  if (error) {
    console.error("[getCollectionStats] Error:", error.message);
    return {
      success: false,
      totalCards: 0,
      totalValue: 0,
      uniquePokemon: 0,
      error: "fetch_failed",
    };
  }

  const totalCards = data.reduce((sum, card) => sum + (card.quantity || 1), 0);
  const totalValue = data.reduce((sum, card) => {
    const price = card.market_price || card.purchase_price || 0;
    return sum + price * (card.quantity || 1);
  }, 0);
  const uniquePokemon = new Set(data.map((card) => card.pokemon_name)).size;

  return {
    success: true,
    totalCards,
    totalValue,
    uniquePokemon,
  };
}
