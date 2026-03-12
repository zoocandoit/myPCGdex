"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink, MoreVertical, CheckCircle, XCircle,
  Trash2, DollarSign, TrendingUp, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  type Listing,
  type ListingStatus,
  LISTING_PLATFORM_LABELS,
  LISTING_STATUS_LABELS,
  BUYER_REGION_LABELS,
} from "@/lib/types/trade";
import type { CollectionCard } from "@/lib/types/collection";
import { updateListing, deleteListing } from "@/lib/actions/listings";
import { createSale } from "@/lib/actions/sales";
import { calculateEbayPayout } from "@/lib/utils/pnl";
import { toast } from "sonner";

interface ListingListProps {
  listings: Listing[];
  status: ListingStatus;
  cards: CollectionCard[];
}

export function ListingList({ listings, status, cards }: ListingListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {status === "active"
            ? "활성 리스팅이 없습니다.\n새 리스팅을 등록하세요."
            : `${LISTING_STATUS_LABELS[status]?.ko} 리스팅이 없습니다.`}
        </p>
      </div>
    );
  }

  const cardMap = new Map(cards.map((c) => [c.id, c]));

  async function handleStatusChange(id: string, newStatus: ListingStatus) {
    setLoading(id);
    const result = await updateListing(id, { status: newStatus });
    if (result.success) {
      toast.success("상태가 변경되었습니다");
      router.refresh();
    } else {
      toast.error(result.error ?? "오류가 발생했습니다");
    }
    setLoading(null);
  }

  async function handleDelete(id: string) {
    setLoading(id);
    const result = await deleteListing(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "삭제 중 오류가 발생했습니다");
    }
    setLoading(null);
  }

  return (
    <>
      <div className="space-y-3">
        {listings.map((listing) => {
          const card = cardMap.get(listing.collection_id);
          return (
            <ListingCard
              key={listing.id}
              listing={listing}
              card={card}
              isLoading={loading === listing.id}
              onStatusChange={handleStatusChange}
              onDelete={() => setDeleteTarget(listing)}
              onSettle={() => setSettleTarget(listing)}
            />
          );
        })}
      </div>

      {settleTarget && (
        <SettleDialog
          listing={settleTarget}
          card={settleTarget ? cardMap.get(settleTarget.collection_id) : undefined}
          onClose={() => setSettleTarget(null)}
          onSuccess={() => {
            setSettleTarget(null);
            router.refresh();
          }}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                리스팅 삭제
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {cardMap.get(deleteTarget.collection_id)?.pokemon_name ?? "이 리스팅"}
              </span>
              을(를) 삭제하시겠습니까?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button
                variant="destructive"
                disabled={loading === deleteTarget.id}
                onClick={() => handleDelete(deleteTarget.id)}
              >
                {loading === deleteTarget.id ? "삭제 중..." : "삭제"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function ListingCard({
  listing,
  card,
  isLoading,
  onStatusChange,
  onDelete,
  onSettle,
}: {
  listing: Listing;
  card?: CollectionCard;
  isLoading: boolean;
  onStatusChange: (id: string, status: ListingStatus) => void;
  onDelete: () => void;
  onSettle: () => void;
}) {
  const platformLabel = LISTING_PLATFORM_LABELS[listing.platform]?.ko ?? listing.platform;
  const statusLabel = LISTING_STATUS_LABELS[listing.status]?.ko ?? listing.status;

  const isEbay = listing.platform === "ebay";
  const isUSD = listing.currency === "USD";
  const priceStr =
    listing.currency === "USD"
      ? `$${listing.listed_price.toLocaleString()}`
      : listing.currency === "JPY"
      ? `¥${listing.listed_price.toLocaleString()}`
      : `₩${listing.listed_price.toLocaleString()}`;

  // eBay USD 리스팅의 경우 예상 실수령액 계산
  const ebayEstimate =
    isEbay && isUSD
      ? calculateEbayPayout({
          soldPrice: listing.listed_price,
          shippingCharged: 0,
          shippingCost: 0,
          isInternational: false,
        })
      : null;

  // 예상 수익 (원가 대비)
  const costBasis = card?.purchase_price ?? null;
  const estimatedPnL =
    ebayEstimate && costBasis
      ? ebayEstimate.netPayout - costBasis
      : null;

  const statusVariant: Record<ListingStatus, "default" | "secondary" | "outline" | "destructive"> =
    {
      draft: "secondary",
      active: "default",
      ended: "outline",
      sold: "outline",
      canceled: "destructive",
    };

  return (
    <Card className={isLoading ? "opacity-60 pointer-events-none" : ""}>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{platformLabel}</Badge>
              <Badge variant={statusVariant[listing.status]} className="text-xs">
                {statusLabel}
              </Badge>
              <span className="text-sm font-bold">{priceStr}</span>
            </div>

            {/* Card name */}
            {card && (
              <p className="text-sm font-medium truncate">
                {card.pokemon_name}
                {card.set_name && (
                  <span className="text-muted-foreground font-normal"> — {card.set_name}</span>
                )}
              </p>
            )}

            {/* Title / URL */}
            {listing.title && (
              <p className="text-xs text-muted-foreground truncate">{listing.title}</p>
            )}
            {listing.listing_url && (
              <a
                href={listing.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{listing.listing_url}</span>
              </a>
            )}

            {/* eBay 예상 수익 (active/draft 상태에서만) */}
            {ebayEstimate && (listing.status === "active" || listing.status === "draft") && (
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  예상 수령: <span className="font-medium text-foreground">${ebayEstimate.netPayout.toFixed(2)}</span>
                </span>
                {estimatedPnL !== null && (
                  <span className={estimatedPnL >= 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    ({estimatedPnL >= 0 ? "+" : ""}₩{Math.round(estimatedPnL).toLocaleString()})
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              {new Date(listing.created_at).toLocaleDateString("ko-KR")}
              {listing.started_at &&
                ` · 시작 ${new Date(listing.started_at).toLocaleDateString("ko-KR")}`}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {listing.status === "draft" && (
                <DropdownMenuItem onClick={() => onStatusChange(listing.id, "active")}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  활성화
                </DropdownMenuItem>
              )}
              {(listing.status === "active" || listing.status === "draft") && (
                <DropdownMenuItem onClick={onSettle}>
                  <DollarSign className="mr-2 h-4 w-4 text-blue-500" />
                  판매완료 처리
                </DropdownMenuItem>
              )}
              {listing.status === "active" && (
                <DropdownMenuItem onClick={() => onStatusChange(listing.id, "ended")}>
                  <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                  리스팅 종료
                </DropdownMenuItem>
              )}
              {(listing.status === "draft" || listing.status === "canceled") && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Settle (판매완료 처리) Dialog ────────────────────────────────────────────

function SettleDialog({
  listing,
  card,
  onClose,
  onSuccess,
}: {
  listing: Listing;
  card?: CollectionCard;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEbay = listing.platform === "ebay";
  const isUSD = listing.currency === "USD";

  const [soldPrice, setSoldPrice] = useState(String(listing.listed_price));
  const [shippingCharged, setShippingCharged] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [buyerRegion, setBuyerRegion] = useState<string>("domestic");
  const [loading, setLoading] = useState(false);

  const isInternational = buyerRegion !== "domestic";
  const breakdown =
    isEbay && isUSD
      ? calculateEbayPayout({
          soldPrice: Number(soldPrice) || 0,
          shippingCharged: Number(shippingCharged) || 0,
          shippingCost: Number(shippingCost) || 0,
          isInternational,
        })
      : null;

  // 예상 수익
  const costBasis = card?.purchase_price ?? null;
  const estimatedPnL =
    breakdown && costBasis !== null ? breakdown.netPayout - costBasis : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await createSale({
      listing_id: listing.id,
      sold_price: Number(soldPrice),
      shipping_charged: Number(shippingCharged),
      shipping_cost: Number(shippingCost),
      platform_fee: breakdown?.finalValueFee ?? 0,
      payment_fee: 0,
      international_fee: breakdown?.internationalFee ?? 0,
      tax_withheld: 0,
      buyer_region: buyerRegion as "domestic" | "us" | "jp" | "eu" | "other",
      sold_at: new Date().toISOString(),
    });

    if (result.success) {
      toast.success("판매완료 처리되었습니다");
      onSuccess();
    } else {
      toast.error(result.error ?? "처리 중 오류가 발생했습니다");
    }
    setLoading(false);
  }

  const currency = isUSD ? "$" : listing.currency === "JPY" ? "¥" : "₩";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>판매완료 처리</DialogTitle>
          {card && (
            <p className="text-sm text-muted-foreground">
              {card.pokemon_name} — {LISTING_PLATFORM_LABELS[listing.platform]?.ko}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sold-price">판매가 ({currency})</Label>
              <Input
                id="sold-price"
                type="number"
                min="0"
                step="0.01"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shipping-charged">받은 배송비 ({currency})</Label>
              <Input
                id="shipping-charged"
                type="number"
                min="0"
                step="0.01"
                value={shippingCharged}
                onChange={(e) => setShippingCharged(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="shipping-cost">실 배송비 ({currency})</Label>
              <Input
                id="shipping-cost"
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyer-region">구매자 지역</Label>
              <Select value={buyerRegion} onValueChange={setBuyerRegion}>
                <SelectTrigger id="buyer-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUYER_REGION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label.ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* eBay fee breakdown */}
          {breakdown && (
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <p className="font-semibold text-sm mb-2">eBay 수수료 계산</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">총 매출</span>
                <span>${breakdown.grossRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final Value Fee</span>
                <span className="text-red-500">-${breakdown.finalValueFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">고정 수수료</span>
                <span className="text-red-500">-${breakdown.fixedFee.toFixed(2)}</span>
              </div>
              {breakdown.internationalFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">국제 수수료</span>
                  <span className="text-red-500">-${breakdown.internationalFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">배송비 순</span>
                <span>{breakdown.shippingNet >= 0 ? "+" : ""}{breakdown.shippingNet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1 mt-1">
                <span>실수령액</span>
                <span className="text-primary">${breakdown.netPayout.toFixed(2)}</span>
              </div>
              {estimatedPnL !== null && (
                <div className={`flex justify-between font-bold pt-0.5 ${estimatedPnL >= 0 ? "text-green-600" : "text-red-500"}`}>
                  <span>예상 수익</span>
                  <span>{estimatedPnL >= 0 ? "+" : ""}₩{Math.round(estimatedPnL).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "처리 중..." : "판매완료"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
