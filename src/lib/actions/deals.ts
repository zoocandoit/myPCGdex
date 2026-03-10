"use server";

import { createClient } from "@/lib/supabase/server";
import {
  CreateAcquisitionSchema,
  UpdateAcquisitionSchema,
  type Acquisition,
  type CreateAcquisitionInput,
  type UpdateAcquisitionInput,
} from "@/lib/types/trade";

export interface AcquisitionResult {
  success: boolean;
  data?: Acquisition;
  error?: string;
}

export interface AcquisitionListResult {
  success: boolean;
  data?: Acquisition[];
  count?: number;
  error?: string;
}

/**
 * Create a new acquisition (deal candidate or confirmed purchase)
 */
export async function createAcquisition(
  input: CreateAcquisitionInput
): Promise<AcquisitionResult> {
  const parsed = CreateAcquisitionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "유효하지 않은 입력값" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("acquisitions")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Acquisition };
}

/**
 * Get all acquisitions for the current user, optionally filtered by status
 */
export async function getAcquisitions(options?: {
  status?: Acquisition["status"];
  limit?: number;
  offset?: number;
}): Promise<AcquisitionListResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  let query = supabase
    .from("acquisitions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, (options.offset ?? 0) + (options.limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Acquisition[], count: count ?? 0 };
}

/**
 * Get a single acquisition by ID
 */
export async function getAcquisitionById(id: string): Promise<AcquisitionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("acquisitions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Acquisition };
}

/**
 * Update an acquisition (e.g., candidate → bought, or update price)
 */
export async function updateAcquisition(
  id: string,
  input: UpdateAcquisitionInput
): Promise<AcquisitionResult> {
  const parsed = UpdateAcquisitionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "유효하지 않은 입력값" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("acquisitions")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Acquisition };
}

/**
 * Confirm a deal candidate: set status to "bought" and link to a collection card
 */
export async function confirmAcquisition(
  id: string,
  collectionId: string
): Promise<AcquisitionResult> {
  return updateAcquisition(id, { status: "bought", collection_id: collectionId });
}

/**
 * Delete an acquisition
 */
export async function deleteAcquisition(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("acquisitions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
