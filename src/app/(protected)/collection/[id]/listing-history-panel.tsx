import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type Listing,
  LISTING_PLATFORM_LABELS,
  LISTING_STATUS_LABELS,
  type ListingStatus,
} from "@/lib/types/trade";
import { cn } from "@/lib/utils";

interface ListingHistoryPanelProps {
  listings: Listing[];
  cardId: string;
}

const statusVariant: Record<ListingStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  active: "default",
  ended: "outline",
  sold: "outline",
  canceled: "destructive",
};

export function ListingHistoryPanel({ listings, cardId }: ListingHistoryPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">리스팅 이력</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/listings`}>
            <Plus className="mr-1 h-3 w-3" />
            리스팅 추가
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">이 카드의 리스팅 이력이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) => {
              const platformLabel =
                LISTING_PLATFORM_LABELS[listing.platform]?.ko ?? listing.platform;
              const statusLabel =
                LISTING_STATUS_LABELS[listing.status]?.ko ?? listing.status;
              const priceStr =
                listing.currency === "USD"
                  ? `$${listing.listed_price.toLocaleString()}`
                  : `₩${listing.listed_price.toLocaleString()}`;

              return (
                <div
                  key={listing.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">{platformLabel}</Badge>
                    <Badge variant={statusVariant[listing.status]} className="text-xs">
                      {statusLabel}
                    </Badge>
                  </div>
                  <span className="font-semibold">{priceStr}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {new Date(listing.created_at).toLocaleDateString("ko-KR")}
                  </span>
                  {listing.listing_url && (
                    <a
                      href={listing.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
