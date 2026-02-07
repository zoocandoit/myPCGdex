"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ImageIcon } from "lucide-react";
import { getCollection, type CollectionListResult } from "@/lib/actions/collection";
import type { CollectionCard } from "@/lib/types/collection";

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
                {card.tcg_image_url ? (
                  <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                    <Image
                      src={card.tcg_image_url}
                      alt={card.pokemon_name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[2.5/3.5] items-center justify-center rounded-md bg-muted">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="mt-3">
                  <p className="font-medium">{card.pokemon_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {card.card_number}
                    {card.set_name && ` · ${card.set_name}`}
                  </p>
                  {card.market_price && (
                    <p className="mt-1 text-sm font-medium text-green-600">
                      ${card.market_price.toFixed(2)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
