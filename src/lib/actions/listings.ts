"use server";

import { createClient } from "@/lib/supabase/server";
import {
  CreateListingSchema,
  UpdateListingSchema,
  type Listing,
  type CreateListingInput,
  type UpdateListingInput,
} from "@/lib/types/trade";

export interface ListingResult {
  success: boolean;
  data?: Listing;
  error?: string;
}

export interface ListingListResult {
  success: boolean;
  data?: Listing[];
  count?: number;
  error?: string;
}

/**
 * Create a new listing for a card
 */
export async function createListing(input: CreateListingInput): Promise<ListingResult> {
  const parsed = CreateListingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "유효하지 않은 입력값" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("listings")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Listing };
}

/**
 * Get all listings for the current user
 */
export async function getListings(options?: {
  status?: Listing["status"];
  platform?: Listing["platform"];
  limit?: number;
  offset?: number;
}): Promise<ListingListResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  let query = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);
  if (options?.platform) query = query.eq("platform", options.platform);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, (options.offset ?? 0) + (options.limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Listing[], count: count ?? 0 };
}

/**
 * Get a single listing by ID
 */
export async function getListingById(id: string): Promise<ListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Listing };
}

/**
 * Update a listing
 */
export async function updateListing(
  id: string,
  input: UpdateListingInput
): Promise<ListingResult> {
  const parsed = UpdateListingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "유효하지 않은 입력값" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("listings")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Listing };
}

/**
 * Mark a listing as sold (status → sold, ended_at set to now)
 */
export async function markListingAsSold(id: string): Promise<ListingResult> {
  return updateListing(id, { status: "sold", ended_at: new Date().toISOString() });
}

/**
 * Delete a listing (only allowed if status is draft or canceled)
 */
export async function deleteListing(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
