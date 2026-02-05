"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { addCardManual } from "@/lib/actions/collection";
import {
  type ManualCardEntry,
  CardCondition,
  CardLanguage,
  CONDITION_LABELS,
  LANGUAGE_LABELS,
} from "@/lib/types/collection";

interface ManualEntryFormProps {
  // Pre-filled data from uploaded images (optional)
  frontImagePath?: string;
  backImagePath?: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export function ManualEntryForm({
  frontImagePath,
  backImagePath,
  onBack,
  onSuccess,
}: ManualEntryFormProps) {
  const t = useTranslations("manualEntry");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [pokemonName, setPokemonName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [setId, setSetId] = useState("");
  const [language, setLanguage] = useState<CardLanguage>("ko");
  const [rarity, setRarity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [condition, setCondition] = useState<CardCondition>("near_mint");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const entry: ManualCardEntry = {
      pokemon_name: pokemonName.trim(),
      card_number: cardNumber.trim(),
      set_id: setId.trim() || undefined,
      language,
      rarity: rarity.trim() || undefined,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      condition,
      quantity: parseInt(quantity) || 1,
      notes: notes.trim() || undefined,
      front_image_path: frontImagePath,
      back_image_path: backImagePath,
    };

    const result = await addCardManual(entry);

    if (result.success) {
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/collection");
      }
    } else {
      setError(t(`errors.${result.error}`) || t("errors.saveFailed"));
    }

    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle>{t("title")}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div className="space-y-2">
            <Label htmlFor="pokemonName">{t("pokemonName")} *</Label>
            <Input
              id="pokemonName"
              value={pokemonName}
              onChange={(e) => setPokemonName(e.target.value)}
              placeholder={t("pokemonNamePlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">{t("cardNumber")} *</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="025/165"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setId">{t("setId")}</Label>
              <Input
                id="setId"
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                placeholder="sv2a"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t("language")}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as CardLanguage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGE_LABELS).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {labels.ko}
                    </SelectItem>
                  ))}
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

          {/* Collection Info */}
          <div className="border-t pt-4">
            <h3 className="mb-3 font-medium">{t("collectionInfo")}</h3>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="quantity">{t("quantity")}</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="condition">{t("condition")}</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as CardCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABELS).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {labels.ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isSubmitting || !pokemonName || !cardNumber} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("saveToCollection")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
