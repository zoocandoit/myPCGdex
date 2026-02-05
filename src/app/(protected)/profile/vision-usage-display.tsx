"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2 } from "lucide-react";
import { getVisionUsage, type VisionUsageResult } from "@/lib/actions/vision-usage";

export function VisionUsageDisplay() {
  const t = useTranslations("profile.visionUsage");
  const [usage, setUsage] = useState<VisionUsageResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getVisionUsage();
      setUsage(result);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!usage) return null;

  const usedPercent = (usage.usedToday / 5) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{t("title")}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {t("remaining", { remaining: usage.remainingToday, total: 5 })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${usedPercent}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{t("resetsAt")}</p>
    </div>
  );
}
