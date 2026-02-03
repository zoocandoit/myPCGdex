import { z } from "zod";

/**
 * Server-side environment variables schema
 * These are validated at runtime when imported
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  // Optional server-only keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  POKEMON_TCG_API_KEY: z.string().optional(),
});

/**
 * Client-side environment variables (NEXT_PUBLIC_ prefix)
 * Exported for potential client-side validation
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

function validateEnv() {
  // Only validate on server side
  if (typeof window !== "undefined") {
    return;
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(", ")}`)
      .join("\n");

    // In development, throw a clear error
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        `\n\nEnvironment validation failed:\n${errorMessages}\n\nPlease check your .env.local file.\n`
      );
    }

    // In production, log error but don't crash build
    // The actual API calls will fail with appropriate errors
    console.error("[ENV] Validation failed:", errorMessages);
  }
}

// Run validation on module import (server-side only)
validateEnv();

/**
 * Type-safe access to server environment variables
 * Use this instead of process.env directly for better type safety
 */
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
  },
  pokemon: {
    tcgApiKey: process.env.POKEMON_TCG_API_KEY,
  },
} as const;
