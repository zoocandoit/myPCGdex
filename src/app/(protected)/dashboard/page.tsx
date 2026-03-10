import { getCollectionStats } from "@/lib/actions/collection";
import { getAcquisitions } from "@/lib/actions/deals";
import { getListings } from "@/lib/actions/listings";
import { getSales, getPnLSummary } from "@/lib/actions/sales";
import { DashboardStats } from "./dashboard-stats";
import { RecentActivity } from "./recent-activity";

export const metadata = {
  title: "Dashboard | myPCGdex",
};

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [
    collectionStats,
    candidateDeals,
    activeListings,
    recentSales,
    pnlSummary,
  ] = await Promise.all([
    getCollectionStats(),
    getAcquisitions({ status: "candidate", limit: 5 }),
    getListings({ status: "active", limit: 5 }),
    getSales({ limit: 5 }),
    getPnLSummary({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    }),
  ]);

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <DashboardStats
        totalCards={collectionStats.totalCards}
        totalValue={collectionStats.totalValue}
        totalCostBasis={pnlSummary.data?.total_cost_basis ?? 0}
        unrealizedPnL={collectionStats.totalValue - (pnlSummary.data?.total_cost_basis ?? 0)}
        thisMonthPnL={pnlSummary.data?.realized_pnl ?? 0}
        thisMonthSales={pnlSummary.data?.sale_count ?? 0}
      />

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <RecentActivity
          title="매입 후보"
          href="/deals"
          emptyLabel="등록된 매입 후보가 없습니다"
          items={(candidateDeals.data ?? []).map((d) => ({
            id: d.id,
            label: d.source_platform ?? "기타",
            sublabel: d.source_url ?? d.notes ?? "",
            value: d.asking_price ? `₩${d.asking_price.toLocaleString()}` : "-",
            badge: "후보",
            badgeVariant: "secondary" as const,
          }))}
        />
        <RecentActivity
          title="활성 리스팅"
          href="/listings"
          emptyLabel="활성 리스팅이 없습니다"
          items={(activeListings.data ?? []).map((l) => ({
            id: l.id,
            label: l.title ?? l.platform,
            sublabel: l.platform.toUpperCase(),
            value:
              l.currency === "USD"
                ? `$${l.listed_price.toLocaleString()}`
                : `₩${l.listed_price.toLocaleString()}`,
            badge: "활성",
            badgeVariant: "default" as const,
          }))}
        />
        <RecentActivity
          title="최근 판매"
          href="/sales"
          emptyLabel="판매 내역이 없습니다"
          items={(recentSales.data ?? []).map((s) => ({
            id: s.id,
            label: `판매 완료`,
            sublabel: new Date(s.sold_at).toLocaleDateString("ko-KR"),
            value: s.net_payout !== null ? `₩${s.net_payout.toLocaleString()}` : "-",
            badge: "완료",
            badgeVariant: "outline" as const,
          }))}
        />
      </div>
    </main>
  );
}
