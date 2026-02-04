/**
 * Card Number Normalization Utilities
 * Handles various input formats and provides accuracy scoring for search results
 */

/**
 * Normalized card number result
 */
export interface NormalizedCardNumber {
  /** The number part without leading zeros (e.g., "25" from "025/165") */
  number: string;
  /** The total part if present (e.g., "165" from "025/165") */
  total: string | null;
  /** Full normalized format (e.g., "25/165" or "25") */
  full: string;
  /** Original input for reference */
  original: string;
  /** Whether the input had a total part */
  hasTotal: boolean;
}

/**
 * Normalize a card number input to a consistent format
 *
 * Input examples:
 * - "025/165" → { number: "25", total: "165", full: "25/165" }
 * - "25/165"  → { number: "25", total: "165", full: "25/165" }
 * - "025"     → { number: "25", total: null, full: "25" }
 * - "25"      → { number: "25", total: null, full: "25" }
 * - "TG05/TG30" → { number: "TG05", total: "TG30", full: "TG05/TG30" }
 * - "SV001"   → { number: "SV001", total: null, full: "SV001" }
 *
 * @param input The card number string to normalize
 * @returns NormalizedCardNumber object
 */
export function normalizeCardNumber(input: string): NormalizedCardNumber {
  const original = input.trim();

  if (!original) {
    return {
      number: "",
      total: null,
      full: "",
      original: "",
      hasTotal: false,
    };
  }

  // Check for format with total (e.g., "025/165", "TG05/TG30")
  const slashParts = original.split("/");
  if (slashParts.length === 2) {
    const numberPart = slashParts[0];
    const totalPart = slashParts[1];

    // Check if it's a pure number or alphanumeric
    const pureNumMatch = numberPart.match(/^0*(\d+)$/);

    // For pure numbers (e.g., "025"), strip leading zeros
    // For alphanumeric (e.g., "TG05"), preserve as-is
    const normalizedNum = pureNumMatch
      ? pureNumMatch[1]
      : numberPart;

    return {
      number: normalizedNum,
      total: totalPart,
      full: `${normalizedNum}/${totalPart}`,
      original,
      hasTotal: true,
    };
  }

  // Simple format without total (e.g., "025", "SV001")
  // For pure numbers, strip leading zeros; for alphanumeric, keep as-is
  const pureNumberMatch = original.match(/^0*(\d+)$/);

  if (pureNumberMatch) {
    const normalizedNum = pureNumberMatch[1];
    return {
      number: normalizedNum,
      total: null,
      full: normalizedNum,
      original,
      hasTotal: false,
    };
  }

  // Alphanumeric format (e.g., "TG05", "SV001") - keep as-is
  return {
    number: original,
    total: null,
    full: original,
    original,
    hasTotal: false,
  };
}

/**
 * Accuracy score calculation for search result ranking
 * Higher score = better match
 *
 * Scoring rules:
 * - Exact number match: +50 points
 * - Number matches when normalized: +40 points
 * - Partial number match: +20 points
 * - Name exact match: +30 points
 * - Name contains query: +15 points
 * - Set ID exact match: +25 points
 * - Language match: +5 points (optional bonus)
 * - Has market price: +3 points (indicates active/popular card)
 * - Recent set (newer release date): +2 points
 */
export interface AccuracyScoreParams {
  /** The card's number from TCG API */
  cardNumber: string;
  /** The card's name from TCG API */
  cardName: string;
  /** The card's set ID from TCG API */
  cardSetId: string;
  /** The card's set release date */
  cardReleaseDate?: string;
  /** Whether the card has market price */
  hasMarketPrice?: boolean;
  /** Query number (normalized) */
  queryNumber: NormalizedCardNumber;
  /** Query name */
  queryName: string;
  /** Query set ID */
  querySetId?: string;
  /** Query language (for optional bonus) */
  queryLanguage?: string;
}

export interface AccuracyScoreResult {
  score: number;
  breakdown: {
    numberMatch: number;
    nameMatch: number;
    setMatch: number;
    languageBonus: number;
    priceBonus: number;
    recencyBonus: number;
  };
}

/**
 * Calculate accuracy score for a search result
 */
export function calculateAccuracyScore(params: AccuracyScoreParams): AccuracyScoreResult {
  const {
    cardNumber,
    cardName,
    cardSetId,
    cardReleaseDate,
    hasMarketPrice,
    queryNumber,
    queryName,
    querySetId,
  } = params;

  let numberMatch = 0;
  let nameMatch = 0;
  let setMatch = 0;
  const languageBonus = 0; // Reserved for future language-based scoring
  let priceBonus = 0;
  let recencyBonus = 0;

  // 1. Number matching (most important)
  const normalizedCardNumber = normalizeCardNumber(cardNumber);

  if (queryNumber.number) {
    // Exact match after normalization
    if (normalizedCardNumber.number === queryNumber.number) {
      numberMatch = 50;
    }
    // Check if the raw number contains the query
    else if (cardNumber.includes(queryNumber.number)) {
      numberMatch = 30;
    }
    // Partial match (one contains the other)
    else if (
      queryNumber.number.includes(normalizedCardNumber.number) ||
      normalizedCardNumber.number.includes(queryNumber.number)
    ) {
      numberMatch = 20;
    }
  }

  // 2. Name matching
  if (queryName) {
    const normalizedCardName = cardName.toLowerCase().trim();
    const normalizedQueryName = queryName.toLowerCase().trim();

    if (normalizedCardName === normalizedQueryName) {
      nameMatch = 30;
    } else if (normalizedCardName.includes(normalizedQueryName)) {
      nameMatch = 15;
    } else if (normalizedQueryName.includes(normalizedCardName)) {
      nameMatch = 10;
    }
  }

  // 3. Set ID matching
  if (querySetId) {
    const normalizedCardSetId = cardSetId.toLowerCase().trim();
    const normalizedQuerySetId = querySetId.toLowerCase().trim();

    if (normalizedCardSetId === normalizedQuerySetId) {
      setMatch = 25;
    } else if (
      normalizedCardSetId.includes(normalizedQuerySetId) ||
      normalizedQuerySetId.includes(normalizedCardSetId)
    ) {
      setMatch = 10;
    }
  }

  // 4. Price bonus (indicates active/tradeable card)
  if (hasMarketPrice) {
    priceBonus = 3;
  }

  // 5. Recency bonus (newer cards ranked slightly higher)
  if (cardReleaseDate) {
    const releaseYear = parseInt(cardReleaseDate.substring(0, 4), 10);
    const currentYear = new Date().getFullYear();
    if (releaseYear >= currentYear - 1) {
      recencyBonus = 2;
    } else if (releaseYear >= currentYear - 3) {
      recencyBonus = 1;
    }
  }

  const score = numberMatch + nameMatch + setMatch + languageBonus + priceBonus + recencyBonus;

  return {
    score,
    breakdown: {
      numberMatch,
      nameMatch,
      setMatch,
      languageBonus,
      priceBonus,
      recencyBonus,
    },
  };
}

/**
 * Sort cards by accuracy score (descending)
 * Secondary sort by set release date (newest first)
 */
export function sortByAccuracy<T extends { score: number; releaseDate?: string }>(
  cards: T[]
): T[] {
  return [...cards].sort((a, b) => {
    // Primary: score descending
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary: release date descending (newest first)
    if (a.releaseDate && b.releaseDate) {
      return b.releaseDate.localeCompare(a.releaseDate);
    }
    return 0;
  });
}

/**
 * Extract unique set names from cards for filter dropdown
 */
export function extractUniqueSets(
  cards: Array<{ set: { id: string; name: string } }>
): Array<{ id: string; name: string }> {
  const setMap = new Map<string, { id: string; name: string }>();

  for (const card of cards) {
    if (!setMap.has(card.set.id)) {
      setMap.set(card.set.id, { id: card.set.id, name: card.set.name });
    }
  }

  return Array.from(setMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract unique rarities from cards for filter dropdown
 */
export function extractUniqueRarities(
  cards: Array<{ rarity?: string }>
): string[] {
  const rarities = new Set<string>();

  for (const card of cards) {
    if (card.rarity) {
      rarities.add(card.rarity);
    }
  }

  return Array.from(rarities).sort();
}
