"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

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
          로그아웃 중...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          로그아웃
        </>
      )}
    </Button>
  );
}
