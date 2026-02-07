"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Check,
  ExternalLink,
  AlertCircle,
  Sparkles,
  X,
  RefreshCw,
  Filter,
} from "lucide-react";
import { VisionResponse } from "@/lib/types/vision";
import {
  useSearchFromVision,
  formatPrice,
  filterBySet,
  filterByRarity,
  paginateCards,
  ScoredCard,
} from "@/lib/tcg/hooks";
import { getCardMarketPrice } from "@/lib/tcg/client";
import { extractUniqueSets, extractUniqueRarities } from "@/lib/tcg/normalize";
import { SaveToCollectionDialog } from "./save-to-collection-dialog";

interface ResultFormProps {
  visionResult: VisionResponse;
  onCardSelect?: (card: ScoredCard) => void;
  uploadedImagePath?: string;
}

const PAGE_SIZE = 12;

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  ja: "日本語",
  en: "English",
};

export function ResultForm({ visionResult, onCardSelect, uploadedImagePath }: ResultFormProps) {
  const t = useTranslations("result");

  // Editable form state initialized from AI result
  const [pokemonName, setPokemonName] = useState(visionResult.pokemon_name);
  const [cardNumber, setCardNumber] = useState(visionResult.card_number);
  const [setId, setSetId] = useState(visionResult.set_id || "");

  // Manual search mode (when user edits and searches again)
  const [isManualSearch, setIsManualSearch] = useState(false);
  const [manualSearchTrigger, setManualSearchTrigger] = useState(0);

  // Selection state
  const [selectedCard, setSelectedCard] = useState<ScoredCard | null>(null);

  // Save dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // Filter state
  const [filterSet, setFilterSet] = useState<string>("");
  const [filterRarity, setFilterRarity] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Track if we've already auto-selected
  const autoSelectedRef = useRef(false);

  // Track the current vision result to detect changes
  const visionResultIdRef = useRef(
    `${visionResult.pokemon_name}-${visionResult.card_number}-${visionResult.set_id || ""}`
  );

  // Auto-search using TanStack Query
  const {
    data: searchResult,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useSearchFromVision(
    isManualSearch ? null : visionResult,
    { enabled: true }
  );

  // Manual search query
  const manualSearchQuery = useSearchFromVision(
    isManualSearch
      ? {
          pokemon_name: pokemonName,
          card_number: cardNumber,
          set_id: setId || undefined,
          language: visionResult.language,
        }
      : null,
    { enabled: isManualSearch && manualSearchTrigger > 0 }
  );

  // Use manual search result when in manual mode
  const activeResult = isManualSearch ? manualSearchQuery.data : searchResult;
  const activeLoading = isManualSearch ? manualSearchQuery.isLoading : isLoading;
  const activeError = isManualSearch ? manualSearchQuery.isError : isError;
  const activeFetching = isManualSearch ? manualSearchQuery.isFetching : isFetching;

  // Reset state when vision result changes (race condition prevention)
  // This is intentional state synchronization with props change
  useEffect(() => {
    const newId = `${visionResult.pokemon_name}-${visionResult.card_number}-${visionResult.set_id || ""}`;
    if (newId !== visionResultIdRef.current) {
      visionResultIdRef.current = newId;
      // Reset all state - intentional synchronization with new vision result
      /* eslint-disable react-hooks/set-state-in-effect */
      setSelectedCard(null);
      setIsManualSearch(false);
      setManualSearchTrigger(0);
      setFilterSet("");
      setFilterRarity("");
      setCurrentPage(1);
      autoSelectedRef.current = false;
      // Reset form to new vision result
      setPokemonName(visionResult.pokemon_name);
      setCardNumber(visionResult.card_number);
      setSetId(visionResult.set_id || "");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [visionResult]);

  // Get scored cards from result - memoized to prevent unnecessary re-renders
  const scoredCards = useMemo(
    () => activeResult?.scoredCards || [],
    [activeResult?.scoredCards]
  );

  // Apply filters
  const filteredCards = useMemo(() => {
    let result = scoredCards;
    if (filterSet) {
      result = filterBySet(result, filterSet);
    }
    if (filterRarity) {
      result = filterByRarity(result, filterRarity);
    }
    return result;
  }, [scoredCards, filterSet, filterRarity]);

  // Extract unique sets and rarities for filter dropdowns
  const availableSets = useMemo(
    () => extractUniqueSets(scoredCards),
    [scoredCards]
  );
  const availableRarities = useMemo(
    () => extractUniqueRarities(scoredCards),
    [scoredCards]
  );

  // Paginate results
  const paginatedResult = useMemo(
    () => paginateCards(filteredCards, currentPage, PAGE_SIZE),
    [filteredCards, currentPage]
  );

  // Auto-select if only one result found
  useEffect(() => {
    if (
      activeResult?.success &&
      activeResult.scoredCards.length === 1 &&
      !selectedCard &&
      !autoSelectedRef.current
    ) {
      autoSelectedRef.current = true;
      const card = activeResult.scoredCards[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCard(card);
      onCardSelect?.(card);
    }
  }, [activeResult, selectedCard, onCardSelect]);

  // Manual search handler
  const handleManualSearch = useCallback(() => {
    setIsManualSearch(true);
    setSelectedCard(null);
    setFilterSet("");
    setFilterRarity("");
    setCurrentPage(1);
    autoSelectedRef.current = false;
    setManualSearchTrigger((prev) => prev + 1);
  }, []);

  // Card selection handler
  const handleCardSelect = useCallback(
    (card: ScoredCard) => {
      setSelectedCard(card);
      onCardSelect?.(card);
    },
    [onCardSelect]
  );

  // Deselect handler
  const handleDeselect = useCallback(() => {
    setSelectedCard(null);
    autoSelectedRef.current = true; // Prevent auto-select from re-triggering
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    if (isManualSearch) {
      manualSearchQuery.refetch();
    } else {
      refetch();
    }
  }, [isManualSearch, manualSearchQuery, refetch]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  // Filter change handlers
  const handleSetFilterChange = useCallback((value: string) => {
    setFilterSet(value === "all" ? "" : value);
    setCurrentPage(1);
  }, []);

  const handleRarityFilterChange = useCallback((value: string) => {
    setFilterRarity(value === "all" ? "" : value);
    setCurrentPage(1);
  }, []);

  const hasResults = activeResult?.success && filteredCards.length > 0;
  const noResults = activeResult?.success && filteredCards.length === 0;
  const totalCount = filteredCards.length;

  return (
    <div className="flex flex-col gap-4">
      {/* AI Detection Result - Edit Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Detected Language Badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("detectedLanguage")}:</span>
            <span className="rounded bg-muted px-2 py-0.5 font-medium">
              {LANGUAGE_NAMES[visionResult.language] || visionResult.language}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="pokemon-name">{t("pokemonName")}</Label>
              <Input
                id="pokemon-name"
                value={pokemonName}
                onChange={(e) => {
                  setPokemonName(e.target.value);
                  setIsManualSearch(true);
                }}
                placeholder="e.g., Pikachu"
              />
            </div>
            <div>
              <Label htmlFor="card-number">{t("cardNumber")}</Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => {
                  setCardNumber(e.target.value);
                  setIsManualSearch(true);
                }}
                placeholder="e.g., 025/165"
              />
            </div>
            <div>
              <Label htmlFor="set-id">{t("setId")}</Label>
              <Input
                id="set-id"
                value={setId}
                onChange={(e) => {
                  setSetId(e.target.value);
                  setIsManualSearch(true);
                }}
                placeholder="e.g., sv2a"
              />
            </div>
          </div>

          {/* Manual search button */}
          {isManualSearch && (
            <Button
              onClick={handleManualSearch}
              disabled={activeLoading || activeFetching || !pokemonName}
              className="w-full"
            >
              {activeLoading || activeFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("searching")}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  {t("findCard")}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {(activeLoading || activeFetching) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("searching")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border">
                  <Skeleton className="aspect-[2.5/3.5] w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Error with Retry */}
      {activeError && !activeLoading && (
        <Card className="border-red-500">
          <CardContent className="flex flex-col items-center gap-3 p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{t("searchFailed")}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("retrySearch")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls (only show when we have results) */}
      {hasResults && scoredCards.length > 1 && !activeLoading && (
        <Card>
          <CardContent className="flex flex-wrap gap-3 p-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            {/* Set Filter */}
            {availableSets.length > 1 && (
              <Select value={filterSet || "all"} onValueChange={handleSetFilterChange}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder={t("allSets")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allSets")}</SelectItem>
                  {availableSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Rarity Filter */}
            {availableRarities.length > 1 && (
              <Select value={filterRarity || "all"} onValueChange={handleRarityFilterChange}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder={t("allRarities")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allRarities")}</SelectItem>
                  {availableRarities.map((rarity) => (
                    <SelectItem key={rarity} value={rarity}>
                      {rarity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {!activeLoading && !activeFetching && hasResults && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {t("foundCards", { count: totalCount })}
              </CardTitle>
              {totalCount > PAGE_SIZE && (
                <span className="text-sm text-muted-foreground">
                  {t("showingOf", {
                    showing: Math.min(currentPage * PAGE_SIZE, totalCount),
                    total: totalCount,
                  })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {paginatedResult.items.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card)}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                    selectedCard?.id === card.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {/* Card Image with next/image */}
                  <div className="relative aspect-[2.5/3.5] w-full">
                    <Image
                      src={card.images.small}
                      alt={card.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Selected Indicator */}
                  {selectedCard?.id === card.id && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* Accuracy Score Badge */}
                  {card.accuracyScore > 0 && (
                    <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {card.accuracyScore}%
                    </div>
                  )}

                  {/* Card Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                    <p className="truncate text-xs font-medium text-white">
                      {card.name}
                    </p>
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span className="truncate">
                        {card.set.name} · #{card.number}
                      </span>
                      {card.rarity && (
                        <span className="ml-1 truncate text-[10px] opacity-80">
                          {card.rarity}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Load More Button */}
            {paginatedResult.hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                className="mt-4 w-full"
              >
                {t("loadMore")} (+{Math.min(PAGE_SIZE, totalCount - currentPage * PAGE_SIZE)})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!activeLoading && !activeFetching && noResults && (
        <Card className="border-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {t("noCardsFound")}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t("tryDifferentSearch")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Card Details */}
      {selectedCard && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Check className="h-5 w-5 text-primary" />
                {t("selectedCard")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselect}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-4 w-4" />
                {t("deselect")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {/* Card Image */}
              <div className="relative h-32 w-auto aspect-[2.5/3.5] flex-shrink-0">
                <Image
                  src={selectedCard.images.small}
                  alt={selectedCard.name}
                  fill
                  className="rounded-md object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="font-semibold">{selectedCard.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCard.set.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    #{selectedCard.number} · {selectedCard.rarity || "-"}
                  </p>
                  {selectedCard.accuracyScore > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("accuracyScore")}: {selectedCard.accuracyScore}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("marketPrice")}: {formatPrice(getCardMarketPrice(selectedCard))}
                  </span>
                  {selectedCard.tcgplayer?.url && (
                    <a
                      href={selectedCard.tcgplayer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      TCGPlayer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselect}
                className="flex-1"
              >
                {t("changeSelection")}
              </Button>
              <Button className="flex-1" onClick={() => setIsSaveDialogOpen(true)}>
                {t("addToCollection")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save to Collection Dialog */}
      <SaveToCollectionDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        card={selectedCard}
        visionLanguage={visionResult.language}
        uploadedImagePath={uploadedImagePath}
      />
    </div>
  );
}
