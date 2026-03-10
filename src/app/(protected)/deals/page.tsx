import { getAcquisitions } from "@/lib/actions/deals";
import { DealList } from "./deal-list";
import { AddDealButton } from "./add-deal-button";

export const metadata = {
  title: "Deal Inbox | myPCGdex",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status as "candidate" | "bought" | "canceled") ?? "candidate";

  const result = await getAcquisitions({ status });

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deal Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">매입 후보 및 매입 이력 관리</p>
        </div>
        <AddDealButton />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "candidate", label: "매입 후보" },
            { key: "bought", label: "매입 확정" },
            { key: "canceled", label: "취소" },
          ] as const
        ).map((tab) => (
          <a
            key={tab.key}
            href={`/deals?status=${tab.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <DealList
        deals={result.data ?? []}
        status={status}
      />
    </main>
  );
}
