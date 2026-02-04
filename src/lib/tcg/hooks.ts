"use client";

import { useQuery } from "@tanstack/react-query";
import { TCGCard, CardSearchResult } from "./types";
import { VisionResponse } from "@/lib/types/vision";
import { getCardMarketPrice } from "./client";
import {
  normalizeCardNumber,
  calculateAccuracyScore,
  NormalizedCardNumber,
} from "./normalize";

interface SearchCardsParams {
  name?: string;
  number?: string;
  setId?: string;
}

/**
 * Extended search result with accuracy scores
 */
export interface ScoredCardSearchResult extends CardSearchResult {
  /** Cards sorted by accuracy score */
  scoredCards: ScoredCard[];
}

export interface ScoredCard extends TCGCard {
  /** Accuracy score for this result */
  accuracyScore: number;
  /** Score breakdown for debugging/display */
  scoreBreakdown: {
    numberMatch: number;
    nameMatch: number;
    setMatch: number;
    languageBonus: number;
    priceBonus: number;
    recencyBonus: number;
  };
}

/**
 * Fetch cards from the search API with AbortController support
 */
async function fetchCards(
  params: SearchCardsParams,
  signal?: AbortSignal
): Promise<CardSearchResult> {
  const response = await fetch("/api/cards/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();
    return {
      success: false,
      cards: [],
      totalCount: 0,
      error: errorData.error || "Search failed",
    };
  }

  const data = await response.json();
  return {
    success: true,
    cards: data.cards || [],
    totalCount: data.totalCount || 0,
  };
}

/**
 * Score and sort cards by accuracy
 */
function scoreAndSortCards(
  cards: TCGCard[],
  queryNumber: NormalizedCardNumber,
  queryName: string,
  querySetId?: string
): ScoredCard[] {
  const scoredCards: ScoredCard[] = cards.map((card) => {
    const result = calculateAccuracyScore({
      cardNumber: card.number,
      cardName: card.name,
      cardSetId: card.set.id,
      cardReleaseDate: card.set.releaseDate,
      hasMarketPrice: getCardMarketPrice(card) !== null,
      queryNumber,
      queryName,
      querySetId,
    });

    return {
      ...card,
      accuracyScore: result.score,
      scoreBreakdown: result.breakdown,
    };
  });

  // Sort by accuracy score (descending), then by release date (newest first)
  return scoredCards.sort((a, b) => {
    if (b.accuracyScore !== a.accuracyScore) {
      return b.accuracyScore - a.accuracyScore;
    }
    // Secondary sort by release date
    return b.set.releaseDate.localeCompare(a.set.releaseDate);
  });
}

/**
 * Build search key for query caching
 */
function buildSearchKey(params: SearchCardsParams): string[] {
  return [
    "tcg-cards",
    params.name || "",
    params.number || "",
    params.setId || "",
  ];
}

/**
 * Hook to search cards with TanStack Query
 * Automatically caches results and handles loading/error states
 */
export function useSearchCards(
  params: SearchCardsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: buildSearchKey(params),
    queryFn: ({ signal }) => fetchCards(params, signal),
    enabled: options?.enabled ?? (!!params.name || !!params.number),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to search cards based on Vision API result
 *
 * Search Strategy (priority order):
 * 1. card_number + set_id (most specific, highest accuracy)
 * 2. card_number + pokemon_name (common case)
 * 3. card_number only (broad search)
 * 4. pokemon_name only (fallback)
 *
 * Results are scored and sorted by accuracy:
 * - Exact number match: +50 points
 * - Number contains query: +30 points
 * - Name exact match: +30 points
 * - Name contains query: +15 points
 * - Set ID match: +25 points
 * - Has market price: +3 points
 * - Recent release: +2 points
 */
export function useSearchFromVision(
  visionResult: VisionResponse | null,
  options?: { enabled?: boolean }
) {
  // Create a stable query key based on vision result
  const queryKey = [
    "tcg-vision-search",
    visionResult?.pokemon_name || "",
    visionResult?.card_number || "",
    visionResult?.set_id || "",
    visionResult?.language || "",
  ];

  return useQuery<ScoredCardSearchResult>({
    queryKey,
    queryFn: async ({ signal }): Promise<ScoredCardSearchResult> => {
      if (!visionResult) {
        return {
          success: false,
          cards: [],
          scoredCards: [],
          totalCount: 0,
          error: "No vision result",
        };
      }

      const { pokemon_name, card_number, set_id } = visionResult;

      // Normalize the card number for consistent matching
      const normalizedNumber = normalizeCardNumber(card_number || "");

      /**
       * Search Strategy Execution
       * Try strategies in order, return first successful result
       * All results are scored and sorted for consistency
       */

      // Strategy 1: card_number + set_id (most specific)
      if (card_number && set_id) {
        const result = await fetchCards(
          { number: normalizedNumber.number, setId: set_id },
          signal
        );
        if (result.success && result.cards.length > 0) {
          const scoredCards = scoreAndSortCards(
            result.cards,
            normalizedNumber,
            pokemon_name,
            set_id
          );
          return { ...result, scoredCards };
        }
      }

      // Strategy 2: card_number + pokemon_name
      if (card_number && pokemon_name) {
        const result = await fetchCards(
          { name: pokemon_name, number: normalizedNumber.number },
          signal
        );
        if (result.success && result.cards.length > 0) {
          const scoredCards = scoreAndSortCards(
            result.cards,
            normalizedNumber,
            pokemon_name,
            set_id
          );
          return { ...result, scoredCards };
        }
      }

      // Strategy 3: card_number only (broad search)
      if (card_number) {
        const result = await fetchCards(
          { number: normalizedNumber.number },
          signal
        );
        if (result.success && result.cards.length > 0) {
          const scoredCards = scoreAndSortCards(
            result.cards,
            normalizedNumber,
            pokemon_name,
            set_id
          );
          return { ...result, scoredCards };
        }
      }

      // Strategy 4: pokemon_name only (fallback)
      if (pokemon_name) {
        const result = await fetchCards({ name: pokemon_name }, signal);
        const scoredCards = scoreAndSortCards(
          result.cards,
          normalizedNumber,
          pokemon_name,
          set_id
        );
        return { ...result, scoredCards };
      }

      return {
        success: false,
        cards: [],
        scoredCards: [],
        totalCount: 0,
        error: "No search criteria",
      };
    },
    enabled: options?.enabled ?? !!visionResult,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Retry policy for API issues (rate limiting, network errors)
    retry: (failureCount, error) => {
      // Don't retry on abort
      if (error instanceof Error && error.name === "AbortError") {
        return false;
      }
      // Retry up to 3 times with exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
    },
  });
}

/**
 * Get the best match from search results
 * Returns the highest scoring card, or null if no cards found
 */
export function getBestMatch(scoredCards: ScoredCard[]): ScoredCard | null {
  if (scoredCards.length === 0) return null;
  return scoredCards[0]; // Already sorted by score
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "N/A";
  return `$${price.toFixed(2)}`;
}

/**
 * Filter cards by set ID
 */
export function filterBySet(cards: ScoredCard[], setId: string): ScoredCard[] {
  if (!setId) return cards;
  return cards.filter((card) => card.set.id === setId);
}

/**
 * Filter cards by rarity
 */
export function filterByRarity(cards: ScoredCard[], rarity: string): ScoredCard[] {
  if (!rarity) return cards;
  return cards.filter((card) => card.rarity === rarity);
}

/**
 * Paginate cards array
 */
export function paginateCards<T>(
  cards: T[],
  page: number,
  pageSize: number = 12
): { items: T[]; hasMore: boolean; totalPages: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = cards.slice(start, end);
  const totalPages = Math.ceil(cards.length / pageSize);

  return {
    items,
    hasMore: end < cards.length,
    totalPages,
  };
}
