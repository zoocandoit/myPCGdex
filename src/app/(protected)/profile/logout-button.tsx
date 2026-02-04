"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Button
      variant="destructive"
      className="w-full"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {tCommon("loading")}
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </>
      )}
    </Button>
  );
}
