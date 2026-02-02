"use server";

import { createClient } from "@/lib/supabase/server";
import { UploadResult } from "@/lib/types/vision";

const BUCKET_NAME = "card-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadCardImage(
  base64Data: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return { success: false, error: "Invalid file type" };
    }

    // Convert base64 to buffer
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return { success: false, error: "File too large (max 10MB)" };
    }

    // Generate unique filename
    const extension = mimeType.split("/")[1] || "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const path = `${user.id}/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Storage Upload Error]", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Generate signed URL for Vision API (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600);

    if (signedUrlError) {
      console.error("[Signed URL Error]", signedUrlError);
      return { success: false, error: "Failed to generate signed URL" };
    }

    return {
      success: true,
      path,
      signedUrl: signedUrlData.signedUrl,
    };
  } catch (error) {
    console.error("[Storage Action Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

export async function deleteCardImage(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the path belongs to the user
    if (!path.startsWith(`${user.id}/`)) {
      return { success: false, error: "Access denied" };
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error("[Storage Delete Error]", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Storage Delete Action Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
