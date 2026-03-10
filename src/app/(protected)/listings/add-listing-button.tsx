"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createListing } from "@/lib/actions/listings";
import {
  LISTING_PLATFORM_LABELS,
  type ListingPlatform,
  type Currency,
} from "@/lib/types/trade";
import type { CollectionCard } from "@/lib/types/collection";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AddListingButtonProps {
  cards: CollectionCard[];
}

export function AddListingButton({ cards }: AddListingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [collectionId, setCollectionId] = useState("");
  const [platform, setPlatform] = useState<ListingPlatform>("ebay");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [listedPrice, setListedPrice] = useState("");
  const [title, setTitle] = useState("");
  const [listingUrl, setListingUrl] = useState("");

  function reset() {
    setCollectionId("");
    setPlatform("ebay");
    setCurrency("KRW");
    setListedPrice("");
    setTitle("");
    setListingUrl("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!collectionId) {
      toast.error("카드를 선택하세요");
      return;
    }
    if (!listedPrice) {
      toast.error("판매가를 입력하세요");
      return;
    }

    setLoading(true);
    const result = await createListing({
      collection_id: collectionId,
      platform,
      currency,
      listed_price: Number(listedPrice),
      title: title || undefined,
      listing_url: listingUrl || undefined,
      status: "draft",
    });

    if (result.success) {
      toast.success("리스팅이 등록되었습니다");
      setOpen(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error ?? "등록 중 오류가 발생했습니다");
    }
    setLoading(false);
  }

  const currencySymbol = currency === "USD" ? "$" : currency === "JPY" ? "¥" : "₩";

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        리스팅 등록
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>리스팅 등록</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card select */}
            <div className="space-y-1.5">
              <Label htmlFor="card">카드 선택</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger id="card">
                  <SelectValue placeholder="인벤토리에서 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {cards.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      컬렉션에 카드가 없습니다
                    </SelectItem>
                  ) : (
                    cards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.pokemon_name}
                        {c.set_name ? ` — ${c.set_name}` : ""}
                        {c.card_number ? ` #${c.card_number}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Platform */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>플랫폼</Label>
                <Select
                  value={platform}
                  onValueChange={(v) => setPlatform(v as ListingPlatform)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LISTING_PLATFORM_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label.ko}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>통화</Label>
                <Select
                  value={currency}
                  onValueChange={(v) => setCurrency(v as Currency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KRW">KRW (₩)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="price">판매가 ({currencySymbol})</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                required
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">리스팅 제목 (선택)</Label>
              <Input
                id="title"
                placeholder="eBay 제목 등"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <Label htmlFor="url">리스팅 URL (선택)</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "등록 중..." : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
