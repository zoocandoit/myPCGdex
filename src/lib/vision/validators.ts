/**
 * Vision API security validators and helpers
 */

/**
 * Validate that an image URL is from our Supabase Storage bucket
 * This prevents abuse of the Vision API with arbitrary URLs
 */
export function validateStorageUrl(imageUrl: string): {
  valid: boolean;
  error?: string;
} {
  // Must have NEXT_PUBLIC_SUPABASE_URL configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { valid: false, error: "Supabase URL not configured" };
  }

  try {
    const url = new URL(imageUrl);

    // Must be HTTPS
    if (url.protocol !== "https:") {
      return { valid: false, error: "Image URL must use HTTPS" };
    }

    // Extract the Supabase project reference from NEXT_PUBLIC_SUPABASE_URL
    // Format: https://<project-ref>.supabase.co
    const supabaseHost = new URL(supabaseUrl).hostname;

    // Must match our Supabase hostname
    if (url.hostname !== supabaseHost) {
      return { valid: false, error: "Image URL must be from our storage" };
    }

    // Must be a signed URL from card-uploads bucket
    // Path format: /storage/v1/object/sign/card-uploads/...
    const expectedPathPrefix = "/storage/v1/object/sign/card-uploads/";
    if (!url.pathname.startsWith(expectedPathPrefix)) {
      return { valid: false, error: "Invalid storage path" };
    }

    // Must have a token query parameter (signed URL)
    if (!url.searchParams.has("token")) {
      return { valid: false, error: "Missing signed URL token" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Strip markdown code fences from a string
 * Handles ```json ... ```, ``` ... ```, and variations
 */
export function stripCodeFences(content: string): string {
  let result = content.trim();

  // Remove opening fence with language tag
  if (result.startsWith("```json")) {
    result = result.slice(7);
  } else if (result.startsWith("```")) {
    result = result.slice(3);
  }

  // Remove closing fence
  if (result.endsWith("```")) {
    result = result.slice(0, -3);
  }

  return result.trim();
}

/**
 * Safely parse JSON from Vision API response
 * Handles code fences, trailing commas, and other common issues
 */
export function safeParseVisionJson(content: string): unknown {
  // First, strip code fences
  let jsonStr = stripCodeFences(content);

  // Remove any leading/trailing whitespace
  jsonStr = jsonStr.trim();

  // Try direct parse first
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to fix common issues
  }

  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  // Try again after cleanup
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Last resort: try to extract JSON object/array
  }

  // Try to find JSON object boundaries
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // Give up
    }
  }

  throw new Error("Failed to parse JSON response");
}

/**
 * Simple validation for card_number format
 * Accepts patterns like "025/165", "25/165", "SV2a-025"
 */
export function isValidCardNumber(cardNumber: string | null | undefined): boolean {
  if (!cardNumber) return false;

  // Common patterns:
  // - "025/165" or "25/165" (number/total)
  // - "SV2a-025" or "sv2a-25" (set prefix)
  // - "025" (just number)
  const patterns = [
    /^\d{1,3}\/\d{1,3}$/,           // 025/165
    /^[A-Za-z0-9]+-\d{1,3}$/,       // SV2a-025
    /^\d{1,3}$/,                     // 025
  ];

  return patterns.some((pattern) => pattern.test(cardNumber.trim()));
}
