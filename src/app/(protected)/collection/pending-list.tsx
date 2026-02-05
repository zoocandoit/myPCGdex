"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Sparkles, Loader2, AlertCircle, ImageIcon } from "lucide-react";
import {
  getPendingCards,
  deletePendingCard,
  updatePendingStatus,
} from "@/lib/actions/pending";
import type { PendingCard } from "@/lib/types/pending";
import {
  getVisionUsage,
  checkAndIncrementVisionUsage,
  type VisionUsageResult,
} from "@/lib/actions/vision-usage";
import { addCardVision } from "@/lib/actions/collection";
import { createClient } from "@/lib/supabase/client";

export function PendingList() {
  const t = useTranslations("collection");
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [visionUsage, setVisionUsage] = useState<VisionUsageResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cardsResult, usageResult] = await Promise.all([
      getPendingCards(),
      getVisionUsage(),
    ]);

    if (cardsResult.success && cardsResult.data) {
      setPendingCards(cardsResult.data);
    }
    setVisionUsage(usageResult);
    setIsLoading(false);
  }

  const handleAnalyze = useCallback(async (card: PendingCard) => {
    setAnalyzingId(card.id);

    try {
      // Check and increment usage
      const usageResult = await checkAndIncrementVisionUsage();
      setVisionUsage(usageResult);

      if (!usageResult.canUseVision) {
        setAnalyzingId(null);
        return;
      }

      // Update status to processing
      await updatePendingStatus(card.id, "processing");

      // Get signed URL for the image
      const supabase = createClient();
      const { data: signedUrlData } = await supabase.storage
        .from("card-images")
        .createSignedUrl(card.front_image_path, 60);

      if (!signedUrlData?.signedUrl) {
        throw new Error("Failed to get signed URL");
      }

      // Call Vision API
      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: signedUrlData.signedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const visionData = await response.json();

      // Add to collection
      const collectionResult = await addCardVision({
        pokemon_name: visionData.pokemon_name,
        card_number: visionData.card_number,
        set_id: visionData.set_id || undefined,
        language: visionData.language,
        condition: "near_mint",
        quantity: 1,
        front_image_path: card.front_image_path,
        back_image_path: card.back_image_path || undefined,
      });

      if (!collectionResult.success) {
        throw new Error("Failed to save to collection");
      }

      // Delete from pending
      await deletePendingCard(card.id);

      // Update local state
      setPendingCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (error) {
      console.error("[Analyze Pending Error]", error);
      await updatePendingStatus(
        card.id,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      // Reload to show failed status
      loadData();
    } finally {
      setAnalyzingId(null);
    }
  }, []);

  const handleDelete = useCallback(async (cardId: string) => {
    setDeletingId(cardId);

    try {
      const result = await deletePendingCard(cardId);
      if (result.success) {
        setPendingCards((prev) => prev.filter((c) => c.id !== cardId));
      }
    } catch (error) {
      console.error("[Delete Pending Error]", error);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingCards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("noPendingCards")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Usage Info */}
      {visionUsage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            {t("remainingAnalyses", { count: visionUsage.remainingToday })}
          </span>
        </div>
      )}

      {/* Pending Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingCards.map((card) => (
          <Card key={card.id}>
            <CardContent className="p-4">
              {/* Card thumbnail placeholder */}
              <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-md bg-muted">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>

              {/* Metadata */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(card.queued_at)}</span>
                </div>
                {card.status === "failed" && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {t("status.failed")}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={
                    !visionUsage?.canUseVision ||
                    analyzingId === card.id ||
                    deletingId === card.id
                  }
                  onClick={() => handleAnalyze(card)}
                >
                  {analyzingId === card.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  {t("analyzeNow")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingId === card.id || analyzingId === card.id}
                  onClick={() => handleDelete(card.id)}
                >
                  {deletingId === card.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
