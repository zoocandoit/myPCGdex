"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  Sparkles,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { addCardManual } from "@/lib/actions/collection";
import { uploadCardImage } from "@/lib/actions/storage";
import type { CardCondition, CardLanguage } from "@/lib/types/collection";
import type { VisionResponse } from "@/lib/types/vision";
import { toast } from "sonner";

const CONDITION_OPTIONS: { value: CardCondition; label: string }[] = [
  { value: "mint", label: "민트 (Mint)" },
  { value: "near_mint", label: "니어민트 (Near Mint)" },
  { value: "lightly_played", label: "LP (Lightly Played)" },
  { value: "moderately_played", label: "MP (Moderately Played)" },
  { value: "heavily_played", label: "HP (Heavily Played)" },
];

const LANGUAGE_OPTIONS: { value: CardLanguage; label: string }[] = [
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

interface ConfirmSaveFormProps {
  /** AI-extracted fields from vision analysis */
  visionResult: VisionResponse;
  /** Raw base64 data URL of front image (uploaded on save) */
  frontImageData?: string;
  /** MIME type of the front image */
  frontMimeType?: string;
  /** Base64 preview of the front image */
  frontImagePreview?: string;
  /** Called when user wants to go back and retake */
  onRetake: () => void;
}

export function ConfirmSaveForm({
  visionResult,
  frontImageData,
  frontMimeType,
  frontImagePreview,
  onRetake,
}: ConfirmSaveFormProps) {
  const router = useRouter();

  // --- editable fields (pre-filled from AI) ---
  const [pokemonName, setPokemonName] = useState(visionResult.pokemon_name);
  const [cardNumber, setCardNumber] = useState(visionResult.card_number);
  const [setId, setSetId] = useState(visionResult.set_id ?? "");
  const [language, setLanguage] = useState<CardLanguage>(visionResult.language);
  const [rarity, setRarity] = useState("");

  // --- collection metadata ---
  const [condition, setCondition] = useState<CardCondition>("near_mint");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");

  // --- UI state ---
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!pokemonName.trim() || !cardNumber.trim()) {
      setError("포켓몬 이름과 카드 번호를 입력하세요");
      return;
    }

    setIsSaving(true);
    setError(null);

    // Upload front image now (deferred from scan step)
    let uploadedImagePath: string | undefined;
    if (frontImageData && frontMimeType) {
      const uploadResult = await uploadCardImage(frontImageData, frontMimeType);
      if (uploadResult.success && uploadResult.path) {
        uploadedImagePath = uploadResult.path;
      }
    }

    const result = await addCardManual({
      pokemon_name: pokemonName.trim(),
      card_number: cardNumber.trim(),
      set_id: setId.trim() || undefined,
      language,
      rarity: rarity.trim() || undefined,
      condition,
      quantity,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      notes: notes.trim() || undefined,
      front_image_path: uploadedImagePath,
    });

    if (result.success) {
      setIsSaved(true);
      toast.success("컬렉션에 추가되었습니다");
      setTimeout(() => router.push("/collection"), 1000);
    } else {
      setError(result.error ?? "저장 중 오류가 발생했습니다");
    }

    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Header card: image + AI badge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 판독 결과 확인
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              수정 후 저장 가능
            </Badge>
          </CardTitle>
        </CardHeader>
        {frontImagePreview && (
          <CardContent className="pt-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frontImagePreview}
              alt="card front"
              className="mx-auto h-32 w-auto rounded-md object-contain"
            />
          </CardContent>
        )}
      </Card>

      {/* AI-extracted card info (all editable) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-medium">
            카드 정보 (AI 판독)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pokemon-name">
              포켓몬 이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pokemon-name"
              value={pokemonName}
              onChange={(e) => setPokemonName(e.target.value)}
              placeholder="예: 피카츄"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="card-number">
                카드 번호 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="예: 025/165"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-id">세트 코드</Label>
              <Input
                id="set-id"
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                placeholder="예: sv2a"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>언어</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as CardLanguage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rarity">레어도</Label>
              <Input
                id="rarity"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                placeholder="예: Rare Holo"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-medium">
            컬렉션 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>컨디션</Label>
              <Select
                value={condition}
                onValueChange={(v) => setCondition(v as CardCondition)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">수량</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase-price">매입가 (₩)</Label>
            <Input
              id="purchase-price"
              type="number"
              min="0"
              placeholder="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="보관 상태, 특이사항 등"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetake}
          disabled={isSaving || isSaved}
        >
          <RotateCcw className="mr-1 h-4 w-4" />
          다시 찍기
        </Button>

        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={isSaving || isSaved || !pokemonName.trim() || !cardNumber.trim()}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : isSaved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              저장 완료!
            </>
          ) : (
            "컬렉션에 추가"
          )}
        </Button>
      </div>
    </div>
  );
}
