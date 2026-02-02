"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Loader2,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VisionResponse } from "@/lib/types/vision";
import { TCGCard } from "@/lib/tcg/types";
import { getCardMarketPrice } from "@/lib/tcg/client";

interface ResultFormProps {
  visionResult: VisionResponse;
  onCardSelect?: (card: TCGCard) => void;
}

export function ResultForm({ visionResult, onCardSelect }: ResultFormProps) {
  // Editable form state initialized from AI result
  const [pokemonName, setPokemonName] = useState(visionResult.pokemon_name);
  const [cardNumber, setCardNumber] = useState(visionResult.card_number);
  const [setId, setSetId] = useState(visionResult.set_id || "");

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TCGCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Selection state
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);

  // UI state
  const [showAllResults, setShowAllResults] = useState(false);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setSearchError(null);
    setSelectedCard(null);

    try {
      const response = await fetch("/api/cards/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pokemonName,
          number: cardNumber,
          setId: setId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setSearchError(errorData.error || "Search failed");
        setSearchResults([]);
        setTotalCount(0);
      } else {
        const data = await response.json();
        setSearchResults(data.cards || []);
        setTotalCount(data.totalCount || 0);
      }

      setHasSearched(true);
    } catch (error) {
      console.error("[Search Error]", error);
      setSearchError("Network error. Please try again.");
      setSearchResults([]);
      setTotalCount(0);
    } finally {
      setIsSearching(false);
    }
  }, [pokemonName, cardNumber, setId]);

  const handleCardSelect = useCallback(
    (card: TCGCard) => {
      setSelectedCard(card);
      onCardSelect?.(card);
    },
    [onCardSelect]
  );

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  // Show first 4 results, or all if expanded
  const displayedResults = showAllResults
    ? searchResults
    : searchResults.slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Edit Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">AI Detection Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="pokemon-name">Pokemon Name</Label>
              <Input
                id="pokemon-name"
                value={pokemonName}
                onChange={(e) => setPokemonName(e.target.value)}
                placeholder="e.g., Pikachu"
              />
            </div>
            <div>
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="e.g., 025/165"
              />
            </div>
            <div>
              <Label htmlFor="set-id">Set ID (optional)</Label>
              <Input
                id="set-id"
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                placeholder="e.g., sv2a"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !pokemonName}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Find Card
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Error */}
      {searchError && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-red-600">{searchError}</CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && !searchError && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {searchResults.length > 0
                ? `Found ${totalCount} card${totalCount !== 1 ? "s" : ""}`
                : "No cards found"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {displayedResults.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardSelect(card)}
                      className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                        selectedCard?.id === card.id
                          ? "border-primary ring-2 ring-primary"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      {/* Card Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.images.small}
                        alt={card.name}
                        className="aspect-[2.5/3.5] w-full object-cover"
                        loading="lazy"
                      />

                      {/* Selected Indicator */}
                      {selectedCard?.id === card.id && (
                        <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Card Info Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                        <p className="truncate text-xs font-medium text-white">
                          {card.name}
                        </p>
                        <p className="text-xs text-white/70">
                          {card.set.name} · #{card.number}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Show More/Less */}
                {searchResults.length > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllResults(!showAllResults)}
                    className="mt-3 w-full"
                  >
                    {showAllResults ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show {searchResults.length - 4} More
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">
                Try adjusting the search terms above.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Card Details */}
      {selectedCard && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Check className="h-5 w-5 text-primary" />
              Selected Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedCard.images.small}
                alt={selectedCard.name}
                className="h-32 w-auto rounded-md"
              />
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="font-semibold">{selectedCard.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCard.set.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    #{selectedCard.number} · {selectedCard.rarity || "Unknown"}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Market: {formatPrice(getCardMarketPrice(selectedCard))}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
