"use client";

import { TrendingUp, TrendingDown, Minus, Package, DollarSign, BarChart3, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  totalCards: number;
  totalValue: number;
  totalCostBasis: number;
  unrealizedPnL: number;
  thisMonthPnL: number;
  thisMonthSales: number;
}

export function DashboardStats({
  totalCards,
  totalValue,
  totalCostBasis,
  unrealizedPnL,
  thisMonthPnL,
  thisMonthSales,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <StatCard
        title="보유 카드"
        value={totalCards.toLocaleString()}
        unit="장"
        icon={<Package className="h-4 w-4" />}
      />
      <StatCard
        title="보유 가치"
        value={`₩${Math.round(totalValue).toLocaleString()}`}
        icon={<DollarSign className="h-4 w-4" />}
        className="col-span-1 md:col-span-1"
      />
      <StatCard
        title="총 원가"
        value={`₩${Math.round(totalCostBasis).toLocaleString()}`}
        icon={<BarChart3 className="h-4 w-4" />}
      />
      <PnLCard
        title="미실현 손익"
        value={unrealizedPnL}
        subtitle="시세 기반"
      />
      <PnLCard
        title="이번 달 수익"
        value={thisMonthPnL}
        subtitle={`판매 ${thisMonthSales}건`}
      />
      <StatCard
        title="이번 달 판매"
        value={thisMonthSales.toLocaleString()}
        unit="건"
        icon={<ShoppingBag className="h-4 w-4" />}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  unit,
  icon,
  className,
}: {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <p className="text-lg font-bold leading-tight">
          {value}
          {unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function PnLCard({ title, value, subtitle }: { title: string; value: number; subtitle?: string }) {
  const isPositive = value > 0;
  const isZero = value === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {isZero ? (
          <Minus className="h-4 w-4 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <p
          className={cn(
            "text-lg font-bold leading-tight",
            isZero
              ? "text-foreground"
              : isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {isPositive ? "+" : ""}
          {`₩${Math.round(value).toLocaleString()}`}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
