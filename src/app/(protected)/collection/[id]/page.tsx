import { notFound, redirect } from "next/navigation";
import { getCardById } from "@/lib/actions/collection";
import { getListings } from "@/lib/actions/listings";
import { getAcquisitions } from "@/lib/actions/deals";
import { CardDetailView } from "./card-detail-view";
import { CostBasisPanel } from "./cost-basis-panel";
import { ListingHistoryPanel } from "./listing-history-panel";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getCardById(id);

  if (!result.success) {
    if (result.error === "unauthorized") redirect("/login");
    notFound();
  }
  if (!result.data) notFound();

  const card = result.data;

  // Fetch listings and acquisitions for this card in parallel
  const [listingsResult, acquisitionsResult] = await Promise.all([
    getListings({ limit: 50 }),
    getAcquisitions({ status: "bought" }),
  ]);

  // Filter listings for this card
  const cardListings = (listingsResult.data ?? []).filter(
    (l) => l.collection_id === card.id
  );

  // Sum acquisition fees for this card
  const acquisitionFees = (acquisitionsResult.data ?? [])
    .filter((a) => a.collection_id === card.id)
    .reduce((sum, a) => sum + (a.fees_cost ?? 0), 0);

  return (
    <main className="container mx-auto px-4 py-6">
      <CardDetailView card={card} />

      {/* Cost basis + PnL panel */}
      <div className="mt-6 space-y-4">
        <CostBasisPanel card={card} acquisitionFees={acquisitionFees} />
        <ListingHistoryPanel listings={cardListings} cardId={card.id} />
      </div>
    </main>
  );
}
