"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getCollection, type CollectionListResult } from "@/lib/actions/collection";
import type { CollectionCard } from "@/lib/types/collection";
import { CONDITION_LABELS } from "@/lib/types/collection";
import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";

export function CollectionList() {
  const t = useTranslations("collection");
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCards() {
      const result: CollectionListResult = await getCollection({ limit: 50 });
      if (result.success && result.data) {
        setCards(result.data);
      }
      setIsLoading(false);
    }
    loadCards();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("startScanning")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("totalCards", { count: cards.length })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.id} href={`/collection/${card.id}`}>
            <Card className="overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50">
              <CardContent className="p-4">
                <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                  <CardImage
                    tcgImageUrl={card.tcg_image_url}
                    storagePath={card.front_image_path}
                    alt={card.pokemon_name}
                  />
                </div>

                <div className="mt-3">
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-medium leading-tight truncate">{card.pokemon_name}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {CONDITION_LABELS[card.condition]?.ko ?? card.condition}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.card_number}
                    {card.set_name && ` · ${card.set_name}`}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    {card.purchase_price ? (
                      <span className="text-muted-foreground">
                        원가 <span className="font-medium text-foreground">₩{card.purchase_price.toLocaleString()}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    {card.market_price && (
                      <span className="font-medium text-green-600">
                        ${card.market_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
