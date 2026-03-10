import { getSales, getPnLSummary } from "@/lib/actions/sales";
import { getListings } from "@/lib/actions/listings";
import { PnLSummaryCards } from "./pnl-summary-cards";
import { SaleTable } from "./sale-table";

export const metadata = {
  title: "Sales & PnL | myPCGdex",
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  // Default: current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const from = params.from ?? defaultFrom;
  const to = params.to;

  const [salesResult, pnlResult, listingsResult] = await Promise.all([
    getSales({ from, to, limit: 100 }),
    getPnLSummary({ from, to }),
    getListings({ limit: 200 }),
  ]);

  // Build listing map for card name lookup
  const listingMap = new Map((listingsResult.data ?? []).map((l) => [l.id, l]));

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sales & PnL</h1>
        <p className="text-sm text-muted-foreground mt-0.5">판매 정산 및 손익 현황</p>
      </div>

      {/* PnL Summary */}
      <PnLSummaryCards
        summary={pnlResult.data ?? {
          total_gross_revenue: 0,
          total_fees: 0,
          total_net_payout: 0,
          total_cost_basis: 0,
          realized_pnl: 0,
          sale_count: 0,
        }}
        from={from}
        to={to}
      />

      {/* Sales table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">
          판매 내역
          {salesResult.count !== undefined && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({salesResult.count}건)
            </span>
          )}
        </h2>
        <SaleTable
          sales={salesResult.data ?? []}
          listingMap={listingMap}
        />
      </div>
    </main>
  );
}
