/**
 * Unit tests for Vision API validators
 *
 * To run these tests:
 * 1. Fix npm cache permissions: sudo chown -R $(whoami) ~/.npm
 * 2. Install vitest: npm install -D vitest
 * 3. Add test script to package.json: "test": "vitest"
 * 4. Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateStorageUrl,
  stripCodeFences,
  safeParseVisionJson,
  isValidCardNumber,
} from "../validators";

describe("validateStorageUrl", () => {
  beforeEach(() => {
    // Mock the environment variable
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://myproject.supabase.co"
    );
  });

  it("should accept valid Supabase storage signed URL", () => {
    const validUrl =
      "https://myproject.supabase.co/storage/v1/object/sign/card-uploads/user123/image.jpg?token=abc123";
    const result = validateStorageUrl(validUrl);
    expect(result.valid).toBe(true);
  });

  it("should reject HTTP URLs", () => {
    const httpUrl =
      "http://myproject.supabase.co/storage/v1/object/sign/card-uploads/user123/image.jpg?token=abc123";
    const result = validateStorageUrl(httpUrl);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image URL must use HTTPS");
  });

  it("should reject external domains", () => {
    const externalUrl =
      "https://evil.com/storage/v1/object/sign/card-uploads/user123/image.jpg?token=abc123";
    const result = validateStorageUrl(externalUrl);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image URL must be from our storage");
  });

  it("should reject URLs with wrong bucket path", () => {
    const wrongBucket =
      "https://myproject.supabase.co/storage/v1/object/sign/other-bucket/user123/image.jpg?token=abc123";
    const result = validateStorageUrl(wrongBucket);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid storage path");
  });

  it("should reject URLs without token", () => {
    const noToken =
      "https://myproject.supabase.co/storage/v1/object/sign/card-uploads/user123/image.jpg";
    const result = validateStorageUrl(noToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing signed URL token");
  });

  it("should reject invalid URL format", () => {
    const result = validateStorageUrl("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid URL format");
  });
});

describe("stripCodeFences", () => {
  it("should strip ```json fence", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("should strip ``` fence without language", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("should handle content without fences", () => {
    const input = '{"key": "value"}';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("should handle extra whitespace", () => {
    const input = '  ```json\n  {"key": "value"}  \n```  ';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });
});

describe("safeParseVisionJson", () => {
  it("should parse valid JSON", () => {
    const input = '{"pokemon_name": "Pikachu", "card_number": "025/165"}';
    const result = safeParseVisionJson(input);
    expect(result).toEqual({
      pokemon_name: "Pikachu",
      card_number: "025/165",
    });
  });

  it("should parse JSON with code fences", () => {
    const input =
      '```json\n{"pokemon_name": "Pikachu", "card_number": "025/165"}\n```';
    const result = safeParseVisionJson(input);
    expect(result).toEqual({
      pokemon_name: "Pikachu",
      card_number: "025/165",
    });
  });

  it("should handle trailing commas", () => {
    const input = '{"pokemon_name": "Pikachu", "card_number": "025/165",}';
    const result = safeParseVisionJson(input);
    expect(result).toEqual({
      pokemon_name: "Pikachu",
      card_number: "025/165",
    });
  });

  it("should extract JSON object from mixed content", () => {
    const input = 'Here is the result: {"pokemon_name": "Pikachu"} as requested';
    const result = safeParseVisionJson(input);
    expect(result).toEqual({
      pokemon_name: "Pikachu",
    });
  });

  it("should throw on completely invalid content", () => {
    const input = "This is not JSON at all";
    expect(() => safeParseVisionJson(input)).toThrow(
      "Failed to parse JSON response"
    );
  });
});

describe("isValidCardNumber", () => {
  it("should accept standard card number format", () => {
    expect(isValidCardNumber("025/165")).toBe(true);
    expect(isValidCardNumber("25/165")).toBe(true);
    expect(isValidCardNumber("1/100")).toBe(true);
  });

  it("should accept set prefix format", () => {
    expect(isValidCardNumber("SV2a-025")).toBe(true);
    expect(isValidCardNumber("sv2a-25")).toBe(true);
    expect(isValidCardNumber("XY-123")).toBe(true);
  });

  it("should accept simple number format", () => {
    expect(isValidCardNumber("025")).toBe(true);
    expect(isValidCardNumber("25")).toBe(true);
  });

  it("should reject null/undefined", () => {
    expect(isValidCardNumber(null)).toBe(false);
    expect(isValidCardNumber(undefined)).toBe(false);
  });

  it("should reject empty string", () => {
    expect(isValidCardNumber("")).toBe(false);
  });

  it("should reject invalid formats", () => {
    expect(isValidCardNumber("Pikachu")).toBe(false);
    expect(isValidCardNumber("abc/def")).toBe(false);
  });
});
