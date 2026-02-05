"use server";

import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 5;

export interface VisionUsageResult {
  success: boolean;
  remainingToday: number;
  usedToday: number;
  canUseVision: boolean;
  error?: string;
}

/**
 * Get the user's current Vision API usage for today
 */
export async function getVisionUsage(): Promise<VisionUsageResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      remainingToday: 0,
      usedToday: 0,
      canUseVision: false,
      error: "unauthorized",
    };
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("vision_usage")
    .select("usage_count")
    .eq("user_id", user.id)
    .eq("usage_date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (normal for first use of day)
    console.error("[getVisionUsage] Error:", error.message);
    return {
      success: false,
      remainingToday: DAILY_LIMIT,
      usedToday: 0,
      canUseVision: true,
      error: "fetch_failed",
    };
  }

  const usedToday = data?.usage_count || 0;
  const remainingToday = Math.max(0, DAILY_LIMIT - usedToday);

  return {
    success: true,
    remainingToday,
    usedToday,
    canUseVision: remainingToday > 0,
  };
}

/**
 * Check if user can use Vision API and increment usage if allowed
 * Returns false if daily limit reached
 */
export async function checkAndIncrementVisionUsage(): Promise<VisionUsageResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      remainingToday: 0,
      usedToday: 0,
      canUseVision: false,
      error: "unauthorized",
    };
  }

  const today = new Date().toISOString().split("T")[0];

  // Try to get existing usage for today
  const { data: existingUsage } = await supabase
    .from("vision_usage")
    .select("id, usage_count")
    .eq("user_id", user.id)
    .eq("usage_date", today)
    .single();

  if (existingUsage) {
    // Check if limit reached
    if (existingUsage.usage_count >= DAILY_LIMIT) {
      return {
        success: true,
        remainingToday: 0,
        usedToday: existingUsage.usage_count,
        canUseVision: false,
      };
    }

    // Increment existing usage
    const newCount = existingUsage.usage_count + 1;
    const { error: updateError } = await supabase
      .from("vision_usage")
      .update({ usage_count: newCount })
      .eq("id", existingUsage.id);

    if (updateError) {
      console.error("[checkAndIncrementVisionUsage] Update error:", updateError.message);
      return {
        success: false,
        remainingToday: DAILY_LIMIT - existingUsage.usage_count,
        usedToday: existingUsage.usage_count,
        canUseVision: true,
        error: "update_failed",
      };
    }

    return {
      success: true,
      remainingToday: Math.max(0, DAILY_LIMIT - newCount),
      usedToday: newCount,
      canUseVision: newCount < DAILY_LIMIT,
    };
  }

  // First use of the day - insert new record
  const { error: insertError } = await supabase.from("vision_usage").insert({
    user_id: user.id,
    usage_date: today,
    usage_count: 1,
  });

  if (insertError) {
    console.error("[checkAndIncrementVisionUsage] Insert error:", insertError.message);
    return {
      success: false,
      remainingToday: DAILY_LIMIT,
      usedToday: 0,
      canUseVision: true,
      error: "insert_failed",
    };
  }

  return {
    success: true,
    remainingToday: DAILY_LIMIT - 1,
    usedToday: 1,
    canUseVision: true,
  };
}
