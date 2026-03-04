"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { addCardManual } from "@/lib/actions/collection";
import { uploadCardImage } from "@/lib/actions/storage";
import type { CardCondition, CardLanguage } from "@/lib/types/collection";

interface ManualEntryFormProps {
  frontImage?: string | null;
  backImage?: string | null;
  frontMimeType?: string;
  backMimeType?: string;
  onBack: () => void;
}

export function ManualEntryForm({
  frontImage,
  backImage,
  frontMimeType = "image/jpeg",
  backMimeType = "image/jpeg",
  onBack,
}: ManualEntryFormProps) {
  const t = useTranslations("manualEntry");
  const tCondition = useTranslations("condition");
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [pokemonName, setPokemonName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [setId, setSetId] = useState("");
  const [language, setLanguage] = useState<CardLanguage>("ko");
  const [rarity, setRarity] = useState("");
  const [condition, setCondition] = useState<CardCondition>("near_mint");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!pokemonName.trim() || !cardNumber.trim()) {
      setError(t("errors.saveFailed"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload images if available
      let frontImagePath: string | undefined;
      let backImagePath: string | undefined;

      if (frontImage) {
        const frontResult = await uploadCardImage(frontImage, frontMimeType);
        if (frontResult.success && frontResult.path) {
          frontImagePath = frontResult.path;
        }
      }

      if (backImage) {
        const backResult = await uploadCardImage(backImage, backMimeType);
        if (backResult.success && backResult.path) {
          backImagePath = backResult.path;
        }
      }

      // Add to collection
      const result = await addCardManual({
        pokemon_name: pokemonName.trim(),
        card_number: cardNumber.trim(),
        set_id: setId.trim() || undefined,
        language,
        rarity: rarity.trim() || undefined,
        condition,
        quantity,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        acquisition_source: acquisitionSource.trim() || undefined,
        notes: notes.trim() || undefined,
        front_image_path: frontImagePath,
        back_image_path: backImagePath,
      });

      if (result.success) {
        router.push("/collection");
      } else {
        setError(t("errors.saveFailed"));
      }
    } catch (err) {
      console.error("[ManualEntry Error]", err);
      setError(t("errors.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("back") || "뒤로"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Preview */}
          {(frontImage || backImage) && (
            <div className="grid grid-cols-2 gap-3">
              {frontImage && (
                <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frontImage}
                    alt="Front"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {backImage && (
                <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={backImage}
                    alt="Back"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pokemonName">{t("pokemonName")} *</Label>
              <Input
                id="pokemonName"
                value={pokemonName}
                onChange={(e) => setPokemonName(e.target.value)}
                placeholder={t("pokemonNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">{t("cardNumber")} *</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="001/100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setId">{t("setId")}</Label>
              <Input
                id="setId"
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                placeholder="sv8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t("language")}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as CardLanguage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rarity">{t("rarity")}</Label>
              <Input
                id="rarity"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                placeholder={t("rarityPlaceholder")}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t pt-4">
            <h4 className="mb-4 font-medium">{t("collectionInfo")}</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="condition">{t("condition")}</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as CardCondition)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="quantity">{t("quantity")}</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">{t("purchasePrice")}</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisitionSource">{t("acquisitionSource")}</Label>
                <Input
                  id="acquisitionSource"
                  value={acquisitionSource}
                  onChange={(e) => setAcquisitionSource(e.target.value)}
                  placeholder={t("acquisitionSourcePlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !pokemonName.trim() || !cardNumber.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t("saveToCollection")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
