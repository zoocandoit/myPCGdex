import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { LogoutButton } from "./logout-button";
import { LanguageSelector } from "./language-selector";
import { getCollectionStats } from "@/lib/actions/collection";
import { getAcquisitions } from "@/lib/actions/deals";
import { getListings } from "@/lib/actions/listings";
import { Package, TrendingUp, Inbox, ListChecks } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("profile");
  const locale = await getLocale();

  // 요약 통계 (병렬 fetch)
  const [collectionStats, boughtDeals, activeListings] = await Promise.all([
    getCollectionStats(),
    getAcquisitions({ status: "bought", limit: 1 }),
    getListings({ status: "active", limit: 1 }),
  ]);

  const formatDate = (dateString: string) => {
    const localeMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      ja: "ja-JP",
    };
    return new Date(dateString).toLocaleDateString(localeMap[locale] || "ko-KR");
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {/* 계정 정보 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("email")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("memberSince")}</p>
            <p className="font-medium">
              {user?.created_at ? formatDate(user.created_at) : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 요약 통계 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>내 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <Package className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">보유 카드</p>
                <p className="font-bold">{collectionStats.totalCards}장</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <TrendingUp className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">보유 가치</p>
                <p className="font-bold">₩{Math.round(collectionStats.totalValue).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <Inbox className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">매입 완료</p>
                <p className="font-bold">{boughtDeals.count ?? 0}건</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <ListChecks className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">활성 리스팅</p>
                <p className="font-bold">{activeListings.count ?? 0}건</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 설정 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{t("language")}</p>
            <LanguageSelector />
          </div>
        </CardContent>
      </Card>

      {/* 로그아웃 */}
      <Card>
        <CardContent className="pt-4">
          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
