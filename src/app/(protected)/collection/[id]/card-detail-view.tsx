"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Edit3,
  Loader2,
  Save,
  X,
  ImageIcon,
} from "lucide-react";
import { CollectionCard, CONDITION_LABELS } from "@/lib/types/collection";
import { deleteCard, updateCard } from "@/lib/actions/collection";

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

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "mint":
        return tCondition("mint");
      case "near_mint":
        return tCondition("nearMint");
      case "lightly_played":
        return tCondition("lightlyPlayed");
      case "moderately_played":
        return tCondition("moderatelyPlayed");
      case "heavily_played":
        return tCondition("heavilyPlayed");
      default:
        return condition;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return t("noPrice");
    return `$${price.toFixed(2)}`;
  };

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
              {card.tcg_image_url ? (
                <Image
                  src={card.tcg_image_url}
                  alt={card.pokemon_name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
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
                <div className="col-span-2">
                  <p className="text-muted-foreground">{t("addedOn")}</p>
                  <p className="font-medium">{formatDate(card.collected_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
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
            <p className="text-sm text-muted-foreground">
              {card.notes || "-"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        {card.tcg_card_id && (
          <Button variant="outline" asChild className="flex-1">
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
        <Button
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("delete")}
        </Button>
      </div>

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
              {t("notes") === "메모" ? "취소" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
