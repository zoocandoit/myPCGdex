"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { getPriceSnapshots, addPriceSnapshot } from "@/lib/actions/snapshots";
import type { PriceSnapshot } from "@/lib/types/trade";
import { toast } from "sonner";

interface PriceChartProps {
  collectionId: string;
  currentMarketPrice: number | null;
}

const CHART_W = 300;
const CHART_H = 64;
const PADDING = 4;

export function PriceChart({ collectionId, currentMarketPrice }: PriceChartProps) {
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newPrice, setNewPrice] = useState(
    currentMarketPrice ? String(currentMarketPrice) : ""
  );

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    const res = await getPriceSnapshots(collectionId);
    if (res.success && res.data) setSnapshots(res.data);
    setIsLoading(false);
  }, [collectionId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const handleRecord = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("올바른 가격을 입력하세요");
      return;
    }
    setIsSaving(true);
    const res = await addPriceSnapshot(collectionId, price, "manual", "USD");
    if (res.success && res.data) {
      setSnapshots((prev) => [...prev, res.data!]);
      setNewPrice("");
      toast.success(`$${price.toFixed(2)} 기록됨`);
    } else {
      toast.error(res.error ?? "저장 실패");
    }
    setIsSaving(false);
  };

  // Build chart points
  const chartData = snapshots.length > 0
    ? snapshots
    : currentMarketPrice
    ? [{ market_price: currentMarketPrice, captured_at: new Date().toISOString() } as PriceSnapshot]
    : [];

  const prices = chartData.map((s) => s.market_price);
  const minP = prices.length > 0 ? Math.min(...prices) : 0;
  const maxP = prices.length > 0 ? Math.max(...prices) : 1;
  const range = maxP - minP || 1;

  const innerW = CHART_W - PADDING * 2;
  const innerH = CHART_H - PADDING * 2;

  const pointsStr = chartData
    .map((s, i) => {
      const x = PADDING + (i / Math.max(chartData.length - 1, 1)) * innerW;
      const y = PADDING + innerH - ((s.market_price - minP) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const latestSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const firstSnap = snapshots.length > 1 ? snapshots[0] : null;
  const latestPrice = latestSnap?.market_price ?? currentMarketPrice;
  const priceChange = latestSnap && firstSnap ? latestSnap.market_price - firstSnap.market_price : null;
  const changePct =
    priceChange !== null && firstSnap
      ? (priceChange / firstSnap.market_price) * 100
      : null;

  const isUp = priceChange !== null && priceChange > 0;
  const isDown = priceChange !== null && priceChange < 0;
  const trendColor = isUp ? "#22c55e" : isDown ? "#ef4444" : "#94a3b8";

  const lastUpdatedStr = latestSnap
    ? new Date(latestSnap.captured_at).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">시세 이력</CardTitle>
        {lastUpdatedStr && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lastUpdatedStr}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Latest price + trend */}
        {latestPrice !== null && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">${latestPrice.toFixed(2)}</span>
            {changePct !== null && (
              <span
                className={`flex items-center gap-0.5 text-sm font-medium ${
                  isUp ? "text-green-600" : isDown ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {isUp ? (
                  <TrendingUp className="h-4 w-4" />
                ) : isDown ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {isUp ? "+" : ""}
                {changePct.toFixed(1)}%
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({snapshots.length}개 기록)
                </span>
              </span>
            )}
          </div>
        )}

        {/* SVG sparkline */}
        {chartData.length > 1 && !isLoading && (
          <div className="overflow-hidden rounded-md bg-muted/40 py-1">
            <svg
              width="100%"
              height={CHART_H}
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="block"
            >
              {/* Area fill */}
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={trendColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* Filled area */}
              <polygon
                points={`${PADDING},${CHART_H} ${pointsStr} ${CHART_W - PADDING},${CHART_H}`}
                fill="url(#priceGrad)"
              />
              {/* Line */}
              <polyline
                points={pointsStr}
                fill="none"
                stroke={trendColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Min/max labels */}
        {chartData.length > 1 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>최저 ${minP.toFixed(2)}</span>
            <span>최고 ${maxP.toFixed(2)}</span>
          </div>
        )}

        {/* Manual price record */}
        <div className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="현재가 기록"
              className="pl-6 h-8 text-sm"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecord()}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3"
            onClick={handleRecord}
            disabled={isSaving || !newPrice}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
            <span className="ml-1 text-xs">기록</span>
          </Button>
        </div>

        {isLoading && (
          <p className="text-xs text-muted-foreground">불러오는 중…</p>
        )}
        {!isLoading && snapshots.length === 0 && (
          <p className="text-xs text-muted-foreground">
            아직 가격 기록이 없습니다. 현재가를 입력해 첫 기록을 남기세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
