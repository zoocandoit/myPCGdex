# Phase 4 Hardening: TCG API Search & Card Selection

This document describes the Phase 4 hardening improvements for the Pokemon TCG API search and card selection functionality.

## Overview

Phase 4 enhances the card search experience after Vision API analysis by:
1. Normalizing card numbers for consistent matching
2. Scoring and ranking search results by accuracy
3. Adding filter and pagination UI
4. Preventing race conditions
5. Enabling card deselection and state cleanup

## Files Changed/Created

### New Files
- `src/lib/tcg/normalize.ts` - Card number normalization and accuracy scoring utilities
- `src/lib/tcg/__tests__/normalize.test.ts` - Unit tests for normalization functions
- `src/components/ui/select.tsx` - shadcn/ui Select component for filters

### Modified Files
- `src/lib/tcg/hooks.ts` - Enhanced search hooks with scoring and filtering
- `src/app/(protected)/scan/result-form.tsx` - Improved result UI with filters and pagination
- `src/app/(protected)/scan/dual-image-scanner.tsx` - Updated to use ScoredCard type
- `next.config.ts` - Added Pokemon TCG image domain for next/image
- `messages/*.json` - Added new translations for filter/pagination UI

## Design Decisions

### 1. Card Number Normalization

**Problem**: Card numbers come in various formats ("025/165", "25/165", "025", "TG05/TG30")

**Solution**: `normalizeCardNumber()` function that:
- Strips leading zeros from pure numeric parts
- Preserves alphanumeric prefixes (TG, SV, etc.)
- Separates number and total for flexible matching
- Returns both normalized and original values

```typescript
normalizeCardNumber("025/165")
// → { number: "25", total: "165", full: "25/165" }
```

### 2. Accuracy Scoring System

**Problem**: Multiple cards may match a search query; need to rank them

**Solution**: Point-based accuracy scoring:

| Criterion | Points |
|-----------|--------|
| Exact number match | 50 |
| Number contains query | 30 |
| Name exact match | 30 |
| Name contains query | 15 |
| Set ID exact match | 25 |
| Has market price | 3 |
| Recent release (1 year) | 2 |

Results are sorted by score descending, then by release date (newest first).

### 3. Search Strategy (Priority Order)

1. **card_number + set_id** (most specific)
2. **card_number + pokemon_name** (common case)
3. **card_number only** (broad search)
4. **pokemon_name only** (fallback)

Each strategy returns as soon as results are found, with all results scored and sorted.

### 4. Race Condition Prevention

**Problem**: Fast image changes could cause stale results to overwrite new ones

**Solution**:
- TanStack Query's `signal` parameter for request cancellation
- `visionResultIdRef` to track current vision result
- State reset when vision result changes
- Stable query keys based on vision result fields

### 5. Filter and Pagination UI

**Filters**:
- Set filter (dropdown with all unique sets from results)
- Rarity filter (dropdown with all unique rarities)

**Pagination**:
- 12 cards per page
- "Load More" button (not page numbers)
- Shows "X/Y cards" count

### 6. Image Optimization

- Uses `next/image` with `fill` and `sizes` for responsive loading
- Lazy loading enabled by default
- Pokemon TCG image domain added to `next.config.ts`

### 7. Card Selection UX

**Auto-select**: When exactly 1 result is found, it's automatically selected

**Deselect**: Users can click "선택 해제" button to deselect and choose another card

**State cleanup**: When scanning a new card or modifying search, selection is cleared

## API Changes

### ScoredCard Type

Extended from `TCGCard` with accuracy information:

```typescript
interface ScoredCard extends TCGCard {
  accuracyScore: number;
  scoreBreakdown: {
    numberMatch: number;
    nameMatch: number;
    setMatch: number;
    languageBonus: number;
    priceBonus: number;
    recencyBonus: number;
  };
}
```

### ScoredCardSearchResult Type

Extended from `CardSearchResult`:

```typescript
interface ScoredCardSearchResult extends CardSearchResult {
  scoredCards: ScoredCard[];
}
```

### New Hook Options

`useSearchFromVision` now includes:
- AbortController support for request cancellation
- Custom retry policy (up to 3 retries, exponential backoff)
- Automatic abort on component unmount

## Testing

### Unit Tests

Run with:
```bash
npm test src/lib/tcg/__tests__/normalize.test.ts
```

Test coverage:
- `normalizeCardNumber`: 10 test cases
  - Standard format, leading zeros, alphanumeric, edge cases
- `calculateAccuracyScore`: 5 test cases
  - Score breakdown, bonuses, edge cases
- `extractUniqueSets`: 3 test cases
- `extractUniqueRarities`: 3 test cases

### Manual Testing Checklist

- [ ] 0 results: Shows warning with "try different search" message
- [ ] 1 result: Auto-selects the card, shows details
- [ ] Multiple results: Shows grid with filters, can select any
- [ ] Filter by set: Filters results correctly
- [ ] Filter by rarity: Filters results correctly
- [ ] Load more: Loads next page of results
- [ ] Deselect: Returns to result list, can select another
- [ ] Fast image change: No stale results shown
- [ ] Network error: Shows error with retry button
- [ ] Retry: Refetches search results

## Translations Added

### Korean (ko.json)
```json
"deselect": "선택 해제",
"changeSelection": "다른 카드 선택",
"filterBySet": "세트로 필터",
"filterByRarity": "레어도로 필터",
"allSets": "모든 세트",
"allRarities": "모든 레어도",
"loadMore": "더 보기",
"showingOf": "{showing}/{total}개 표시 중",
"accuracyScore": "일치도",
"retrySearch": "검색 재시도",
"searchFailed": "검색에 실패했습니다",
"languageHint": "카드 언어: {lang}",
"detectedLanguage": "감지된 언어"
```

## Next Steps (Phase 5)

Phase 5 will implement:
1. Supabase collection table schema
2. "Add to Collection" functionality
3. Collection CRUD operations
4. Collection list view with card images

The `selectedCard` and `uploadedPaths` state are already prepared for Phase 5 integration.
