import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VisionRequestSchema, VisionResponseSchema } from "@/lib/types/vision";

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
    const error = await response.text();
    console.error("[OpenAI API Error]", error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  return JSON.parse(jsonStr.trim());
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
    const error = await response.text();
    console.error("[Anthropic API Error]", error);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No response from Anthropic");
  }

  // Parse JSON from response
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  return JSON.parse(jsonStr.trim());
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

    // Try OpenAI first, fall back to Anthropic
    let rawResult: unknown;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        if (process.env.OPENAI_API_KEY) {
          rawResult = await analyzeWithOpenAI(imageUrl);
        } else if (process.env.ANTHROPIC_API_KEY) {
          rawResult = await analyzeWithAnthropic(imageUrl);
        } else {
          return NextResponse.json(
            { error: "No Vision API key configured" },
            { status: 500 }
          );
        }

        // Validate response with Zod
        const result = VisionResponseSchema.safeParse(rawResult);

        if (result.success) {
          return NextResponse.json(result.data);
        }

        console.error("[Vision Response Validation Error]", result.error);
        retryCount++;
      } catch (parseError) {
        console.error("[Vision Parse Error]", parseError);
        retryCount++;
      }
    }

    return NextResponse.json(
      { error: "Failed to analyze card after multiple attempts" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[Vision API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
