"use client";

import { TrendingUp, TrendingDown, Minus, Receipt, DollarSign, BarChart3, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PnLSummary } from "@/lib/actions/sales";

interface PnLSummaryCardsProps {
  summary: PnLSummary;
  from?: string;
  to?: string;
}

export function PnLSummaryCards({ summary, from, to }: PnLSummaryCardsProps) {
  const fromLabel = from ? new Date(from).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "";
  const toLabel = to ? new Date(to).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "현재";
  const periodLabel = from ? `${fromLabel} ~ ${toLabel}` : "전체";

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">기간: {periodLabel}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="판매 건수"
          value={summary.sale_count.toLocaleString()}
          unit="건"
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          title="총 매출"
          value={`₩${Math.round(summary.total_gross_revenue).toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="총 수수료"
          value={`-₩${Math.round(summary.total_fees).toLocaleString()}`}
          icon={<Receipt className="h-4 w-4" />}
          valueClassName="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          title="순 실수령"
          value={`₩${Math.round(summary.total_net_payout).toLocaleString()}`}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          title="총 원가"
          value={`₩${Math.round(summary.total_cost_basis).toLocaleString()}`}
          subtitle={
            summary.total_acquisition_fees > 0
              ? `매입비 +₩${Math.round(summary.total_acquisition_fees).toLocaleString()}`
              : undefined
          }
          icon={<Minus className="h-4 w-4" />}
        />
        <PnLCard
          title="실현 손익"
          value={summary.realized_pnl}
          subtitle={summary.margin_pct !== null ? `${summary.margin_pct.toFixed(1)}% 마진` : undefined}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  unit,
  icon,
  subtitle,
  valueClassName,
}: {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <p className={cn("text-lg font-bold leading-tight", valueClassName)}>
          {value}
          {unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
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
            isZero ? "" : isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
