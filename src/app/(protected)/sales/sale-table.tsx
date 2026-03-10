"use client";

import {
  LISTING_PLATFORM_LABELS,
  BUYER_REGION_LABELS,
  type Listing,
  type Sale,
} from "@/lib/types/trade";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SaleTableProps {
  sales: Sale[];
  listingMap: Map<string, Listing>;
}

export function SaleTable({ sales, listingMap }: SaleTableProps) {
  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">이 기간에 판매 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 px-3 text-left font-medium">날짜</th>
              <th className="py-2 px-3 text-left font-medium">플랫폼</th>
              <th className="py-2 px-3 text-right font-medium">판매가</th>
              <th className="py-2 px-3 text-right font-medium">수수료</th>
              <th className="py-2 px-3 text-right font-medium">배송비</th>
              <th className="py-2 px-3 text-right font-medium">실수령</th>
              <th className="py-2 px-3 text-left font-medium">지역</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const listing = listingMap.get(sale.listing_id);
              const totalFees =
                sale.platform_fee + sale.payment_fee + sale.international_fee + sale.tax_withheld;
              const currency = listing?.currency === "USD" ? "$" : "₩";
              const fmt = (n: number) =>
                listing?.currency === "USD"
                  ? `$${n.toFixed(2)}`
                  : `₩${Math.round(n).toLocaleString()}`;

              return (
                <tr key={sale.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 text-muted-foreground">
                    {new Date(sale.sold_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="py-2 px-3">
                    {listing ? (
                      <Badge variant="outline" className="text-xs">
                        {LISTING_PLATFORM_LABELS[listing.platform]?.ko ?? listing.platform}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{fmt(sale.sold_price)}</td>
                  <td className="py-2 px-3 text-right text-orange-600 dark:text-orange-400">
                    {totalFees > 0 ? `-${fmt(totalFees)}` : "-"}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">
                    {sale.shipping_cost > 0 ? `-${fmt(sale.shipping_cost)}` : "-"}
                  </td>
                  <td
                    className={cn(
                      "py-2 px-3 text-right font-bold",
                      (sale.net_payout ?? 0) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {sale.net_payout !== null ? fmt(sale.net_payout) : "-"}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {sale.buyer_region
                      ? BUYER_REGION_LABELS[sale.buyer_region]?.ko
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sales.map((sale) => {
          const listing = listingMap.get(sale.listing_id);
          const totalFees =
            sale.platform_fee + sale.payment_fee + sale.international_fee + sale.tax_withheld;
          const fmt = (n: number) =>
            listing?.currency === "USD"
              ? `$${n.toFixed(2)}`
              : `₩${Math.round(n).toLocaleString()}`;

          return (
            <Card key={sale.id}>
              <CardContent className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {listing && (
                      <Badge variant="outline" className="text-xs">
                        {LISTING_PLATFORM_LABELS[listing.platform]?.ko ?? listing.platform}
                      </Badge>
                    )}
                    {sale.buyer_region && (
                      <span className="text-xs text-muted-foreground">
                        {BUYER_REGION_LABELS[sale.buyer_region]?.ko}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(sale.sold_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">판매가</p>
                    <p className="font-medium">{fmt(sale.sold_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">수수료</p>
                    <p className="text-orange-600 dark:text-orange-400">
                      {totalFees > 0 ? `-${fmt(totalFees)}` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">실수령</p>
                    <p
                      className={cn(
                        "font-bold",
                        (sale.net_payout ?? 0) >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {sale.net_payout !== null ? fmt(sale.net_payout) : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
