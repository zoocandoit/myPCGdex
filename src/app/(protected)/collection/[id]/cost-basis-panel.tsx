import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateCostBasis, calculateUnrealizedPnL } from "@/lib/utils/pnl";
import { cn } from "@/lib/utils";
import type { CollectionCard } from "@/lib/types/collection";

interface CostBasisPanelProps {
  card: CollectionCard;
  /** fees_cost from acquisitions (sum of all confirmed acquisitions for this card) */
  acquisitionFees: number;
}

export function CostBasisPanel({ card, acquisitionFees }: CostBasisPanelProps) {
  const costBasis = calculateCostBasis({
    purchase_price: card.purchase_price,
    fees_cost: acquisitionFees,
  });

  const unrealizedPnL = calculateUnrealizedPnL({
    market_price: card.market_price,
    cost_basis: costBasis.total,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">원가 구성 / 미실현 손익</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cost breakdown */}
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">매입가</span>
            <span className="font-medium">
              {card.purchase_price !== null
                ? `₩${card.purchase_price.toLocaleString()}`
                : "-"}
            </span>
          </div>
          {acquisitionFees > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">부대비용 (배송/그레이딩 등)</span>
              <span className="font-medium">+₩{acquisitionFees.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1.5">
            <span>총 원가</span>
            <span>₩{Math.round(costBasis.total).toLocaleString()}</span>
          </div>
        </div>

        {/* Unrealized PnL */}
        {unrealizedPnL !== null ? (
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">현재 시세</span>
              <span className="font-medium">₩{Math.round(unrealizedPnL.market_price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1.5">
              <span>미실현 손익</span>
              <div className="flex items-center gap-1.5">
                {unrealizedPnL.unrealized_pnl > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : unrealizedPnL.unrealized_pnl < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    unrealizedPnL.unrealized_pnl > 0
                      ? "text-green-600 dark:text-green-400"
                      : unrealizedPnL.unrealized_pnl < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  )}
                >
                  {unrealizedPnL.unrealized_pnl > 0 ? "+" : ""}
                  ₩{Math.round(unrealizedPnL.unrealized_pnl).toLocaleString()}
                  {unrealizedPnL.unrealized_pnl_pct !== null && (
                    <span className="ml-1 text-xs font-normal">
                      ({unrealizedPnL.unrealized_pnl_pct > 0 ? "+" : ""}
                      {unrealizedPnL.unrealized_pnl_pct.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">시세 정보가 없어 미실현 손익을 계산할 수 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
