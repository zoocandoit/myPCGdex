import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionList } from "./collection-list";
import { PendingList } from "./pending-list";
import { getPendingCount } from "@/lib/actions/pending";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const defaultTab = params.tab === "pending" ? "pending" : "collection";
  const t = await getTranslations("collection");

  // Get pending count for badge
  const pendingResult = await getPendingCount();
  const pendingCount = pendingResult.success ? pendingResult.count : 0;

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="collection">{t("analyzed")}</TabsTrigger>
          <TabsTrigger value="pending">
            {t("pending")}
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="mt-4">
          <CollectionList />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingList />
        </TabsContent>
      </Tabs>
    </main>
  );
}
