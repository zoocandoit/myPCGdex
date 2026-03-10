import { getListings } from "@/lib/actions/listings";
import { getCollection } from "@/lib/actions/collection";
import { ListingList } from "./listing-list";
import { AddListingButton } from "./add-listing-button";
import type { ListingStatus } from "@/lib/types/trade";

export const metadata = {
  title: "Listings | myPCGdex",
};

const STATUS_TABS: { key: ListingStatus; label: string }[] = [
  { key: "active", label: "활성" },
  { key: "draft", label: "초안" },
  { key: "sold", label: "판매완료" },
  { key: "ended", label: "종료" },
  { key: "canceled", label: "취소" },
];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status ?? "active") as ListingStatus;

  const [listingsResult, collectionResult] = await Promise.all([
    getListings({ status }),
    getCollection({ limit: 200 }),
  ]);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">판매 리스팅 관리</p>
        </div>
        <AddListingButton cards={collectionResult.data ?? []} />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/listings?status=${tab.key}`}
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

      <ListingList
        listings={listingsResult.data ?? []}
        status={status}
        cards={collectionResult.data ?? []}
      />
    </main>
  );
}
