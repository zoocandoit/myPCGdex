import {
  TCGSearchResponse,
  TCGCard,
  CardSearchParams,
  CardSearchResult,
} from "./types";

const TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";

/**
 * Build search query string for Pokemon TCG API
 * Uses Lucene query syntax
 */
function buildSearchQuery(params: CardSearchParams): string {
  const { name, number, setId, query } = params;

  // If raw query is provided, use it directly
  if (query) {
    return query;
  }

  const parts: string[] = [];

  // Name search with fuzzy matching
  if (name) {
    // Use wildcard for partial matching
    const cleanName = name.trim().replace(/['"]/g, "");
    parts.push(`name:"${cleanName}*"`);
  }

  // Card number (exact match preferred)
  if (number) {
    // Normalize number: "025/165" or just "025"
    const cleanNumber = number.trim().split("/")[0].replace(/^0+/, "");
    parts.push(`number:${cleanNumber}`);
  }

  // Set ID (exact match)
  if (setId) {
    parts.push(`set.id:${setId.toLowerCase()}`);
  }

  return parts.join(" ");
}

/**
 * Search for Pokemon cards using the TCG API
 */
export async function searchCards(
  params: CardSearchParams,
  options?: { pageSize?: number; page?: number }
): Promise<CardSearchResult> {
  try {
    const query = buildSearchQuery(params);

    if (!query) {
      return { success: false, cards: [], totalCount: 0, error: "No search parameters provided" };
    }

    const searchParams = new URLSearchParams({
      q: query,
      pageSize: String(options?.pageSize || 20),
      page: String(options?.page || 1),
      orderBy: "-set.releaseDate", // Newest sets first
    });

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key if available (increases rate limit)
    const apiKey = process.env.POKEMON_TCG_API_KEY;
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }

    const response = await fetch(
      `${TCG_API_BASE_URL}/cards?${searchParams.toString()}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TCG API Error]", response.status, errorText);
      return {
        success: false,
        cards: [],
        totalCount: 0,
        error: `API error: ${response.status}`,
      };
    }

    const data: TCGSearchResponse = await response.json();

    return {
      success: true,
      cards: data.data,
      totalCount: data.totalCount,
    };
  } catch (error) {
    console.error("[TCG Search Error]", error);
    return {
      success: false,
      cards: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

/**
 * Search for exact card match using name and number
 * Tries exact match first, then falls back to broader search
 */
export async function findExactCard(
  name: string,
  number: string,
  setId?: string
): Promise<CardSearchResult> {
  // First attempt: exact match with name and number
  const exactResult = await searchCards({ name, number, setId }, { pageSize: 10 });

  if (exactResult.success && exactResult.cards.length > 0) {
    return exactResult;
  }

  // Second attempt: search by name only if number didn't match
  if (name) {
    const nameResult = await searchCards({ name }, { pageSize: 20 });
    return nameResult;
  }

  return exactResult;
}

/**
 * Get a single card by ID
 */
export async function getCardById(cardId: string): Promise<TCGCard | null> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const apiKey = process.env.POKEMON_TCG_API_KEY;
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }

    const response = await fetch(`${TCG_API_BASE_URL}/cards/${cardId}`, {
      headers,
    });

    if (!response.ok) {
      console.error("[TCG API Error]", response.status);
      return null;
    }

    const data = await response.json();
    return data.data as TCGCard;
  } catch (error) {
    console.error("[TCG GetCard Error]", error);
    return null;
  }
}

/**
 * Get card price (market price preferred)
 */
export function getCardMarketPrice(card: TCGCard): number | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  // Priority: holofoil > reverseHolofoil > normal
  const priceTypes = ["holofoil", "reverseHolofoil", "normal"] as const;

  for (const type of priceTypes) {
    const price = prices[type]?.market;
    if (price !== null && price !== undefined) {
      return price;
    }
  }

  return null;
}
