"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Edit3,
  Loader2,
  Save,
  X,
  Tag,
} from "lucide-react";
import { CollectionCard } from "@/lib/types/collection";
import { deleteCard, updateCard } from "@/lib/actions/collection";
import { createListing } from "@/lib/actions/listings";
import { CardImage } from "@/components/card-image";
import { PriceChart } from "./price-chart";
import { toast } from "sonner";

interface CardDetailViewProps {
  card: CollectionCard;
}

export function CardDetailView({ card }: CardDetailViewProps) {
  const t = useTranslations("cardDetail");
  const tCondition = useTranslations("condition");
  const router = useRouter();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(card.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Listing quick-create
  const [isListingOpen, setIsListingOpen] = useState(false);
  const [listingPlatform, setListingPlatform] = useState<"ebay" | "bunjang" | "danggeun" | "other">("ebay");
  const [listingPrice, setListingPrice] = useState(
    card.market_price ? String(card.market_price.toFixed(2)) : ""
  );
  const [listingCurrency, setListingCurrency] = useState<"KRW" | "USD" | "JPY">("USD");
  const [listingUrl, setListingUrl] = useState("");
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCard(card.id);
    if (result.success) {
      router.push("/collection");
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const result = await updateCard(card.id, { notes });
    if (result.success) {
      setIsEditingNotes(false);
    }
    setIsSavingNotes(false);
  };

  const handleCreateListing = async () => {
    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("올바른 가격을 입력하세요");
      return;
    }
    setIsCreatingListing(true);
    const res = await createListing({
      collection_id: card.id,
      platform: listingPlatform,
      listed_price: price,
      currency: listingCurrency,
      status: "draft",
      quantity: card.quantity,
      listing_url: listingUrl.trim() || undefined,
      title: card.pokemon_name,
    });
    if (res.success) {
      toast.success("리스팅이 초안으로 생성되었습니다");
      setIsListingOpen(false);
      router.push("/listings");
    } else {
      toast.error(res.error ?? "리스팅 생성 실패");
    }
    setIsCreatingListing(false);
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "mint": return tCondition("mint");
      case "near_mint": return tCondition("nearMint");
      case "lightly_played": return tCondition("lightlyPlayed");
      case "moderately_played": return tCondition("moderatelyPlayed");
      case "heavily_played": return tCondition("heavilyPlayed");
      default: return condition;
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatPrice = (price: number | null) =>
    price === null || price === undefined ? t("noPrice") : `$${price.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/collection">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("title")}
        </Link>
      </Button>

      {/* Card Image & Basic Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Image */}
        <Card>
          <CardContent className="p-4">
            <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted">
              <CardImage
                tcgImageUrl={card.tcg_image_url}
                storagePath={card.front_image_path}
                alt={card.pokemon_name}
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{card.pokemon_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("set")}</p>
                  <p className="font-medium">{card.set_name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("number")}</p>
                  <p className="font-medium">{card.card_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("rarity")}</p>
                  <p className="font-medium">{card.rarity || "-"}</p>
                </div>
                {card.artist && (
                  <div>
                    <p className="text-muted-foreground">{t("artist")}</p>
                    <p className="font-medium">{card.artist}</p>
                  </div>
                )}
                {card.is_graded && (
                  <>
                    <div>
                      <p className="text-muted-foreground">등급사</p>
                      <p className="font-medium">{card.grading_company ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">등급</p>
                      <p className="font-bold text-yellow-600">{card.grade ?? "-"}</p>
                    </div>
                    {card.cert_number && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">인증번호</p>
                        <p className="font-medium font-mono">{card.cert_number}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Price Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("marketPrice")}</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPrice(card.market_price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("purchasePrice")}</p>
                  <p className="text-xl font-bold">
                    {card.purchase_price ? formatPrice(card.purchase_price) : "-"}
                  </p>
                </div>
              </div>
              {card.market_price && card.purchase_price && (
                <div className="mt-2 text-sm">
                  <span
                    className={
                      card.market_price >= card.purchase_price
                        ? "text-green-600 font-medium"
                        : "text-red-500 font-medium"
                    }
                  >
                    {card.market_price >= card.purchase_price ? "+" : ""}
                    {((card.market_price - card.purchase_price) / card.purchase_price * 100).toFixed(1)}%
                    미실현 손익
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collection Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("condition")}</p>
                  <p className="font-medium">{getConditionLabel(card.condition)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("quantity")}</p>
                  <p className="font-medium">{card.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("addedOn")}</p>
                  <p className="font-medium">{formatDate(card.collected_at)}</p>
                </div>
                {card.acquisition_source && (
                  <div>
                    <p className="text-muted-foreground">{t("acquisitionSource")}</p>
                    <p className="font-medium">{card.acquisition_source}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Price Chart */}
      <PriceChart collectionId={card.id} currentMarketPrice={card.market_price} />

      {/* Notes Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{t("notes")}</CardTitle>
          {!isEditingNotes && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              {t("editNotes")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notes")}
                rows={4}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
                  {isSavingNotes ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t("saveNotes")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingNotes(false);
                    setNotes(card.notes || "");
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{card.notes || "-"}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {/* 리스팅 생성 */}
        <Button variant="outline" className="flex-1" onClick={() => setIsListingOpen(true)}>
          <Tag className="mr-2 h-4 w-4" />
          리스팅 생성
        </Button>

        {card.tcg_card_id && (
          <Button variant="outline" className="flex-1" asChild>
            <a
              href={`https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.pokemon_name)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("viewOnTcgPlayer")}
            </a>
          </Button>
        )}
        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t("delete")}
        </Button>
      </div>

      {/* Listing Quick-Create Dialog */}
      <Dialog open={isListingOpen} onOpenChange={setIsListingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>리스팅 생성 — {card.pokemon_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>플랫폼</Label>
                <Select
                  value={listingPlatform}
                  onValueChange={(v) => setListingPlatform(v as typeof listingPlatform)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ebay">eBay</SelectItem>
                    <SelectItem value="bunjang">번개장터</SelectItem>
                    <SelectItem value="danggeun">당근마켓</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>통화</Label>
                <Select
                  value={listingCurrency}
                  onValueChange={(v) => setListingCurrency(v as typeof listingCurrency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="KRW">KRW (₩)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>판매 희망가</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>리스팅 URL (선택)</Label>
              <Input
                placeholder="https://…"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsListingOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateListing} disabled={isCreatingListing || !listingPrice}>
              {isCreatingListing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              초안 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{t("deleteConfirm")}</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
