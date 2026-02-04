import { describe, it, expect } from "vitest";
import {
  normalizeCardNumber,
  calculateAccuracyScore,
  extractUniqueSets,
  extractUniqueRarities,
} from "../normalize";

describe("normalizeCardNumber", () => {
  it("should normalize standard format with leading zeros", () => {
    const result = normalizeCardNumber("025/165");
    expect(result.number).toBe("25");
    expect(result.total).toBe("165");
    expect(result.full).toBe("25/165");
    expect(result.hasTotal).toBe(true);
  });

  it("should normalize format without leading zeros", () => {
    const result = normalizeCardNumber("25/165");
    expect(result.number).toBe("25");
    expect(result.total).toBe("165");
    expect(result.full).toBe("25/165");
    expect(result.hasTotal).toBe(true);
  });

  it("should handle number only format with leading zeros", () => {
    const result = normalizeCardNumber("025");
    expect(result.number).toBe("25");
    expect(result.total).toBeNull();
    expect(result.full).toBe("25");
    expect(result.hasTotal).toBe(false);
  });

  it("should handle number only format without leading zeros", () => {
    const result = normalizeCardNumber("25");
    expect(result.number).toBe("25");
    expect(result.total).toBeNull();
    expect(result.full).toBe("25");
    expect(result.hasTotal).toBe(false);
  });

  it("should handle alphanumeric formats like TG05/TG30", () => {
    const result = normalizeCardNumber("TG05/TG30");
    expect(result.number).toBe("TG05");
    expect(result.total).toBe("TG30");
    expect(result.full).toBe("TG05/TG30");
    expect(result.hasTotal).toBe(true);
  });

  it("should handle special alphanumeric formats like SV001", () => {
    const result = normalizeCardNumber("SV001");
    expect(result.number).toBe("SV001");
    expect(result.total).toBeNull();
    expect(result.full).toBe("SV001");
    expect(result.hasTotal).toBe(false);
  });

  it("should handle empty input", () => {
    const result = normalizeCardNumber("");
    expect(result.number).toBe("");
    expect(result.total).toBeNull();
    expect(result.full).toBe("");
    expect(result.hasTotal).toBe(false);
  });

  it("should handle whitespace input", () => {
    const result = normalizeCardNumber("  025/165  ");
    expect(result.number).toBe("25");
    expect(result.total).toBe("165");
  });

  it("should preserve original input", () => {
    const result = normalizeCardNumber("025/165");
    expect(result.original).toBe("025/165");
  });

  it("should handle single digit number", () => {
    const result = normalizeCardNumber("001/100");
    expect(result.number).toBe("1");
    expect(result.total).toBe("100");
    expect(result.full).toBe("1/100");
  });
});

describe("calculateAccuracyScore", () => {
  const baseQueryNumber = normalizeCardNumber("25/165");

  it("should give highest score for exact number match", () => {
    const result = calculateAccuracyScore({
      cardNumber: "25",
      cardName: "Pikachu",
      cardSetId: "sv2a",
      queryNumber: baseQueryNumber,
      queryName: "Pikachu",
      querySetId: "sv2a",
    });

    expect(result.breakdown.numberMatch).toBe(50);
    expect(result.breakdown.nameMatch).toBe(30);
    expect(result.breakdown.setMatch).toBe(25);
    expect(result.score).toBeGreaterThanOrEqual(105);
  });

  it("should give partial score for number containing query", () => {
    const result = calculateAccuracyScore({
      cardNumber: "125",
      cardName: "Pikachu",
      cardSetId: "sv2a",
      queryNumber: normalizeCardNumber("25"),
      queryName: "Pikachu",
    });

    expect(result.breakdown.numberMatch).toBe(30);
  });

  it("should give score for name containing query", () => {
    const result = calculateAccuracyScore({
      cardNumber: "100",
      cardName: "Pikachu V",
      cardSetId: "sv2a",
      queryNumber: normalizeCardNumber("100"),
      queryName: "Pikachu",
    });

    expect(result.breakdown.nameMatch).toBe(15);
  });

  it("should add bonus for having market price", () => {
    const withPrice = calculateAccuracyScore({
      cardNumber: "25",
      cardName: "Pikachu",
      cardSetId: "sv2a",
      hasMarketPrice: true,
      queryNumber: baseQueryNumber,
      queryName: "Pikachu",
    });

    const withoutPrice = calculateAccuracyScore({
      cardNumber: "25",
      cardName: "Pikachu",
      cardSetId: "sv2a",
      hasMarketPrice: false,
      queryNumber: baseQueryNumber,
      queryName: "Pikachu",
    });

    expect(withPrice.breakdown.priceBonus).toBe(3);
    expect(withoutPrice.breakdown.priceBonus).toBe(0);
    expect(withPrice.score).toBeGreaterThan(withoutPrice.score);
  });

  it("should add recency bonus for recent releases", () => {
    const currentYear = new Date().getFullYear();

    const recentCard = calculateAccuracyScore({
      cardNumber: "25",
      cardName: "Pikachu",
      cardSetId: "sv2a",
      cardReleaseDate: `${currentYear}-01-01`,
      queryNumber: baseQueryNumber,
      queryName: "Pikachu",
    });

    const oldCard = calculateAccuracyScore({
      cardNumber: "25",
      cardName: "Pikachu",
      cardSetId: "xy1",
      cardReleaseDate: "2015-01-01",
      queryNumber: baseQueryNumber,
      queryName: "Pikachu",
    });

    expect(recentCard.breakdown.recencyBonus).toBe(2);
    expect(oldCard.breakdown.recencyBonus).toBe(0);
  });
});

describe("extractUniqueSets", () => {
  it("should extract unique sets from cards", () => {
    const cards = [
      { set: { id: "sv2a", name: "Paldea Evolved" } },
      { set: { id: "sv2a", name: "Paldea Evolved" } },
      { set: { id: "sv1", name: "Scarlet & Violet" } },
    ];

    const sets = extractUniqueSets(cards);

    expect(sets).toHaveLength(2);
    expect(sets.map((s) => s.id)).toContain("sv2a");
    expect(sets.map((s) => s.id)).toContain("sv1");
  });

  it("should return empty array for no cards", () => {
    const sets = extractUniqueSets([]);
    expect(sets).toHaveLength(0);
  });

  it("should sort sets alphabetically by name", () => {
    const cards = [
      { set: { id: "b", name: "Zebra" } },
      { set: { id: "a", name: "Alpha" } },
    ];

    const sets = extractUniqueSets(cards);

    expect(sets[0].name).toBe("Alpha");
    expect(sets[1].name).toBe("Zebra");
  });
});

describe("extractUniqueRarities", () => {
  it("should extract unique rarities from cards", () => {
    const cards = [
      { rarity: "Common" },
      { rarity: "Common" },
      { rarity: "Rare" },
      { rarity: undefined },
    ];

    const rarities = extractUniqueRarities(cards);

    expect(rarities).toHaveLength(2);
    expect(rarities).toContain("Common");
    expect(rarities).toContain("Rare");
  });

  it("should return empty array for no rarities", () => {
    const cards = [{ rarity: undefined }, { rarity: undefined }];
    const rarities = extractUniqueRarities(cards);
    expect(rarities).toHaveLength(0);
  });

  it("should sort rarities alphabetically", () => {
    const cards = [{ rarity: "Rare" }, { rarity: "Common" }];

    const rarities = extractUniqueRarities(cards);

    expect(rarities[0]).toBe("Common");
    expect(rarities[1]).toBe("Rare");
  });
});
