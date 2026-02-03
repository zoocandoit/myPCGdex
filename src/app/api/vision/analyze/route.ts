import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VisionRequestSchema, VisionResponseSchema } from "@/lib/types/vision";
import {
  validateStorageUrl,
  safeParseVisionJson,
} from "@/lib/vision/validators";

const VISION_PROMPT = `You are a Pokemon card analyzer. Analyze this Pokemon card image and extract the following information.

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. For card_number, look at the BOTTOM of the card for numbers like "025/165" or "SV2a 025/165"
3. The card_number format should be exactly as shown on the card (e.g., "025/165")
4. For set_id, look for set symbols or codes (e.g., "SV2a", "sv4", "VSTAR Universe")
5. Detect the language from the card text (en=English, ja=Japanese, ko=Korean, zh=Chinese, other=other languages)

Required JSON format:
{
  "pokemon_name": "string (Pokemon name as shown on card)",
  "card_number": "string (e.g., '025/165')",
  "set_id": "string or null (set code if visible)",
  "language": "en" | "ja" | "ko" | "zh" | "other"
}

Analyze the card and return ONLY the JSON object, nothing else.`;

interface AnalysisLog {
  provider: "openai" | "anthropic";
  attempt: number;
  success: boolean;
  latencyMs: number;
  error?: string;
}

function logAnalysis(log: AnalysisLog): void {
  const level = log.success ? "info" : "warn";
  console[level](
    `[Vision API] provider=${log.provider} attempt=${log.attempt} success=${log.success} latency=${log.latencyMs}ms${log.error ? ` error="${log.error}"` : ""}`
  );
}

async function analyzeWithOpenAI(imageUrl: string): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    // Log error for debugging but don't expose to client
    const errorBody = await response.text();
    console.error("[OpenAI Error Body]", errorBody);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  // Parse JSON from response (handles code fences and edge cases)
  return safeParseVisionJson(content);
}

async function analyzeWithAnthropic(imageUrl: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  // Fetch image and convert to base64
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image");
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType,
                data: base64Image,
              },
            },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    // Log error for debugging but don't expose to client
    const errorBody = await response.text();
    console.error("[Anthropic Error Body]", errorBody);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No response from Anthropic");
  }

  // Parse JSON from response
  return safeParseVisionJson(content);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[Vision API] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = VisionRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { imageUrl } = validated.data;

    // SECURITY: Validate that the URL is from our Supabase Storage bucket
    const urlValidation = validateStorageUrl(imageUrl);
    if (!urlValidation.valid) {
      console.warn(
        `[Vision API] Invalid URL rejected: ${urlValidation.error}`
      );
      return NextResponse.json(
        { error: urlValidation.error || "Invalid image URL" },
        { status: 400 }
      );
    }

    // Determine which provider to use
    const useOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const useAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

    if (!useOpenAI && !useAnthropic) {
      return NextResponse.json(
        { error: "No Vision API key configured" },
        { status: 500 }
      );
    }

    const provider = useOpenAI ? "openai" : "anthropic";
    const analyzeFn = useOpenAI ? analyzeWithOpenAI : analyzeWithAnthropic;

    // Retry logic
    let rawResult: unknown;
    let lastError: string | undefined;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const attemptStart = Date.now();

      try {
        rawResult = await analyzeFn(imageUrl);

        // Validate response with Zod
        const result = VisionResponseSchema.safeParse(rawResult);

        if (result.success) {
          logAnalysis({
            provider,
            attempt,
            success: true,
            latencyMs: Date.now() - attemptStart,
          });

          console.info(
            `[Vision API] Success: totalLatency=${Date.now() - startTime}ms`
          );
          return NextResponse.json(result.data);
        }

        lastError = "Response validation failed";
        logAnalysis({
          provider,
          attempt,
          success: false,
          latencyMs: Date.now() - attemptStart,
          error: lastError,
        });
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Unknown error";
        logAnalysis({
          provider,
          attempt,
          success: false,
          latencyMs: Date.now() - attemptStart,
          error: lastError,
        });
      }
    }

    console.error(
      `[Vision API] Failed after ${maxRetries + 1} attempts: ${lastError}`
    );
    return NextResponse.json(
      { error: "Failed to analyze card after multiple attempts" },
      { status: 500 }
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`[Vision API] Error: latency=${latencyMs}ms`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
