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
import { VisionUsageDisplay } from "./vision-usage-display";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("profile");
  const locale = await getLocale();

  const formatDate = (dateString: string) => {
    const localeMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      ja: "ja-JP",
    };
    return new Date(dateString).toLocaleDateString(
      localeMap[locale] || "ko-KR"
    );
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

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

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("language")}</p>
            </div>
            <LanguageSelector />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("visionUsage.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <VisionUsageDisplay />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
