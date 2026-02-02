import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchCards, findExactCard } from "@/lib/tcg/client";
import { z } from "zod";

const SearchRequestSchema = z.object({
  name: z.string().optional(),
  number: z.string().optional(),
  setId: z.string().optional(),
  query: z.string().optional(),
});

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
    const validated = SearchRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, number, setId, query } = validated.data;

    // Ensure at least one search parameter
    if (!name && !number && !setId && !query) {
      return NextResponse.json(
        { error: "At least one search parameter is required" },
        { status: 400 }
      );
    }

    // If name and number are provided, use exact match search
    let result;
    if (name && number) {
      result = await findExactCard(name, number, setId);
    } else {
      result = await searchCards({ name, number, setId, query });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Search failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cards: result.cards,
      totalCount: result.totalCount,
    });
  } catch (error) {
    console.error("[Cards Search API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
