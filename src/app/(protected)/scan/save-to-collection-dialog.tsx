"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, Package } from "lucide-react";
import { ScoredCard, formatPrice } from "@/lib/tcg/hooks";
import { getCardMarketPrice } from "@/lib/tcg/client";
import { addCardVision } from "@/lib/actions/collection";
import { CardCondition, CONDITION_LABELS } from "@/lib/types/collection";

interface SaveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ScoredCard | null;
  visionLanguage: string;
  uploadedImagePath?: string;
}

export function SaveToCollectionDialog({
  open,
  onOpenChange,
  card,
  visionLanguage,
  uploadedImagePath,
}: SaveToCollectionDialogProps) {
  const t = useTranslations("saveCard");
  const tCondition = useTranslations("condition");
  const router = useRouter();

  const [condition, setCondition] = useState<CardCondition>("near_mint");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (!card) return;

    setIsSaving(true);

    try {
      const marketPrice = getCardMarketPrice(card);

      const result = await addCardVision({
        pokemon_name: card.name,
        card_number: card.number,
        set_id: card.set.id,
        language: (visionLanguage as "ko" | "ja" | "en") || "ko",
        rarity: card.rarity || undefined,
        tcg_card_id: card.id,
        set_name: card.set.name,
        tcg_image_url: card.images.large || card.images.small,
        market_price: marketPrice || undefined,
        artist: card.artist || undefined,
        condition,
        quantity,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        front_image_path: uploadedImagePath || undefined,
      });

      if (result.success) {
        setIsSaved(true);
        setTimeout(() => {
          onOpenChange(false);
          router.push("/collection");
        }, 1000);
      }
    } catch (error) {
      console.error("[Save Error]", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setCondition("near_mint");
      setQuantity(1);
      setPurchasePrice("");
      setIsSaved(false);
      onOpenChange(false);
    }
  };

  if (!card) return null;

  const marketPrice = getCardMarketPrice(card);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card Preview */}
          <div className="flex gap-4">
            <div className="relative h-32 w-auto aspect-[2.5/3.5] flex-shrink-0">
              <Image
                src={card.images.small}
                alt={card.name}
                fill
                className="rounded-md object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="font-semibold">{card.name}</h3>
              <p className="text-sm text-muted-foreground">{card.set.name}</p>
              <p className="text-sm text-muted-foreground">
                #{card.number} · {card.rarity || "-"}
              </p>
              {marketPrice && (
                <p className="mt-1 text-sm font-medium text-green-600">
                  {formatPrice(marketPrice)}
                </p>
              )}
            </div>
          </div>

          {/* Condition Select */}
          <div className="space-y-2">
            <Label htmlFor="condition">{t("condition")}</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as CardCondition)}>
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mint">{tCondition("mint")}</SelectItem>
                <SelectItem value="near_mint">{tCondition("nearMint")}</SelectItem>
                <SelectItem value="lightly_played">{tCondition("lightlyPlayed")}</SelectItem>
                <SelectItem value="moderately_played">{tCondition("moderatelyPlayed")}</SelectItem>
                <SelectItem value="heavily_played">{tCondition("heavilyPlayed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{t("quantity")}</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Purchase Price (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="price">{t("purchasePrice")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("priceOptional")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isSaved}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : isSaved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("saved")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
