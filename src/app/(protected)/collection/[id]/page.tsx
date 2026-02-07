import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getCardById } from "@/lib/actions/collection";
import { CardDetailView } from "./card-detail-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("cardDetail");

  const result = await getCardById(id);

  if (!result.success) {
    if (result.error === "unauthorized") {
      redirect("/login");
    }
    notFound();
  }

  if (!result.data) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <CardDetailView card={result.data} />
    </main>
  );
}
